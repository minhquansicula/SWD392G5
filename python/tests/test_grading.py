from contextlib import asynccontextmanager
from types import SimpleNamespace
from unittest.mock import AsyncMock
from uuid import uuid4

import pytest

from app.errors import AppError
from app.interview import InterviewService, validate_report
from app.live_interview import VoiceRoom
from app.schemas import GradeDraft

RUBRIC = {
    "criteria": [
        {"id": "knowledge", "name": "Kiến thức", "weight": 60},
        {"id": "clarity", "name": "Diễn đạt", "weight": 40},
    ]
}


def test_report_keeps_per_question_scores_and_weighted_total():
    draft = GradeDraft.model_validate(
        {
            "criteria": [
                {"criterion_id": "knowledge", "score": 8, "rationale": "Đúng.", "evidence": [{"message_id": "t1", "quote": "Redis"}]},
                {"criterion_id": "clarity", "score": 12, "rationale": "Rõ.", "evidence": [{"transcript_id": "t1", "quote": "Redis"}]},
            ],
            "questions": [
                {"question_id": "q1", "score": 9, "feedback": "Tốt."},
                {"question_id": "q2", "answered": False, "score": 7},
                {"question_id": "unknown", "score": 10},
            ],
            "summary": "Tổng kết.",
        }
    )
    report = validate_report(draft, RUBRIC, ["q1", "q2"], [{"id": "t1", "role": "STUDENT", "text": "Redis"}])

    assert report["total_score"] == 8.8  # 8*0.6 + clamp(12)=10 * 0.4
    assert report["assessed_criteria"] == 2
    assert report["criteria"][0]["evidence"] == [{"transcript_id": "t1", "quote": "Redis"}]
    assert report["questions"] == [
        {"question_id": "q1", "answered": True, "score": 9.0, "feedback": "Tốt."},
        {"question_id": "q2", "answered": False, "score": 0.0, "feedback": None},
    ]


def test_report_never_invents_scores_for_missing_grades():
    report = validate_report(GradeDraft(), RUBRIC, ["q1"], [])

    assert report["total_score"] is None
    assert report["assessed_criteria"] == 0
    assert all(not c["assessed"] and c["evidence"] == [] for c in report["criteria"])
    assert report["questions"] == [{"question_id": "q1", "answered": None, "score": None, "feedback": None}]


def test_no_evidence_cannot_produce_a_rubric_total():
    draft = GradeDraft.model_validate({"criteria": [{"criterion_id": "knowledge", "score": 9}]})
    report = validate_report(draft, RUBRIC, [], [{"id": "t1", "role": "STUDENT", "text": "Redis"}])
    assert report["total_score"] is None
    assert report["criteria"][0]["assessed"] is False


@pytest.mark.parametrize("evidence", [
    {"message_id": "t1", "quote": "fabricated"},
    {"message_id": "ai", "quote": "AI question"},
    {"message_id": "missing", "quote": "Redis"},
    {"message_id": "t1", "transcript_id": "ai", "quote": "Redis"},
    {"message_id": "t1", "quote": ""},
])
def test_invalid_evidence_is_rejected(evidence):
    draft = GradeDraft.model_validate({"criteria": [{"criterion_id": "knowledge", "score": 8, "evidence": [evidence]}]})
    with pytest.raises(AppError) as error:
        validate_report(draft, RUBRIC, [], [{"id": "t1", "role": "STUDENT", "text": "Redis"}, {"id": "ai", "role": "AI", "text": "AI question"}])
    assert error.value.code == "invalid_evidence"


async def test_incomplete_regrade_keeps_previous_score_and_does_not_replace_results():
    schedule = SimpleNamespace(status="COMPLETED", exam_id=uuid4(), final_score=8, actual_end_time=None)
    exam = SimpleNamespace(course_id=uuid4(), title="Exam")
    transcript = SimpleNamespace(id=uuid4(), role="STUDENT", question_id=None, text_content="Redis")
    db = SimpleNamespace(
        get=AsyncMock(side_effect=[schedule, exam]),
        refresh=AsyncMock(),
        scalar=AsyncMock(return_value=SimpleNamespace(data=RUBRIC)),
        scalars=AsyncMock(side_effect=[SimpleNamespace(all=lambda: [transcript]), SimpleNamespace(all=lambda: [])]),
        commit=AsyncMock(),
    )

    @asynccontextmanager
    async def session():
        yield db

    @asynccontextmanager
    async def lock(_):
        yield

    gateway = SimpleNamespace(structured=AsyncMock(return_value=GradeDraft()))
    service = InterviewService(SimpleNamespace(sessions=session), gateway, None, SimpleNamespace(gemini_model="test"))
    service.lock = lock
    response = await service.finish(uuid4())
    assert response["grading_failed"] is True
    assert schedule.final_score == 8
    assert db.scalars.await_count == 2
    db.commit.assert_awaited_once()


