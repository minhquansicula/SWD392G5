import json
import logging
from contextlib import asynccontextmanager
from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy import select, text

from app.errors import AppError
from app.models import (
    AssignedQuestion,
    Course,
    Exam,
    ExamSchedule,
    QuestionResult,
    Rubric,
    Transcript,
    VoiceSessionState,
)
from app.prompts import GRADE_SYSTEM
from app.schemas import GradeDraft

logger = logging.getLogger(__name__)


def encode(value) -> str:
    return json.dumps(value, ensure_ascii=False, default=str)


def transcript_dict(transcript: Transcript) -> dict:
    return {
        "id": str(transcript.id),
        "exam_schedule_id": str(transcript.exam_schedule_id),
        "question_id": str(transcript.question_id) if transcript.question_id else None,
        "role": transcript.role,
        "text": transcript.text_content,
        "created_at": transcript.created_at.isoformat() if transcript.created_at else None,
        "transcript_type": transcript.transcript_type,
    }


def clamp_score(value: float) -> float:
    return max(0.0, min(10.0, float(value)))


def validate_report(draft: GradeDraft, rubric: dict, question_ids: list[str]) -> dict:
    """Chuẩn hóa kết quả AI; tiêu chí hoặc câu hỏi AI không chấm được giữ là chưa đánh giá, không tự gán điểm."""
    criteria = {c["id"]: c for c in rubric.get("criteria", [])}
    grades = {g.criterion_id: g for g in (draft.criteria or [])}
    results, total = [], 0.0

    for key, criterion in criteria.items():
        grade = grades.get(key)
        if not grade:
            score = 0.0
            rationale = "Chưa đủ dữ liệu để đánh giá tiêu chí này."
            improvement = ""
            evidence = []
        else:
            score = clamp_score(grade.score)
            rationale = grade.rationale
            improvement = grade.improvement
            evidence = [{"quote": ev.quote} for ev in grade.evidence if ev.quote]

        weighted = score * criterion["weight"] / 100
        total += weighted
        results.append(
            {
                "criterion_id": key,
                "name": criterion["name"],
                "score": round(score, 1),
                "weight": criterion["weight"],
                "weighted_score": round(weighted, 2),
                "rationale": rationale,
                "improvement": improvement,
                "evidence": evidence,
                "assessed": grade is not None,
            }
        )

    question_grades = {q.question_id: q for q in (draft.questions or [])}
    questions = []
    for question_id in question_ids:
        grade = question_grades.get(question_id)
        questions.append(
            {
                "question_id": question_id,
                "answered": grade.answered if grade else None,
                "score": None if not grade else round(clamp_score(grade.score), 1) if grade.answered else 0.0,
                "feedback": (grade.feedback or None) if grade else None,
            }
        )
    return {
        "criteria": results,
        "questions": questions,
        "total_score": round(total, 2),
        "scale": 10,
        "summary": draft.summary or "Buổi phỏng vấn đã được tổng hợp và chấm điểm.",
        "assessed_criteria": sum(1 for r in results if r["assessed"]),
    }


