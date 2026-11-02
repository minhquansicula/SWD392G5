"""Duplex Voice Room kết nối Gemini Live và lưu dữ liệu trực tiếp vào database PostgreSQL (aives_db)."""

import asyncio
import json
import logging
import re
import time
from datetime import UTC, datetime, timedelta
from uuid import UUID, uuid4

from google.genai import types
from sqlalchemy import select
from starlette.websockets import WebSocketDisconnect

from app.errors import AppError
from app.interview import encode
from app.live_gemini import live_config, validate_pcm
from app.models import (
    AssignedQuestion,
    Exam,
    ExamSchedule,
    Transcript,
    VoiceSessionState,
)

logger = logging.getLogger(__name__)


class ReconnectLive(Exception):
    pass


class VoiceRoom:
    def __init__(self, interviews, websocket, schedule_id: UUID):
        self.service = interviews
        self.ws = websocket
        self.id = schedule_id
        self.events = asyncio.Queue(maxsize=256)
        self.send_lock = asyncio.Lock()
        
        self.schedule = None
        self.exam = None
        self.assigned_questions = []
        self.current_q_index = 0
        self.followups_used = 0
        self.total_followups_used = 0
        
        self.buffers = {}
        self.meta = {}
        self.plan = None
        self.needs_plan = True
        self.finished = False
        self.finish_requested = False
        self.closed = False
        
        self.last_checkpoint = 0.0
        self.last_event = time.monotonic()
        self.tool_results = {}
        self.cancelled_calls = set()
        self.live = None
        self.accept_audio = False
        self.incoming_audio_bytes = 0
        self.rate_started = time.monotonic()
        self.deadline = None
        self.submitted_plan = None
        self.waiting_for_answer = False
        self.history = []

    async def send(self, payload):
        async with self.send_lock:
            async with asyncio.timeout(10):
                if isinstance(payload, bytes):
                    await self.ws.send_bytes(payload)
                else:
                    await self.ws.send_json(payload)

    async def load(self):
        async with self.service.db.sessions() as db:
            self.schedule = await db.get(ExamSchedule, self.id)
            if not self.schedule:
                raise AppError(f"Không tìm thấy ca thi với mã {self.id}", 404)
            if self.schedule.status == "COMPLETED":
                raise AppError("Ca thi đã hoàn thành và chấm điểm.", 409)
            if self.schedule.status != "IN_PROGRESS":
                raise AppError("Ca thi chưa được bắt đầu qua hệ thống lịch thi.", 409, "schedule_not_started")

            self.exam = await db.get(Exam, self.schedule.exam_id)
            if not self.exam:
                raise AppError("Không tìm thấy kỳ thi của ca này.", 404)

            # Lấy danh sách câu hỏi đã được bốc thăm cho sinh viên
            self.assigned_questions = list(
                (
                    await db.scalars(
                        select(AssignedQuestion)
                        .where(AssignedQuestion.exam_schedule_id == self.id)
                        .order_by(AssignedQuestion.question_order)
                    )
                ).all()
            )

            # Lấy voice state nếu có
            self.voice_state = await db.get(VoiceSessionState, self.id)
            if not self.voice_state:
                self.voice_state = VoiceSessionState(
                    schedule_id=self.id,
                    live_model=self.service.settings.gemini_live_model,
                    state={},
                )
                db.add(self.voice_state)
                await db.commit()
            recent = list((await db.scalars(select(Transcript)
                .where(Transcript.exam_schedule_id == self.id)
                .order_by(Transcript.created_at.desc()).limit(20))).all())
            self.history = [{"role": t.role, "text": t.text_content} for t in reversed(recent)]

        self.needs_plan = True

        state = self.voice_state.state or {}
        self.current_q_index = min(max(int(state.get("current_q_index", 0)), 0), len(self.assigned_questions))
        self.followups_used = int(state.get("followups_used", 0))
        self.total_followups_used = int(state.get("total_followups_used", 0))
        self.plan = state.get("plan")
        self.finished = bool(state.get("finished", False))
        self.submitted_plan = state.get("submitted_plan")
        self.waiting_for_answer = bool(state.get("waiting_for_answer", self.plan is not None))
        if state.get("deadline"):
            self.deadline = datetime.fromisoformat(state["deadline"])

    async def checkpoint(self):
        if not getattr(self, "voice_state", None):
            return
        state = json.loads(encode({
            "current_q_index": self.current_q_index,
            "followups_used": self.followups_used,
            "total_followups_used": self.total_followups_used,
            "plan": self.plan, "finished": self.finished,
            "submitted_plan": self.submitted_plan,
            "waiting_for_answer": self.waiting_for_answer,
            "deadline": self.deadline.isoformat() if self.deadline else None,
        }))
        async with self.service.db.sessions() as db:
            stored = await db.get(VoiceSessionState, self.id)
            if stored:
                stored.state = state
                await db.commit()

    async def announce_plan(self, restored=False):
        if not self.plan:
            return
        if not restored:
            self.deadline = datetime.now(UTC) + timedelta(seconds=self.plan["time_limit_seconds"])
            self.submitted_plan = None
            self.waiting_for_answer = True
        end = getattr(self.schedule, "scheduled_end_time", None)
        if end and self.deadline:
            self.deadline = min(self.deadline, end)
        self.plan["plan_id"] = f"{self.current_question.question_id}:{self.followups_used}"
        self.plan["question_id"] = str(self.current_question.question_id)
        await self.checkpoint()
        await self.send({
            **self.plan, "type": "plan", "kind": self.plan["type"],
            "number": self.plan["question_order"], "total": len(self.assigned_questions),
            "deadline": self.deadline.isoformat() if self.deadline else None,
            "answer_submitted": self.submitted_plan == self.plan["plan_id"],
        })

    async def submit_answer(self, live, body):
        if not self.plan or not live or self.finished:
            await self.send({"type": "error", "message": "Câu hỏi chưa sẵn sàng."})
            return
        if body.get("plan_id") != self.plan.get("plan_id"):
            await self.send({"type": "error", "message": "Câu hỏi đã thay đổi. Vui lòng đồng bộ lại phòng thi."})
            return
        if self.submitted_plan != self.plan["plan_id"]:
            self.accept_audio = False
            # Flush audio before asking Gemini to evaluate the completed turn.
            await live.send_realtime_input(audio_stream_end=True)
            await live.send_client_content(
                turns=types.Content(role="user", parts=[types.Part(text=
                    "Thí sinh đã kết thúc lượt trả lời hiện tại. Hãy xử lý câu trả lời đã nhận, "
                    "gọi prepare_next_question cho câu tiếp theo; nếu không có câu trả lời, ghi nhận bỏ trống.")]),
                turn_complete=True,
            )
            self.submitted_plan = self.plan["plan_id"]
            self.waiting_for_answer = False
            await self.checkpoint()
        await self.send({"type": "answer_submitted", "plan_id": self.plan["plan_id"]})

    @property
    def current_question(self) -> AssignedQuestion | None:
        if 0 <= self.current_q_index < len(self.assigned_questions):
            return self.assigned_questions[self.current_q_index]
        return None

    def context(self):
        cur_q = self.current_question
        q_text = cur_q.content_snapshot if cur_q else ""
        max_per_main = self.exam.max_followups_per_main if self.exam and self.exam.max_followups_per_main is not None else 2
        max_total = self.exam.max_followup_questions if self.exam and self.exam.max_followup_questions is not None else 10
        return encode(
            {
                "exam_title": self.exam.title if self.exam else "",
                "current_question_index": self.current_q_index + 1,
                "total_questions": len(self.assigned_questions),
                "current_question_text": q_text,
                "followups_used": self.followups_used,
                "max_followups": max_per_main,
                "total_followups_used": self.total_followups_used,
                "max_total_followups": max_total,
                "recent_transcripts": self.history,
                "waiting_for_answer": self.waiting_for_answer,
                "current_plan": self.plan,
            }
        )

    async def transcript(self, raw_role: str, text: str, finished: bool = False):
        if not text and not finished:
            return
        db_role = "STUDENT" if raw_role == "user" else "AI"
        cur_q = self.current_question
        question_id = cur_q.question_id if cur_q else None

        t_obj = self.buffers.get(raw_role)
        if t_obj is None and text:
            t_obj = Transcript(
                id=uuid4(),
                exam_schedule_id=self.id,
                question_id=question_id,
                role=db_role,
                text_content="",
                created_at=datetime.now(UTC),
            )
            self.buffers[raw_role] = t_obj

        if t_obj is None:
            return

        clean_text = text or ""
        if raw_role != "user":
            clean_text = re.sub(r"<ctrl\d+>", "", clean_text)
            clean_text = re.sub(r"</?ctrl[^>]*>", "", clean_text)
        t_obj.text_content += clean_text
        if raw_role == "assistant" and self.plan and self.plan.get("type") == "followup":
            self.plan["content"] = t_obj.text_content

        # Gửi subtitle về cho giao diện Web
        await self.send(
            {
                "type": "transcript",
                "id": str(t_obj.id),
                "role": raw_role,
                "text": t_obj.text_content,
                "final": bool(finished),
                "question_id": str(question_id) if question_id else None,
            }
        )

        # Khi kết thúc một lượt phát ngôn thì lưu vào DB
        if finished:
            async with self.service.db.sessions() as db:
                db.add(t_obj)
                await db.commit()
            self.buffers.pop(raw_role, None)
            self.history = (self.history + [{"role": db_role, "text": t_obj.text_content}])[-20:]
            await self.checkpoint()
            if raw_role == "user" and t_obj.text_content.strip():
                self.waiting_for_answer = False
                await self.checkpoint()

    async def close_buffers(self, interrupted: bool = False):
        if not self.buffers:
            return
        async with self.service.db.sessions() as db:
            for role, t_obj in list(self.buffers.items()):
                if t_obj.text_content.strip():
                    db.add(t_obj)
            await db.commit()
        self.buffers.clear()

    async def prepare(self, query: str = "", repeat: bool = False):
        """Điều phối câu hỏi tiếp theo: hỏi câu chính trong đề thi hoặc hỏi đào sâu (RAG)."""
        if self.finish_requested or self.finished:
            return {"finished": True}

        if repeat and self.plan is not None:
            return self.plan
        if self.plan is not None and self.waiting_for_answer:
            return self.plan

        max_per_main = self.exam.max_followups_per_main if self.exam and self.exam.max_followups_per_main is not None else 2
        max_total = self.exam.max_followup_questions if self.exam and self.exam.max_followup_questions is not None else 10
        main_limit = (self.exam.main_answer_time_limit_seconds if self.exam and self.exam.main_answer_time_limit_seconds else 120)
        followup_limit = (self.exam.followup_answer_time_limit_seconds if self.exam and self.exam.followup_answer_time_limit_seconds else 60)

        # Kiểm tra đồng thời ràng buộc theo câu chính và trần câu phụ toàn ca thi
        can_followup = (
            self.plan is not None
            and self.followups_used < max_per_main
            and self.total_followups_used < max_total
            and bool(query)
            and not repeat
        )

        if can_followup:
            # Tra cứu RAG ngữ cảnh bài giảng cho câu hỏi đào sâu
            refs = await self.service.retrieval.retrieve(
                course_id=self.exam.course_id,
                query=query,
                embedding_model=self.service.settings.gemini_embedding_model,
            )
            self.followups_used += 1
            self.total_followups_used += 1
            self.plan = {
                "type": "followup",
                "question_order": self.current_q_index + 1,
                "followup_index": self.followups_used,
                "max_followups_per_main": max_per_main,
                "total_followups_used": self.total_followups_used,
                "max_total_followups": max_total,
                "time_limit_seconds": followup_limit,
                "sources": refs,
            }
            self.accept_audio = True
            await self.announce_plan()
            return self.plan

        # Chuyển sang câu hỏi chính tiếp theo trong đề thi đã bốc thăm
        if self.plan is not None and not repeat:
            self.current_q_index += 1
            self.followups_used = 0

        cur_q = self.current_question
        if not cur_q:
            # Đã hết toàn bộ câu hỏi trong đề
            self.finished = True
            await self.checkpoint()
            await self.send({"type": "questions_complete"})
            return {"finished": True}

        self.plan = {
            "type": "main",
            "question_order": cur_q.question_order,
            "total": len(self.assigned_questions),
            "content": cur_q.content_snapshot,
            "followup_index": 0,
            "max_followups_per_main": max_per_main,
            "total_followups_used": self.total_followups_used,
            "max_total_followups": max_total,
            "time_limit_seconds": main_limit,
            "sources": [],
        }
        self.accept_audio = True
        await self.announce_plan()
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
                        raise AppError("Audio gửi quá nhanh. Mở lại mic.")
                    if self.live and self.accept_audio and not self.finished:
                        await self.live.send_realtime_input(
                            audio=types.Blob(data=data, mime_type="audio/pcm;rate=16000")
                        )
                elif frame.get("text"):
                    body = json.loads(frame["text"])
                    if body.get("type") in {"finish", "finish_exam", "force_finish"}:
                        self.accept_audio = False
                        await self.events.put(("finish", None))
                    elif body.get("type") == "ping":
                        await self.events.put(("ping", None))
                    elif body.get("type") == "submit_answer":
                        await self.events.put(("submit_answer", body))
        except (WebSocketDisconnect, RuntimeError):
            await self.events.put(("disconnect", None))
        except Exception as exc:
            await self.events.put(("error", exc))

    async def gemini_reader(self, live):
        try:
            while True:
                async for event in live.receive():
                    if event.tool_call_cancellation:
                        self.cancelled_calls.update(event.tool_call_cancellation.ids or [])
                    await self.events.put(("gemini", event))
        except Exception as exc:
            await self.events.put(("upstream_error", exc))

    async def server_event(self, live, event):
        self.last_event = time.monotonic()
        content = event.server_content
        if content:
            if content.interrupted:
                await self.send({"type": "clear_audio"})
                await self.close_buffers(interrupted=True)
            if content.input_transcription:
                t = content.input_transcription
                await self.transcript("user", t.text, bool(t.finished))

        if event.tool_call:
            for call in event.tool_call.function_calls or []:
                if call.name == "prepare_next_question":
                    args = call.args or {}
                    result = await self.prepare(args.get("query", ""), args.get("repeat") is True)
                else:
                    result = {"error": "Unknown tool"}
                await live.send_tool_response(
                    function_responses=[
                        types.FunctionResponse(
                            id=call.id, name=call.name, response={"result": result}
                        )
                    ]
                )

        if not content:
            return

        if content.output_transcription:
            t = content.output_transcription
            await self.transcript("assistant", t.text, bool(t.finished))

        for part in (content.model_turn.parts or []) if content.model_turn else []:
            if part.inline_data and part.inline_data.data:
                await self.send(part.inline_data.data)

        if content.turn_complete:
            await self.close_buffers()
            await self.send({"type": "turn_complete"})

    async def pump(self, live):
        while not self.closed:
            end = getattr(self.schedule, "scheduled_end_time", None)
            deadlines = [d for d in [end, self.deadline if self.waiting_for_answer else None] if d]
            timeout = max(0.01, (min(deadlines) - datetime.now(UTC)).total_seconds()) if deadlines else None
            try:
                kind, payload = await asyncio.wait_for(self.events.get(), timeout=timeout)
            except TimeoutError:
                if end and datetime.now(UTC) >= end:
                    kind, payload = "finish", None
                else:
                    kind, payload = "submit_answer", {"plan_id": self.plan["plan_id"]}
            if kind == "disconnect":
                self.closed = True
                return
            if kind == "finish":
                self.finish_requested = True
                await self.close_buffers()
                try:
                    report = await self.service.finish(self.id)
                    await self.send({"type": "report", "data": report, "report": report})
                except Exception as exc:
                    logger.error(f"Finish grading error: {exc}", exc_info=True)
                    await self.send({"type": "error", "code": "finish_failed", "message": "Chấm điểm thất bại. Vui lòng kết nối lại và thử kết thúc bài."})
                self.closed = True
                return
            if kind == "ping":
                await self.send({"type": "pong"})
                continue
            if kind == "submit_answer":
                try:
                    await self.submit_answer(live, payload)
                except Exception as exc:
                    logger.exception("Could not submit answer")
                    await self.send({"type": "error", "message": "Chưa nộp được câu trả lời. Vui lòng thử lại."})
                    raise ReconnectLive() from exc
                continue
            if kind == "error":
                raise payload
            if kind == "gemini":
                await self.server_event(live, payload)
            elif kind == "upstream_error":
                raise ReconnectLive() from payload

    async def run(self):
        await self.load()
        max_main = self.exam.max_main_questions or len(self.assigned_questions)
        max_followups = self.exam.max_followup_questions or 0
        max_per_main = self.exam.max_followups_per_main if self.exam.max_followups_per_main is not None else 2
        main_limit = self.exam.main_answer_time_limit_seconds or 120
        followup_limit = self.exam.followup_answer_time_limit_seconds or 60

        await self.send(
            {
                "type": "ready",
                "schedule_id": str(self.id),
                "exam_title": self.exam.title if self.exam else "",
                "total_questions": len(self.assigned_questions),
                "max_main_questions": max_main,
                "max_followup_questions": max_followups,
                "max_followups_per_main": max_per_main,
                "main_answer_time_limit_seconds": main_limit,
                "followup_answer_time_limit_seconds": followup_limit,
                "sample_rate": 24000,
            }
        )
        if self.finished:
            await self.send({"type": "questions_complete"})
        elif self.plan:
            await self.announce_plan(restored=True)
        else:
            await self.prepare()
        reader_task = asyncio.create_task(self.browser_reader())
        try:
            while not self.closed:
                config = live_config(
                    self.service.settings,
                    context=self.context(),
                )
                try:
                    async with self.service.gateway.client.aio.live.connect(
                        model=self.service.settings.gemini_live_model, config=config
                    ) as live:
                        self.live = live
                        self.accept_audio = self.waiting_for_answer
                        upstream = asyncio.create_task(self.gemini_reader(live))
                        try:
                            # Prompt chào mừng và yêu cầu AI đọc câu hỏi đầu tiên
                            cur_q = self.current_question
                            first_q = cur_q.content_snapshot if cur_q else "Bắt đầu phỏng vấn."
                            await live.send_client_content(
                                turns=types.Content(
                                    role="user",
                                    parts=[
                                        types.Part(
                                            text=("Tiếp tục ca thi theo trạng thái đã lưu. "
                                                  f"Câu chính hiện tại số {self.current_q_index + 1}: '{first_q}'. "
                                                  f"Kế hoạch hiện tại: {encode(self.plan)}. "
                                                  f"Trạng thái chờ trả lời: {self.waiting_for_answer}. "
                                                  "Nếu đang chờ trả lời, nhắc lại đúng câu hiện tại; nếu lượt đã nộp, gọi prepare_next_question. "
                                                  "Không khởi động lại bài thi hoặc tự tăng số câu.")
                                        )
                                    ],
                                ),
                                turn_complete=True,
                            )
                            await self.pump(live)
                        finally:
                            upstream.cancel()
                except ReconnectLive:
                    logger.info("Reconnecting Gemini Live...")
                    await asyncio.sleep(1)
        finally:
            self.closed = True
            reader_task.cancel()
            await self.close_buffers()
            await self.checkpoint()
