"""Duplex voice room; DB transcript is authoritative for grading.

Transport forwards microphone audio independently; server events are queued. One consumer owns interview state, avoiding races
between tool responses, transcript fragments and periodic checkpoints.
"""

import asyncio
import json
import logging
import time
from uuid import uuid4

from google.genai import types
from sqlalchemy import select
from starlette.websockets import WebSocketDisconnect

from app.errors import AppError
from app.interview import encode, next_plan
from app.live_gemini import live_config, validate_pcm
from app.models import Interview, Message, VoiceSession

logger = logging.getLogger(__name__)


class ReconnectLive(Exception):
    pass


class VoiceRoom:
    def __init__(self, interviews, websocket, interview_id):
        self.service, self.ws, self.id = interviews, websocket, interview_id
        self.events = asyncio.Queue(maxsize=256)
        self.send_lock = asyncio.Lock()
        self.loaded = False
        self.messages = []
        self.buffers = {}
        self.meta = {}
        self.plan = None
        self.plan_answer = 0
        self.needs_plan = True
        self.finished = False
        self.finish_requested = False
        self.finish_deadline = None
        self.closed = False
        self.resume_handle = None
        self.dirty = False
        self.last_checkpoint = 0.0
        self.last_event = time.monotonic()
        self.started_at = time.monotonic()
        self.last_input_end = 0
        self.input_open = False
        self.output_blocked = False
        self.repair_count = 0
        self.tool_results = {}
        self.cancelled_calls = set()
        self.live = None
        self.accept_audio = False
        self.incoming_audio_bytes = 0
        self.rate_started = time.monotonic()

    async def send(self, payload):
        async with self.send_lock:
            async with asyncio.timeout(10):
                if isinstance(payload, bytes):
                    await self.ws.send_bytes(payload)
                else:
                    await self.ws.send_json(payload)

    async def load(self):
        async with self.service.db.sessions() as db:
            self.interview = await db.get(Interview, self.id)
            self.voice = await db.get(VoiceSession, self.id)
            if not self.interview or not self.voice:
                raise AppError("Không tìm thấy phiên giọng nói.", 404)
            if self.interview.status == "completed":
                raise AppError("Phiên đã chấm điểm. Hãy xem kết quả hoặc tạo phiên mới.", 409)
            self.messages = list(
                (
                    await db.scalars(
                        select(Message)
                        .where(Message.interview_id == self.id)
                        .order_by(Message.sequence)
                    )
                ).all()
            )
        state = self.voice.state or {}
        self.meta = state.get("message_meta", {})
        self.plan = state.get("plan")
        self.plan_answer = state.get("plan_answer", 0)
        self.finished = self.interview.status == "awaiting_finish"
        self.needs_plan = True
        for m in self.messages:
            if not self.meta.get(str(m.id), {}).get("final", True):
                self.meta[str(m.id)] = {"final": False, "interrupted": True}
        self.interview.status = "awaiting_finish" if self.finished else "active"
        await self.checkpoint(force=True)
        self.loaded = True

    def context(self):
        return encode(
            {
                "rubric": self.interview.rubric_snapshot,
                "progress": {
                    "questions": self.interview.questions_asked,
                    "max_questions": self.interview.max_questions,
                },
                "current_plan": self.plan,
                "transcript": [
                    {
                        "role": m.role,
                        "text": m.text,
                        "incomplete": not self.meta.get(str(m.id), {}).get("final", True),
                    }
                    for m in self.messages
                ],
            }
        )

    async def checkpoint(self, force=False):
        if not force and (not self.dirty or time.monotonic() - self.last_checkpoint < 0.75):
            return
        self.voice.state = {
            "plan": self.plan,
            "plan_answer": self.plan_answer,
            "message_meta": self.meta,
            "transcript_note": "Bản chép lời tự động; phần bị ngắt có thể chưa đầy đủ.",
        }
        async with self.service.db.sessions() as db:
            await db.merge(self.interview)
            await db.merge(self.voice)
            # Only changed/buffered messages and new messages are merged at each checkpoint.
            for m in self.messages:
                if m in self.buffers.values() or m in getattr(self, "unsaved", []):
                    await db.merge(m)
            await db.commit()
        self.unsaved = []
        self.dirty = False
        self.last_checkpoint = time.monotonic()

    async def transcript(self, role, text, finished=False):
        if not text and not finished:
            return
        message = self.buffers.get(role)
        if message is None and text:
            if role == "user":
                self.needs_plan = True
                self.input_open = True
            message = Message(
                id=uuid4(),
                interview_id=self.id,
                sequence=max((m.sequence for m in self.messages), default=0) + 1,
                role=role,
                text="",
                sources=[],
                criterion_id=self.interview.rubric_snapshot["criteria"][
                    self.interview.criterion_index
                ]["id"],
            )
            self.messages.append(message)
            self.buffers[role] = message
        if message is None:
            return
        # Live transcription text contains incremental fragments, not complete snapshots.
        message.text += text or ""
        if len(message.text) > 24000:
            raise AppError("Một phát ngôn quá dài. Hãy kết thúc và chia thành buổi ngắn hơn.")
        if role == "assistant" and self.plan:
            message.sources = self.plan.get("sources", [])
        self.meta[str(message.id)] = {"final": bool(finished), "interrupted": False}
        self.dirty = True
        await self.send(
            {
                "type": "transcript",
                "id": str(message.id),
                "role": role,
                "text": message.text,
                "final": bool(finished),
            }
        )
        if finished and role == "user":
            self.last_input_end = message.sequence
            self.input_open = False
        # Keep the same buffer until the next logical turn, including late fragments.

    async def close_buffers(self, interrupted=False):
        for role, message in self.buffers.items():
            previous = self.meta.get(str(message.id), {})
            self.meta[str(message.id)] = {
                "final": bool(previous.get("final")) or not interrupted,
                "interrupted": interrupted and role == "assistant",
            }
            self.unsaved = getattr(self, "unsaved", []) + [message]
        self.buffers = {}
        self.input_open = False
        self.dirty = True
        await self.checkpoint(force=True)

    async def prepare(self, query, repeat=False):
        if self.finish_requested or self.finished:
            self.needs_plan = False
            return {"finished": True}
        user_messages = [m for m in self.messages if m.role == "user" and m.text.strip()]
        latest = max((m.sequence for m in user_messages), default=0)
        # Repeated calls/reconnects do not consume a question without new user evidence.
        if self.plan and (repeat or latest <= self.plan_answer):
            self.needs_plan = False
            return self.plan | {"repeat": True}
        plan = next_plan(self.interview)
        if plan is None:
            self.finished = True
            self.interview.status = "awaiting_finish"
            self.needs_plan = False
            await self.checkpoint(force=True)
            await self.send({"type": "questions_complete"})
            return {"finished": True}
        # Server-selected course/document snapshot is enforced by RetrievalService.
        query = str(query)[:1200]
        refs = await self.service.retrieval.retrieve(
            self.interview, plan["criterion"]["name"] + " " + query
        )
        self.interview.criterion_index = plan["criterion_index"]
        self.interview.followups_used = plan["followups_used"]
        self.interview.questions_asked = plan["question_number"]
        self.plan = {"question_id": str(uuid4()), **plan, "sources": refs}
        self.plan_answer = latest
        self.needs_plan = False
        self.dirty = True
        await self.checkpoint(force=True)
        await self.send(
            {
                "type": "plan",
                "number": plan["question_number"],
                "max": self.interview.max_questions,
                "criterion": plan["criterion"]["name"],
                "sources": refs,
            }
        )
        return self.plan

    async def browser_reader(self):
        try:
            while True:
                frame = await self.ws.receive()
                if frame["type"] == "websocket.disconnect":
                    await self.events.put(("disconnect", None))
                    return
                if frame.get("bytes") is not None:
                    data = frame["bytes"]
                    validate_pcm(data)
                    now = time.monotonic()
                    if now - self.rate_started > 5:
                        self.rate_started, self.incoming_audio_bytes = now, 0
                    self.incoming_audio_bytes += len(data)
                    if self.incoming_audio_bytes > 256000:
                        raise AppError("Audio gửi quá nhanh. Vui lòng mở lại phòng thi.")
                    if self.live and self.accept_audio and not self.finished:
                        await self.live.send_realtime_input(
                            audio=types.Blob(data=data, mime_type="audio/pcm;rate=16000")
                        )
                elif frame.get("text"):
                    if len(frame["text"]) > 4000:
                        raise ValueError("Thông điệp điều khiển quá dài.")
                    body = json.loads(frame["text"])
                    if not isinstance(body, dict):
                        raise ValueError("Thông điệp điều khiển phải là JSON object.")
                    if body.get("type") == "finish":
                        self.accept_audio = False
                        await self.events.put(("finish", None))
                    elif body.get("type") == "ping":
                        await self.events.put(("ping", None))
        except (WebSocketDisconnect, RuntimeError):
            await self.events.put(("disconnect", None))
        except Exception as exc:
            await self.events.put(("error", exc))

    async def gemini_reader(self, live):
        try:
            # SDK receive() ends at a turn boundary; keep listening for subsequent turns.
            while True:
                async for event in live.receive():
                    if event.tool_call_cancellation:
                        self.cancelled_calls.update(event.tool_call_cancellation.ids or [])
                    await self.events.put(("gemini", event))
        except Exception as exc:
            await self.events.put(("upstream_error", exc))

    async def server_event(self, live, event):
        self.last_event = time.monotonic()
        update = event.session_resumption_update
        if update:
            self.resume_handle = update.new_handle if update.resumable else None
        if event.go_away:
            raise ReconnectLive()
        if event.tool_call_cancellation:
            # Tools are read-only except idempotent plan reservation; canceled IDs are not replayed.
            for key in event.tool_call_cancellation.ids or []:
                self.tool_results.pop(key, None)
        content = event.server_content
        if content:
            if content.interrupted:
                await self.send({"type": "clear_audio"})
                await self.close_buffers(interrupted=True)
            if content.input_transcription:
                t = content.input_transcription
                await self.transcript("user", t.text, bool(t.finished))
            # A turn boundary may already have been received before a late transcript.
            # This demo retains such text, even if grouped into a separate transcript message.
        if event.tool_call:
            for call in event.tool_call.function_calls or []:
                if call.id in self.tool_results:
                    result = self.tool_results[call.id]
                elif call.name == "prepare_next_question":
                    args = call.args or {}
                    result = await self.prepare(args.get("query", ""), args.get("repeat") is True)
                    if call.id:
                        self.tool_results[call.id] = result
                else:
                    result = {"error": "Unknown tool"}
                if call.id in self.cancelled_calls:
                    continue
                await live.send_tool_response(
                    function_responses=[
                        types.FunctionResponse(
                            id=call.id, name=call.name, response={"result": result}
                        )
                    ]
                )
        if not content:
            return
        allowed = not self.needs_plan and not self.finish_requested
        if content.output_transcription and allowed:
            t = content.output_transcription
            await self.transcript("assistant", t.text, bool(t.finished))
        for part in (content.model_turn.parts or []) if content.model_turn else []:
            if part.inline_data and part.inline_data.data:
                if allowed:
                    await self.send(part.inline_data.data)
                elif not self.finish_requested:
                    self.output_blocked = True
        if content.turn_complete:
            await self.close_buffers()
            self.interview.answers_count = len(
                [m for m in self.messages if m.role == "user" and m.text.strip()]
            )
            await self.checkpoint(force=True)
            await self.send({"type": "turn_complete"})
            if self.output_blocked and not self.finish_requested:
                self.output_blocked = False
                self.repair_count += 1
                if self.repair_count > 2:
                    raise AppError(
                        "Model không gọi công cụ RAG. Kiểm tra Live model rồi kết nối lại."
                    )
                await live.send_client_content(
                    turns=types.Content(
                        role="user",
                        parts=[
                            types.Part(
                                text="Điều phối: gọi prepare_next_question trước khi nói lại câu hỏi."
                            )
                        ],
                    ),
                    turn_complete=True,
                )
            else:
                self.repair_count = 0

    async def pump(self, live):
        while not self.closed:
            try:
                kind, value = await asyncio.wait_for(self.events.get(), timeout=0.5)
            except TimeoutError:
                kind, value = "tick", None
            if kind == "audio" and not self.finish_requested and not self.finished:
                await live.send_realtime_input(
                    audio=types.Blob(data=value, mime_type="audio/pcm;rate=16000")
                )
            elif kind == "gemini":
                await self.server_event(live, value)
            elif kind == "finish":
                if not self.finish_requested:
                    self.finish_requested = True
                    self.finish_deadline = time.monotonic() + 4
                    await self.send({"type": "finishing"})
                    await live.send_realtime_input(audio_stream_end=True)
            elif kind == "disconnect":
                self.closed = True
                return
            elif kind == "error":
                raise value
            elif kind == "upstream_error":
                raise ReconnectLive() from value
            elif kind == "ping":
                await self.send({"type": "pong"})
            await self.checkpoint()
            if self.finish_requested and time.monotonic() >= self.finish_deadline:
                return
            if time.monotonic() - self.started_at > self.service.settings.live_max_minutes * 60:
                self.finish_requested = True
                await self.send({"type": "finishing", "reason": "Đã đạt giới hạn thời gian."})
                return

    async def run(self):
        reader = None
        try:
            async with self.service.lock(self.id):
                try:
                    await self.load()
                    self.service.gateway.require_key()
                    await self.send(
                        {"type": "snapshot", "session": await self.service.detail(self.id)}
                    )
                    reader = asyncio.create_task(self.browser_reader())
                    retries = 0
                    while not self.closed and not self.finish_requested:
                        tasks = []
                        try:
                            config = live_config(
                                self.service.settings, self.context(), self.resume_handle
                            )
                            async with self.service.gateway.client.aio.live.connect(
                                model=self.voice.live_model, config=config
                            ) as live:
                                self.live = live
                                self.accept_audio = True
                                tasks.append(asyncio.create_task(self.gemini_reader(live)))
                                await self.send({"type": "ready", "sample_rate": 24000})
                                if not self.resume_handle:
                                    await live.send_client_content(
                                        turns=types.Content(
                                            role="user",
                                            parts=[
                                                types.Part(
                                                    text="Bắt đầu hoặc tiếp tục buổi phỏng vấn. Gọi prepare_next_question trước khi nói."
                                                    " Nếu đang có câu hỏi chưa trả lời, nhắc lại ngắn gọn."
                                                )
                                            ],
                                        ),
                                        turn_complete=True,
                                    )
                                await self.pump(live)
                                break
                        except ReconnectLive:
                            retries += 1
                            if retries > 4:
                                raise AppError(
                                    "Kết nối Gemini bị ngắt nhiều lần. Transcript đã lưu; bấm Bắt đầu để thử lại."
                                ) from None
                            await self.checkpoint(force=True)
                            await self.send({"type": "clear_audio"})
                            await self.send({"type": "reconnecting", "attempt": retries})
                            # No replay of raw speech: duplicating unacknowledged audio corrupts turns.
                        finally:
                            self.accept_audio = False
                            self.live = None
                            for task in tasks:
                                task.cancel()
                            await asyncio.gather(*tasks, return_exceptions=True)
                        # Drop stale upstream events/audio before the next connection, but preserve finish.
                        while not self.events.empty():
                            kind, _ = self.events.get_nowait()
                            if kind == "finish":
                                self.finish_requested = True
                            elif kind == "disconnect":
                                self.closed = True
                        if not self.resume_handle:
                            self.needs_plan = True
                        await asyncio.sleep(min(retries, 3))
                    await self.close_buffers(interrupted=not self.finish_requested)
                    self.interview.answers_count = len(
                        [m for m in self.messages if m.role == "user" and m.text.strip()]
                    )
                    await self.checkpoint(force=True)
                finally:
                    if self.loaded:
                        await self.close_buffers(interrupted=not self.finish_requested)
                        self.interview.answers_count = len(
                            [m for m in self.messages if m.role == "user" and m.text.strip()]
                        )
                        await self.checkpoint(force=True)
            # Release room lock BEFORE invoking grade (which takes the same lock).
            if self.finish_requested and not self.closed:
                if self.interview.answers_count:
                    report = await self.service.finish(self.id)
                    await self.send({"type": "report", "data": report})
                else:
                    await self.send(
                        {
                            "type": "error",
                            "message": "Chưa có lời trả lời để chấm điểm. Có thể mở lại phiên này.",
                        }
                    )
        finally:
            if reader:
                reader.cancel()
                await asyncio.gather(reader, return_exceptions=True)
