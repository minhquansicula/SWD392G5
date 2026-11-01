from contextlib import asynccontextmanager
from types import SimpleNamespace
from unittest.mock import AsyncMock
from uuid import uuid4

import pytest

from app.live_interview import VoiceRoom


@pytest.fixture
def room():
    saved = []
    db = SimpleNamespace(add=saved.append, commit=AsyncMock())

    @asynccontextmanager
    async def sessions():
        yield db

    socket = SimpleNamespace(send_json=AsyncMock(), send_bytes=AsyncMock())
    service = SimpleNamespace(
        db=SimpleNamespace(sessions=sessions),
        settings=SimpleNamespace(gemini_embedding_model="test"),
        retrieval=SimpleNamespace(retrieve=AsyncMock(return_value=[])),
    )
    instance = VoiceRoom(service, socket, uuid4())
    instance.exam = SimpleNamespace(course_id=uuid4(), max_followups_per_main=1,
                                    max_followup_questions=2, main_answer_time_limit_seconds=120,
                                    followup_answer_time_limit_seconds=60)
    instance.assigned_questions = [SimpleNamespace(question_id=uuid4(), question_order=n,
                                                    content_snapshot=f"Question {n}") for n in (1, 2)]
    return instance, saved


async def test_main_question_precedes_followups_and_repeat_preserves_plan(room):
    voice, _ = room
    first = await voice.prepare("question one")
    assert first["type"] == "main" and first["content"] == "Question 1"
    followup = await voice.prepare("detail")
    assert followup["type"] == "followup" and followup["question_order"] == 1
    assert await voice.prepare("repeat", repeat=True) == followup
    assert voice.total_followups_used == 1
    second = await voice.prepare("next")
    assert second["type"] == "main" and second["content"] == "Question 2"


async def test_zero_followups_still_advances_and_finishes(room):
    voice, _ = room
    voice.exam.max_followups_per_main = 0
    assert (await voice.prepare("first"))["content"] == "Question 1"
    assert (await voice.prepare("next"))["content"] == "Question 2"
    assert (await voice.prepare("next"))["finished"] is True
    voice.service.retrieval.retrieve.assert_not_awaited()


async def test_failed_retrieval_does_not_consume_followup_budget(room):
    voice, _ = room
    await voice.prepare("")
    voice.service.retrieval.retrieve.side_effect = RuntimeError("unavailable")
    with pytest.raises(RuntimeError):
        await voice.prepare("detail")
    assert voice.followups_used == voice.total_followups_used == 0
    assert voice.current_q_index == 0


async def test_global_followup_limit_applies_across_questions(room):
    voice, _ = room
    voice.exam.max_followup_questions = 1
    assert (await voice.prepare(""))["type"] == "main"
    assert (await voice.prepare("detail"))["type"] == "followup"
    assert (await voice.prepare("next"))["question_order"] == 2
    assert (await voice.prepare("detail"))["finished"] is True


async def test_transcript_fragments_are_saved_once_under_current_question(room):
    voice, saved = room
    await voice.prepare("")
    await voice.transcript("user", "One ")
    await voice.transcript("user", "answer.", True)
    assert len(saved) == 1
    assert saved[0].text_content == "One answer."
    assert saved[0].question_id == voice.assigned_questions[0].question_id
