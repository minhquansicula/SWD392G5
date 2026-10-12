"""Deterministic Live event tests. No microphone, API key or paid Gemini calls."""

import asyncio
from contextlib import asynccontextmanager
from types import SimpleNamespace
from uuid import uuid4

import pytest
from google.genai import types

from app.config import Settings
from app.live_gemini import live_config, validate_pcm
from app.live_interview import VoiceRoom
from app.models import Interview, VoiceSession


class Socket:
    def __init__(self):
        self.out = []
        self.incoming = asyncio.Queue()

    async def send_json(self, value):
        self.out.append(value)

    async def send_bytes(self, value):
        self.out.append(value)

    async def receive(self):
        return await self.incoming.get()


class Store:
    def __init__(self):
        self.saved = []
        self.commits = 0

    @asynccontextmanager
    async def sessions(self):
        yield self

    async def merge(self, value):
        self.saved.append(value)

    async def commit(self):
        self.commits += 1


class Live:
    def __init__(self):
        self.responses = []
        self.prompts = []
        self.audio = []
        self.queue = asyncio.Queue()

    async def send_tool_response(self, **kw):
        self.responses.append(kw)

    async def send_client_content(self, **kw):
        self.prompts.append(kw)

    async def send_realtime_input(self, **kw):
        self.audio.append(kw)

    async def receive(self):
        event = await self.queue.get()
        yield event


@pytest.fixture
def room():
    refs = [{"chunk_id": str(uuid4()), "filename": "notes.md", "text": "Transaction qua proxy."}]

    async def retrieve(interview, query):
        assert interview.course_id == course_id
        return refs

    course_id = uuid4()
    service = SimpleNamespace(
        db=Store(), settings=Settings(_env_file=None), retrieval=SimpleNamespace(retrieve=retrieve)
    )
    r = VoiceRoom(service, Socket(), uuid4())
    r.interview = Interview(
        id=r.id,
        course_id=course_id,
        status="active",
        rubric_snapshot={
            "criteria": [
                {"id": "a", "name": "DI", "description": "Dependency injection", "weight": 50},
                {
                    "id": "b",
                    "name": "Transaction",
                    "description": "Atomic transaction",
                    "weight": 50,
                },
            ]
        },
        questions_asked=0,
        answers_count=0,
        criterion_index=0,
        followups_used=0,
        max_questions=4,
        max_followups=1,
    )
    r.voice = VoiceSession(interview_id=r.id, live_model="test", state={})
    return r


def event(**content):
    return types.LiveServerMessage(server_content=types.LiveServerContent(**content))


def tool(key, repeat=False):
    return types.LiveServerMessage(
        tool_call=types.LiveServerToolCall(
            function_calls=[
                types.FunctionCall(
                    id=key,
                    name="prepare_next_question",
                    args={"query": "Vì sao?", "repeat": repeat},
                )
            ]
        )
    )


def test_sdk_config_and_pcm_contract():
    cfg = live_config(Settings(_env_file=None), "{}")
    assert cfg.response_modalities == [types.Modality.AUDIO]
    assert cfg.tools[0].function_declarations[0].behavior == types.Behavior.BLOCKING
    assert cfg.input_audio_transcription is not None
    validate_pcm(b"\0" * 1280)
    for bad in [b"", b"x", b"\0" * 6402]:
        with pytest.raises(ValueError):
            validate_pcm(bad)


async def test_rag_plan_idempotent_and_reserves_criteria(room):
    first = await room.prepare("DI")
    assert room.interview.questions_asked == 1
    again = await room.prepare("DI")
    assert again["question_id"] == first["question_id"]
    assert again["repeat"] is True
    await room.transcript("user", "DI tách dependency.", True)
    second = await room.prepare("DI")
    assert second["follow_up"] is True
    assert second["sources"]
    await room.close_buffers()
    await room.transcript("user", "Có thể truyền mock qua constructor.", True)
    third = await room.prepare("Transaction")
    assert third["criterion"]["id"] == "b"
    assert third["question_number"] == 3


async def test_multiple_fields_audio_and_transcripts_are_all_processed(room):
    live = Live()
    await room.server_event(live, tool("first"))
    await room.server_event(
        live,
        event(
            output_transcription=types.Transcription(text="DI là gì?", finished=True),
            model_turn=types.Content(
                parts=[
                    types.Part(
                        inline_data=types.Blob(data=b"\0\0", mime_type="audio/pcm;rate=24000")
                    )
                ]
            ),
            turn_complete=True,
        ),
    )
    assert b"\0\0" in room.ws.out
    assert room.messages[0].text == "DI là gì?"
    assert room.messages[0].sources
    assert room.meta[str(room.messages[0].id)]["final"]
    await room.server_event(
        live, event(input_transcription=types.Transcription(text="Inject ", finished=False))
    )
    await room.server_event(
        live, event(input_transcription=types.Transcription(text="dependency.", finished=True))
    )
    assert room.messages[-1].text == "Inject dependency."
    await room.server_event(live, tool("second"))
    await room.server_event(live, tool("second"))
    assert room.interview.questions_asked == 2
    assert len(live.responses) == 3