async def test_invalid_ai_evidence_retries_then_preserves_previous_result():
    schedule = SimpleNamespace(status="COMPLETED", exam_id=uuid4(), final_score=8, actual_end_time=None)
    exam = SimpleNamespace(course_id=uuid4(), title="Exam")
    transcript = SimpleNamespace(id=uuid4(), role="STUDENT", question_id=None, text_content="Redis")
    db = SimpleNamespace(
        get=AsyncMock(side_effect=[schedule, exam]),
        scalar=AsyncMock(return_value=SimpleNamespace(data=RUBRIC)),
        scalars=AsyncMock(side_effect=[SimpleNamespace(all=lambda: [transcript]), SimpleNamespace(all=lambda: [])]),
        commit=AsyncMock(),
    )

    @asynccontextmanager
    async def session():
        yield db

    @asynccontextmanager
    async def lock(_):
        yield

    draft = GradeDraft.model_validate({"criteria": [{"criterion_id": "knowledge", "score": 9,
        "evidence": [{"transcript_id": str(transcript.id), "quote": "invented"}]}]})
    gateway = SimpleNamespace(structured=AsyncMock(return_value=draft))
    service = InterviewService(SimpleNamespace(sessions=session), gateway, None, SimpleNamespace(gemini_model="test"))
    service.lock = lock
    response = await service.finish(uuid4())
    assert gateway.structured.await_count == 2
    assert response["grading_failed"] is True
    assert schedule.final_score == 8
    assert db.scalars.await_count == 2


async def test_ai_regrade_marks_previous_lecturer_total_pending():
    schedule = SimpleNamespace(status="COMPLETED", exam_id=uuid4(), final_score=7,
        actual_end_time=None, lecturer_total_score=9, lecturer_total_pending=False, ai_report=None)
    exam = SimpleNamespace(course_id=uuid4(), title="Exam")
    question_id = uuid4()
    transcript = SimpleNamespace(id=uuid4(), role="STUDENT", question_id=question_id, text_content="Redis")
    question = SimpleNamespace(question_id=question_id, question_order=1, content_snapshot="Question")
    result = SimpleNamespace(question_id=question_id, lecturer_score=6, lecturer_feedback="Review",
                             ai_score=7, ai_feedback="Old", graded_at=None)
    db = SimpleNamespace(get=AsyncMock(side_effect=[schedule, exam]), refresh=AsyncMock(),
        scalar=AsyncMock(return_value=SimpleNamespace(data=RUBRIC)),
        scalars=AsyncMock(side_effect=[SimpleNamespace(all=lambda: [transcript]),
                                      SimpleNamespace(all=lambda: [question]),
                                      SimpleNamespace(all=lambda: [result])]), commit=AsyncMock())

    @asynccontextmanager
    async def session():
        yield db

    @asynccontextmanager
    async def lock(_):
        yield

    evidence = [{"transcript_id": str(transcript.id), "quote": "Redis"}]
    draft = GradeDraft.model_validate({"criteria": [
        {"criterion_id": "knowledge", "score": 8, "evidence": evidence},
        {"criterion_id": "clarity", "score": 8, "evidence": evidence},
    ], "questions": [{"question_id": str(question_id), "score": 8, "feedback": "New"}]})
    service = InterviewService(SimpleNamespace(sessions=session), SimpleNamespace(structured=AsyncMock(return_value=draft)),
                               None, SimpleNamespace(gemini_model="test"))
    service.lock = lock
    await service.finish(uuid4())
    db.refresh.assert_awaited_once_with(schedule, with_for_update=True)
    assert schedule.lecturer_total_pending is True
    assert schedule.lecturer_total_score == 9
    assert result.lecturer_score == 6


async def test_finish_rechecks_status_after_acquiring_lock():
    db = SimpleNamespace(get=AsyncMock(return_value=SimpleNamespace(status="PENDING")))

    @asynccontextmanager
    async def session():
        yield db

    @asynccontextmanager
    async def lock(_):
        yield

    service = InterviewService(SimpleNamespace(sessions=session), None, None, None)
    service.lock = lock
    with pytest.raises(AppError) as error:
        await service.finish(uuid4())
    assert error.value.status == 409
    assert error.value.code == "schedule_not_started"
    db.get.assert_awaited_once()


async def test_voice_room_cannot_start_a_pending_schedule_on_its_own():
    schedule = SimpleNamespace(status="PENDING")
    db = SimpleNamespace(get=AsyncMock(return_value=schedule), commit=AsyncMock())

    @asynccontextmanager
    async def session():
        yield db

    room = VoiceRoom(SimpleNamespace(db=SimpleNamespace(sessions=session)), None, uuid4())
    with pytest.raises(AppError) as error:
        await room.load()
    assert error.value.status == 409
    assert schedule.status == "PENDING"
    db.commit.assert_not_awaited()
