import json
from contextlib import asynccontextmanager
from uuid import UUID

from sqlalchemy import select, text

from app.errors import AppError
from app.models import Course, Document, Interview, Message, Operation, Rubric
from app.prompts import GRADE_SYSTEM, INTERVIEW_SYSTEM
from app.schemas import GradeDraft, SessionCreate, TurnRequest


def encode(value) -> str:
    return json.dumps(value, ensure_ascii=False, default=str)


def message_dict(message: Message) -> dict:
    return {
        "id": str(message.id),
        "sequence": message.sequence,
        "role": message.role,
        "text": message.text,
        "criterion_id": message.criterion_id,
        "sources": message.sources,
        "created_at": message.created_at.isoformat(),
    }


def interview_dict(interview: Interview) -> dict:
    return {
        "id": str(interview.id),
        "course_id": str(interview.course_id),
        "student_name": interview.student_name,
        "status": interview.status,
        "rubric": interview.rubric_snapshot,
        "model": interview.model,
        "max_questions": interview.max_questions,
        "max_followups": interview.max_followups,
        "questions_asked": interview.questions_asked,
        "answers_count": interview.answers_count,
        "criterion_index": interview.criterion_index,
        "followups_used": interview.followups_used,
        "report": interview.report,
        "created_at": interview.created_at.isoformat(),
    }


def next_plan(interview) -> dict | None:
    """Reserve one primary question for every unvisited criterion; cap follow-ups."""
    criteria = interview.rubric_snapshot["criteria"]
    if interview.questions_asked >= interview.max_questions:
        return None
    index, followups = interview.criterion_index, interview.followups_used
    follow_up = False
    if interview.questions_asked:
        unvisited = len(criteria) - index - 1
        slots = interview.max_questions - interview.questions_asked
        if followups < interview.max_followups and slots > unvisited:
            follow_up, followups = True, followups + 1
        elif unvisited:
            index, followups = index + 1, 0
        else:
            return None
    return {
        "criterion_index": index,
        "criterion": criteria[index],
        "follow_up": follow_up,
        "followups_used": followups,
        "question_number": interview.questions_asked + 1,
    }