async def test_ungrounded_audio_blocked_and_repair_requested(room):
    live = Live()
    await room.server_event(
        live,
        event(
            model_turn=types.Content(
                parts=[types.Part(inline_data=types.Blob(data=b"xx", mime_type="audio/pcm"))]
            ),
            turn_complete=True,
        ),
    )
    assert b"xx" not in room.ws.out
    assert len(live.prompts) == 1


async def test_interrupt_clears_audio_and_marks_partial(room):
    await room.prepare("DI")
    await room.transcript("assistant", "Hãy giải thích ")
    await room.server_event(Live(), event(interrupted=True))
    assert {"type": "clear_audio"} in room.ws.out
    assert room.meta[str(room.messages[0].id)]["interrupted"]
    assert not room.meta[str(room.messages[0].id)]["final"]
    assert room.service.db.commits


async def test_cancelled_tool_does_not_send_response(room):
    live = Live()
    room.cancelled_calls.add("cancelled")
    await room.server_event(live, tool("cancelled"))
    assert not live.responses


async def test_turn_receiver_listens_after_first_turn(room):
    live = Live()
    task = asyncio.create_task(room.gemini_reader(live))
    try:
        await live.queue.put(event(turn_complete=True))
        await live.queue.put(event(input_transcription=types.Transcription(text="Lượt sau")))
        first = await asyncio.wait_for(room.events.get(), 1)
        second = await asyncio.wait_for(room.events.get(), 1)
        assert first[1].server_content.turn_complete
        assert second[1].server_content.input_transcription.text == "Lượt sau"
    finally:
        task.cancel()
        await asyncio.gather(task, return_exceptions=True)


async def test_audio_forwarding_does_not_wait_for_rag_consumer(room):
    room.live = Live()
    room.accept_audio = True
    task = asyncio.create_task(room.browser_reader())
    try:
        await room.ws.incoming.put({"type": "websocket.receive", "bytes": b"\0" * 1280})
        await room.ws.incoming.put({"type": "websocket.receive", "text": '{"type":"finish"}'})
        kind, _ = await asyncio.wait_for(room.events.get(), 1)
        assert kind == "finish"
        assert room.live.audio[0]["audio"].data == b"\0" * 1280
        assert not room.accept_audio
    finally:
        task.cancel()
        await asyncio.gather(task, return_exceptions=True)


async def test_transcript_checkpoint_does_not_duplicate_messages(room):
    await room.transcript("user", "Một ")
    ident = room.messages[0].id
    await room.checkpoint(force=True)
    await room.transcript("user", "câu trả lời.", True)
    await room.close_buffers()
    assert len(room.messages) == 1
    assert room.messages[0].id == ident
    assert room.messages[0].text == "Một câu trả lời."


async def test_question_budget_and_finish_gate(room):
    live = Live()
    for i in range(4):
        await room.prepare(str(i))
        await room.transcript("user", str(i), True)
        await room.close_buffers()
    assert (await room.prepare("extra"))["finished"]
    assert room.interview.status == "awaiting_finish"
    assert room.interview.questions_asked == 4
    room.finish_requested = True
    await room.server_event(
        live,
        event(
            model_turn=types.Content(
                parts=[types.Part(inline_data=types.Blob(data=b"xx", mime_type="audio/pcm"))]
            )
        ),
    )
    assert b"xx" not in room.ws.out


async def test_run_finishes_after_tail_transcript_and_releases_lock(room):
    live = Live()
    locked = False

    @asynccontextmanager
    async def lock(_):
        nonlocal locked
        assert not locked
        locked = True
        try:
            yield
        finally:
            locked = False

    async def load():
        room.loaded = True

    async def detail(_):
        return {"id": str(room.id)}

    async def finish(_):
        assert not locked, "Grading must not deadlock on the room lock"
        assert room.messages[-1].text == "Đoạn cuối câu trả lời."
        assert room.interview.answers_count == 1
        return {"total_score": 8, "scale": 10}

    @asynccontextmanager
    async def connect(**kw):
        assert kw["config"].input_audio_transcription is not None
        yield live

    original_send = live.send_realtime_input

    async def send(**kw):
        await original_send(**kw)
        if kw.get("audio_stream_end"):
            await live.queue.put(
                event(
                    input_transcription=types.Transcription(
                        text="Đoạn cuối câu trả lời.", finished=True
                    ),
                    turn_complete=True,
                )
            )

    live.send_realtime_input = send
    room.load = load
    room.service.lock, room.service.detail, room.service.finish = lock, detail, finish
    room.service.gateway = SimpleNamespace(
        require_key=lambda: None,
        client=SimpleNamespace(aio=SimpleNamespace(live=SimpleNamespace(connect=connect))),
    )
    await room.ws.incoming.put({"type": "websocket.receive", "text": '{"type":"finish"}'})
    await asyncio.wait_for(room.run(), 6)
    assert room.ws.out[-1]["type"] == "report"
    assert live.audio[-1]["audio_stream_end"]


async def test_completed_room_is_not_modified_on_load_failure(room):
    from app.errors import AppError

    @asynccontextmanager
    async def lock(_):
        yield

    async def load():
        raise AppError("Already completed", 409)

    room.load = load
    room.service.lock = lock
    with pytest.raises(AppError):
        await room.run()
    assert room.service.db.commits == 0