class InterviewService:
    def __init__(self, database, gateway, retrieval, settings):
        self.db = database
        self.gateway = gateway
        self.retrieval = retrieval
        self.settings = settings

    @asynccontextmanager
    async def lock(self, schedule_id: UUID):
        key = schedule_id.int % (2**63)
        async with self.db.engine.begin() as connection:
            acquired = await connection.scalar(
                text("SELECT pg_try_advisory_xact_lock(:key)"), {"key": key}
            )
            if not acquired:
                raise AppError("Phiên này đang xử lý. Vui lòng chờ rồi thử lại.", 409, "busy")
            yield

    async def get_schedule(self, schedule_id: UUID) -> ExamSchedule:
        async with self.db.sessions() as db:
            schedule = await db.get(ExamSchedule, schedule_id)
            if not schedule:
                raise AppError(f"Không tìm thấy ca thi với ID: {schedule_id}", 404)
            return schedule

    async def detail(self, schedule_id: UUID) -> dict:
        async with self.db.sessions() as db:
            schedule = await db.get(ExamSchedule, schedule_id)
            if not schedule:
                raise AppError("Không tìm thấy ca thi.", 404)

            exam = await db.get(Exam, schedule.exam_id)
            assigned = (
                await db.scalars(
                    select(AssignedQuestion)
                    .where(AssignedQuestion.exam_schedule_id == schedule_id)
                    .order_by(AssignedQuestion.question_order)
                )
            ).all()

            transcripts = (
                await db.scalars(
                    select(Transcript)
                    .where(Transcript.exam_schedule_id == schedule_id)
                    .order_by(Transcript.created_at)
                )
            ).all()

            voice_session = await db.get(VoiceSessionState, schedule_id)
            results = (
                await db.scalars(
                    select(QuestionResult).where(QuestionResult.exam_schedule_id == schedule_id)
                )
            ).all()

            return {
                "schedule_id": str(schedule.id),
                "exam_id": str(schedule.exam_id) if schedule.exam_id else None,
                "exam_title": exam.title if exam else None,
                "status": schedule.status,
                "final_score": float(schedule.final_score) if schedule.final_score is not None else None,
                "actual_start_time": schedule.actual_start_time.isoformat() if schedule.actual_start_time else None,
                "actual_end_time": schedule.actual_end_time.isoformat() if schedule.actual_end_time else None,
                "assigned_questions": [
                    {
                        "id": str(q.id),
                        "question_id": str(q.question_id),
                        "order": q.question_order,
                        "content": q.content_snapshot,
                    }
                    for q in assigned
                ],
                "transcripts": [transcript_dict(t) for t in transcripts],
                "voice_state": voice_session.state if voice_session else None,
                "ai_report": schedule.ai_report,
                "results": [
                    {
                        "question_id": str(r.question_id),
                        "ai_score": float(r.ai_score) if r.ai_score is not None else None,
                        "ai_feedback": r.ai_feedback,
                        "max_score": float(r.max_score) if r.max_score is not None else 10.0,
                        "lecturer_score": float(r.lecturer_score) if r.lecturer_score is not None else None,
                        "lecturer_feedback": r.lecturer_feedback,
                    }
                    for r in results
                ],
            }

    async def finish(self, schedule_id: UUID) -> dict:
        """Đánh giá và chấm điểm toàn bộ ca thi dựa trên transcript và Rubric."""
        async with self.lock(schedule_id):
            async with self.db.sessions() as db:
                schedule = await db.get(ExamSchedule, schedule_id)
                if not schedule:
                    raise AppError("Không tìm thấy ca thi.", 404)

                exam = await db.get(Exam, schedule.exam_id)
                if not exam:
                    raise AppError("Không tìm thấy thông tin kỳ thi tương ứng.", 404)

                # Lấy rubric của môn học
                rubric = await db.scalar(
                    select(Rubric)
                    .where(Rubric.course_id == exam.course_id)
                    .order_by(Rubric.created_at.desc())
                )
                if not rubric:
                    # Tạo rubric tiêu chuẩn nếu môn chưa gắn rubric riêng
                    rubric_data = {
                        "title": f"Rubric {exam.title}",
                        "criteria": [
                            {
                                "id": "crit_knowledge",
                                "name": "Kiến thức chuyên môn & Tính chính xác",
                                "description": "Nắm vững lý thuyết, giải thích đúng cơ chế cốt lõi và khái niệm chính.",
                                "weight": 40,
                            },
                            {
                                "id": "crit_reasoning",
                                "name": "Tư duy phản biện & Ứng biến",
                                "description": "Khả năng phân tích đánh đổi (trade-offs), giải quyết tình huống và câu hỏi phụ.",
                                "weight": 30,
                            },
                            {
                                "id": "crit_clarity",
                                "name": "Kỹ năng diễn đạt & Trình bày",
                                "description": "Giao tiếp rõ ràng, súc tích, mạch lạc và tự tin khi trả lời vấn đáp.",
                                "weight": 30,
                            },
                        ],
                    }
                else:
                    rubric_data = rubric.data

                # Lấy tất cả lượt nói của ca thi
                transcripts = list(
                    (
                        await db.scalars(
                            select(Transcript)
                            .where(Transcript.exam_schedule_id == schedule_id)
                            .order_by(Transcript.created_at)
                        )
                    ).all()
                )

                assigned = list(
                    (
                        await db.scalars(
                            select(AssignedQuestion)
                            .where(AssignedQuestion.exam_schedule_id == schedule_id)
                            .order_by(AssignedQuestion.question_order)
                        )
                    ).all()
                )
                question_ids = [str(q.question_id) for q in assigned]

                report = None
                if not any(t.role == "STUDENT" for t in transcripts):
                    report = validate_report(
                        GradeDraft(
                            questions=[{"question_id": qid, "answered": False} for qid in question_ids],
                            summary="Thí sinh kết thúc ca thi khi chưa trả lời câu hỏi nào.",
                        ),
                        rubric_data,
                        question_ids,
                    )
                else:
                    # Chuẩn bị dữ liệu gửi cho LLM chấm
                    eval_payload = encode(
                        {
                            "rubric_snapshot": rubric_data,
                            "exam_title": exam.title,
                            "assigned_questions": [
                                {"question_id": str(q.question_id), "order": q.question_order, "content": q.content_snapshot}
                                for q in assigned
                            ],
                            "transcript": [
                                {
                                    "id": str(t.id),
                                    "role": t.role,
                                    "question_id": str(t.question_id) if t.question_id else None,
                                    "text": t.text_content,
                                }
                                for t in transcripts
                            ],
                        }
                    )
                    for attempt in range(2):
                        try:
                            draft = await self.gateway.structured(
                                GradeDraft, GRADE_SYSTEM, eval_payload, model=self.settings.gemini_model
                            )
                            report = validate_report(draft, rubric_data, question_ids)
                            break
                        except Exception:
                            logger.warning("AI grading attempt %s failed for schedule %s", attempt + 1, schedule_id, exc_info=True)

                schedule.status = "COMPLETED"
                schedule.actual_end_time = datetime.now(UTC)
                if report is None:
                    # Không bịa điểm khi AI lỗi; giữ kết quả cũ (nếu có) để có thể gọi chấm lại.
                    await db.commit()
                    return {
                        "schedule_id": str(schedule_id),
                        "exam_title": exam.title,
                        "final_score": float(schedule.final_score) if schedule.final_score is not None else None,
                        "status": "COMPLETED",
                        "total_score": None,
                        "scale": 10,
                        "summary": "Giám khảo AI chưa chấm được bài thi. Vui lòng thử chấm lại sau.",
                        "criteria": [],
                        "questions": [],
                        "assessed_criteria": 0,
                        "grading_failed": True,
                    }

                graded_at = datetime.now(UTC)
                existing = {
                    r.question_id: r
                    for r in (
                        await db.scalars(select(QuestionResult).where(QuestionResult.exam_schedule_id == schedule_id))
                    ).all()
                }
                for q, grade in zip(assigned, report["questions"]):
                    result = existing.get(q.question_id)
                    if not result:
                        result = QuestionResult(exam_schedule_id=schedule_id, question_id=q.question_id, max_score=10.0)
                        db.add(result)
                    result.ai_score = grade["score"]
                    result.ai_feedback = grade["feedback"]
                    result.graded_at = graded_at

                schedule.final_score = report["total_score"]
                schedule.ai_report = {k: v for k, v in report.items() if k != "questions"}
                await db.commit()

                return report | {
                    "schedule_id": str(schedule_id),
                    "exam_title": exam.title,
                    "final_score": report["total_score"],
                    "status": "COMPLETED",
                }
