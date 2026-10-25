import json
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


def validate_report(draft: GradeDraft, rubric: dict, user_texts: dict[str, str]) -> dict:
    criteria = {c["id"]: c for c in rubric["criteria"]}
    if {c.criterion_id for c in draft.criteria} != set(criteria):
        raise AppError("Báo cáo chưa bao phủ đúng rubric. Hãy chấm lại.", 502, "invalid_evidence")

    grades = {g.criterion_id: g for g in draft.criteria}
    results, total = [], 0.0

    for key, criterion in criteria.items():
        grade = grades[key]
        for evidence in grade.evidence:
            ref_id = str(evidence.transcript_id or evidence.message_id or "")
            actual = user_texts.get(ref_id, "")
            # Nếu không tìm thấy bằng id chính xác, tìm kiểm tra trong toàn bộ câu trả lời của thí sinh
            if not actual or " ".join(evidence.quote.split()) not in " ".join(actual.split()):
                matched = any(
                    " ".join(evidence.quote.split()) in " ".join(txt.split())
                    for txt in user_texts.values()
                )
                if not matched:
                    raise AppError(
                        "Bằng chứng chấm điểm không khớp câu trả lời của thí sinh. Hãy chấm lại.",
                        502,
                        "invalid_evidence",
                    )
        if grade.score > 0 and not grade.evidence:
            raise AppError(
                "Điểm tiêu chí chưa có bằng chứng từ câu trả lời của thí sinh.", 502, "invalid_evidence"
            )
        weighted = grade.score * criterion["weight"] / 100
        total += weighted
        results.append(
            grade.model_dump(mode="json")
            | {
                "name": criterion["name"],
                "weight": criterion["weight"],
                "weighted_score": round(weighted, 3),
                "assessed": bool(grade.evidence),
            }
        )
    return {
        "criteria": results,
        "total_score": round(total, 2),
        "scale": 10,
        "summary": draft.summary,
        "assessed_criteria": sum(g["assessed"] for g in results),
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
                "results": [
                    {
                        "question_id": str(r.question_id),
                        "ai_score": float(r.ai_score) if r.ai_score is not None else None,
                        "ai_feedback": r.ai_feedback,
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

                student_transcripts = [t for t in transcripts if t.role == "STUDENT"]
                if not student_transcripts:
                    raise AppError("Chưa có lượt trả lời nào từ thí sinh để chấm điểm.", 400)

                user_texts = {str(t.id): t.text_content for t in student_transcripts}

                # Chuẩn bị dữ liệu gửi cho LLM chấm
                eval_payload = encode(
                    {
                        "rubric_snapshot": rubric_data,
                        "exam_title": exam.title,
                        "transcript": [
                            {"id": str(t.id), "role": t.role, "text": t.text_content}
                            for t in transcripts
                        ],
                    }
                )

                report = None
                for attempt in range(2):
                    try:
                        draft = await self.gateway.structured(
                            GradeDraft, GRADE_SYSTEM, eval_payload, model=self.settings.gemini_model
                        )
                        report = validate_report(draft, rubric_data, user_texts)
                        break
                    except AppError as exc:
                        if attempt or exc.code not in ("invalid_evidence", "invalid_model_json"):
                            raise
                        eval_payload += "\nLưu ý: Bắt buộc trích dẫn bằng chứng NGUYÊN VĂN từ transcript của thí sinh."

                if not report:
                    raise AppError("Không thể hoàn thành chấm điểm sau các lượt thử.", 502)

                # Ghi điểm vào các câu hỏi chính (assigned_questions)
                assigned = list(
                    (
                        await db.scalars(
                            select(AssignedQuestion).where(
                                AssignedQuestion.exam_schedule_id == schedule_id
                            )
                        )
                    ).all()
                )

                # Lưu vào bảng question_results
                score_per_question = round(report["total_score"], 2)
                for q in assigned:
                    existing_result = await db.scalar(
                        select(QuestionResult).where(
                            QuestionResult.exam_schedule_id == schedule_id,
                            QuestionResult.question_id == q.question_id,
                        )
                    )
                    if existing_result:
                        existing_result.ai_score = score_per_question
                        existing_result.ai_feedback = report["summary"]
                        existing_result.graded_at = datetime.now(UTC)
                    else:
                        db.add(
                            QuestionResult(
                                exam_schedule_id=schedule_id,
                                question_id=q.question_id,
                                ai_score=score_per_question,
                                ai_feedback=report["summary"],
                                max_score=10.0,
                                graded_at=datetime.now(UTC),
                            )
                        )

                # Cập nhật bảng exam_schedules
                schedule.final_score = report["total_score"]
                schedule.status = "COMPLETED"
                schedule.actual_end_time = datetime.now(UTC)
                await db.commit()

                return report | {
                    "schedule_id": str(schedule_id),
                    "exam_title": exam.title,
                    "final_score": report["total_score"],
                    "status": "COMPLETED",
                }