def validate_report(draft: GradeDraft, rubric: dict, messages: list[dict]) -> dict:
    criteria = {c["id"]: c for c in rubric["criteria"]}
    if {c.criterion_id for c in draft.criteria} != set(criteria):
        raise AppError("Báo cáo chưa bao phủ đúng rubric. Hãy chấm lại.", 502, "invalid_evidence")
    user_messages = {m["id"]: m["text"] for m in messages if m["role"] == "user"}
    grades = {g.criterion_id: g for g in draft.criteria}
    results, total = [], 0.0
    for key, criterion in criteria.items():
        grade = grades[key]
        for evidence in grade.evidence:
            actual = user_messages.get(str(evidence.message_id), "")
            if " ".join(evidence.quote.split()) not in " ".join(actual.split()):
                raise AppError(
                    "Bằng chứng chấm điểm không khớp câu trả lời. Hãy chấm lại.",
                    502,
                    "invalid_evidence",
                )
        if grade.score > 0 and not grade.evidence:
            raise AppError(
                "Điểm chưa có bằng chứng từ câu trả lời. Hãy chấm lại.", 502, "invalid_evidence"
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
        self.db, self.gateway, self.retrieval, self.settings = (
            database,
            gateway,
            retrieval,
            settings,
        )

    @asynccontextmanager
    async def lock(self, interview_id: UUID):
        # Transaction-scoped lock is released on cancellation, disconnect or process failure.
        # Works across workers too; no permanent "busy" flag can be left in the session.
        key = interview_id.int % (2**63)
        async with self.db.engine.begin() as connection:
            acquired = await connection.scalar(
                text("SELECT pg_try_advisory_xact_lock(:key)"), {"key": key}
            )
            if not acquired:
                raise AppError("Phiên này đang xử lý một lượt khác. Chờ rồi thử lại.", 409, "busy")
            yield

    async def create(self, body: SessionCreate) -> dict:
        async with self.db.sessions() as db:
            rubric = await db.get(Rubric, body.rubric_id)
            if not rubric or rubric.course_id != body.course_id:
                raise AppError("Rubric phải thuộc đúng môn học.", 400)
            if body.max_questions < len(rubric.data["criteria"]):
                raise AppError("Số câu tối đa phải ít nhất bằng số tiêu chí trong rubric.")
            documents = (
                await db.scalars(
                    select(Document).where(
                        Document.course_id == body.course_id,
                        Document.embedding_model == self.settings.gemini_embedding_model,
                    )
                )
            ).all()
            if not documents:
                raise AppError("Hãy import ít nhất một tài liệu môn học trước khi bắt đầu.")
            interview = Interview(
                **body.model_dump(),
                rubric_snapshot=rubric.data,
                document_ids=[str(d.id) for d in documents],
                model=self.settings.gemini_model,
                embedding_model=self.settings.gemini_embedding_model,
            )
            db.add(interview)
            await db.commit()
            return interview_dict(interview)

    async def detail(self, interview_id: UUID) -> dict:
        async with self.db.sessions() as db:
            interview = await db.get(Interview, interview_id)
            if not interview:
                raise AppError("Không tìm thấy phiên phỏng vấn.", 404)
            messages = (
                await db.scalars(
                    select(Message)
                    .where(Message.interview_id == interview_id)
                    .order_by(Message.sequence)
                )
            ).all()
            pending = await db.scalar(
                select(Operation).where(
                    Operation.interview_id == interview_id, Operation.status == "pending"
                )
            )
            return interview_dict(interview) | {
                "messages": [message_dict(m) for m in messages],
                "pending": {
                    "request_id": str(pending.request_id),
                    "action": pending.action,
                    "text": pending.text,
                }
                if pending
                else None,
            }

    async def turn(self, interview_id: UUID, request: TurnRequest):
        async with self.lock(interview_id):
            async with self.db.sessions() as db:
                interview = await db.get(Interview, interview_id)
                if not interview:
                    raise AppError("Không tìm thấy phiên phỏng vấn.", 404)
                operation = await db.scalar(
                    select(Operation).where(
                        Operation.interview_id == interview_id,
                        Operation.request_id == request.request_id,
                    )
                )
                if operation:
                    if operation.text != request.text or operation.action != request.action:
                        raise AppError(
                            "request_id đã được dùng cho nội dung khác.",
                            409,
                            "idempotency_conflict",
                        )
                    if operation.status == "completed":
                        yield {
                            "type": "done",
                            "request_id": str(request.request_id),
                            "replayed": True,
                            **operation.result,
                        }
                        return
                else:
                    pending = await db.scalar(
                        select(Operation).where(
                            Operation.interview_id == interview_id, Operation.status == "pending"
                        )
                    )
                    if pending:
                        raise AppError(
                            "Có lượt chưa hoàn thành. Dùng nút Thử lại trước khi gửi câu mới.",
                            409,
                            "pending_turn",
                        )
                    if request.action == "start" and interview.status != "new":
                        raise AppError("Phiên đã bắt đầu.", 409)
                    if request.action == "answer" and interview.status != "active":
                        raise AppError("Phiên chưa bắt đầu hoặc đã kết thúc phần hỏi đáp.", 409)
                    operation = Operation(
                        interview_id=interview_id,
                        request_id=request.request_id,
                        action=request.action,
                        text=request.text,
                    )
                    db.add(operation)
                    if request.action == "answer":
                        user_message = Message(
                            interview_id=interview_id,
                            sequence=interview.questions_asked + interview.answers_count + 1,
                            role="user",
                            text=request.text,
                            criterion_id=interview.rubric_snapshot["criteria"][
                                interview.criterion_index
                            ]["id"],
                        )
                        db.add(user_message)
                        interview.answers_count += 1
                    await db.commit()
                if interview.status == "completed":
                    raise AppError("Phiên đã được chấm điểm.", 409)
                messages = (
                    await db.scalars(
                        select(Message)
                        .where(Message.interview_id == interview_id)
                        .order_by(Message.sequence)
                    )
                ).all()
                transcript = [message_dict(m) for m in messages]
                course = await db.get(Course, interview.course_id)
                course_name = course.name

            yield {"type": "accepted", "request_id": str(request.request_id)}
            plan = next_plan(interview)
            question, sources = "", []
            if plan:
                yield {"type": "status", "message": "Đang tìm nội dung liên quan trong tài liệu…"}
                criterion = plan["criterion"]
                recent = "\n".join(m["text"][-600:] for m in transcript[-2:])
                query = f"{course_name}. {criterion['name']}: {criterion['description'][:500]}\n{recent}"
                sources = await self.retrieval.retrieve(interview, query)
                if not sources:
                    raise AppError(
                        "Không tìm thấy tài liệu của phiên. Hãy kiểm tra dữ liệu môn học.", 409
                    )
                yield {"type": "status", "message": "Giám khảo đang đặt câu hỏi…"}
                data = encode(
                    {
                        "course": course_name,
                        "plan": plan,
                        "rubric": interview.rubric_snapshot,
                        "transcript": [
                            {k: m[k] for k in ("id", "role", "text")} for m in transcript
                        ],
                        "reference_material": sources,
                    }
                )
                async for delta in self.gateway.stream_text(
                    INTERVIEW_SYSTEM, data, model=interview.model
                ):
                    question += delta
                    if len(question) > 8000:
                        raise AppError(
                            "Câu hỏi vượt giới hạn. Hãy thử lại lượt này.", 502, "output_too_long"
                        )
                    yield {"type": "delta", "text": delta}
                question = question.strip()
                if not question:
                    raise AppError("Không có câu hỏi hợp lệ. Hãy thử lại.", 502)

            async with self.db.sessions() as db:
                interview = await db.get(Interview, interview_id)
                operation = await db.get(Operation, operation.id)
                assistant = None
                if plan:
                    assistant = Message(
                        interview_id=interview_id,
                        sequence=interview.questions_asked + interview.answers_count + 1,
                        role="assistant",
                        text=question,
                        sources=sources,
                        criterion_id=plan["criterion"]["id"],
                    )
                    db.add(assistant)
                    interview.questions_asked += 1
                    interview.criterion_index = plan["criterion_index"]
                    interview.followups_used = plan["followups_used"]
                    interview.status = "active"
                else:
                    interview.status = "awaiting_finish"
                await db.flush()
                result = {
                    "session": interview_dict(interview),
                    "message": message_dict(assistant) if assistant else None,
                }
                operation.result, operation.status = result, "completed"
                await db.commit()
            yield {
                "type": "done",
                "request_id": str(request.request_id),
                "replayed": False,
                **result,
            }

    async def finish(self, interview_id: UUID) -> dict:
        async with self.lock(interview_id):
            detail = await self.detail(interview_id)
            if detail["report"]:
                return detail["report"]
            if detail["answers_count"] == 0:
                raise AppError("Cần ít nhất một câu trả lời trước khi chấm điểm.")
            sources = {s["chunk_id"]: s for m in detail["messages"] for s in m["sources"]}
            transcript = [{k: m[k] for k in ("id", "role", "text")} for m in detail["messages"]]
            data = encode(
                {
                    "rubric_snapshot": detail["rubric"],
                    "transcript": transcript,
                    "reference_material": list(sources.values()),
                }
            )
            report = None
            for attempt in range(2):
                try:
                    draft = await self.gateway.structured(
                        GradeDraft, GRADE_SYSTEM, data, model=detail["model"]
                    )
                    report = validate_report(draft, detail["rubric"], transcript)
                    break
                except AppError as exc:
                    if attempt or exc.code not in ("invalid_evidence", "invalid_model_json"):
                        raise
                    data += "\nSửa lần trả trước: đủ tiêu chí, bằng chứng nguyên văn từ user và ID chính xác."
            report |= {
                "interview_id": str(interview_id),
                "model": detail["model"],
                "answers_count": detail["answers_count"],
                "ended_early": detail["status"] != "awaiting_finish",
                "notice": "Điểm luyện tập do AI đề xuất; cần người dạy xem lại khi dùng đánh giá chính thức.",
            }
            async with self.db.sessions() as db:
                interview = await db.get(Interview, interview_id)
                interview.report, interview.status = report, "completed"
                pending = (
                    await db.scalars(
                        select(Operation).where(
                            Operation.interview_id == interview_id, Operation.status == "pending"
                        )
                    )
                ).all()
                for operation in pending:
                    operation.status = "completed"
                    operation.result = {"session": interview_dict(interview), "message": None}
                await db.commit()
            return report
