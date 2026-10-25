"""Duplex Voice Room kết nối Gemini Live và lưu dữ liệu trực tiếp vào database PostgreSQL (aives_db)."""

import asyncio
import json
import logging
import time
from datetime import UTC, datetime
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
    Rubric,
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

            # Cập nhật trạng thái ca thi sang IN_PROGRESS nếu đang PENDING
            if self.schedule.status == "PENDING":
                self.schedule.status = "IN_PROGRESS"
                self.schedule.actual_start_time = datetime.now(UTC)
                await db.commit()

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

        self.needs_plan = True

    @property
    def current_question(self) -> AssignedQuestion | None:
        if 0 <= self.current_q_index < len(self.assigned_questions):
            return self.assigned_questions[self.current_q_index]
        return None

    def context(self):
        cur_q = self.current_question
        q_text = cur_q.content_snapshot if cur_q else ""
        return encode(
            {
                "exam_title": self.exam.title,
                "current_question_index": self.current_q_index + 1,
                "total_questions": len(self.assigned_questions),
                "current_question_text": q_text,
                "followups_used": self.followups_used,
                "max_followups": self.exam.max_followups_per_main,
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

        t_obj.text_content += text or ""

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

        # Nếu chưa hỏi hết số lần hỏi xoáy cho câu hiện tại và có query đào sâu
        max_followups = self.exam.max_followups_per_main
        if self.followups_used < max_followups and query and not repeat:
            self.followups_used += 1
            # Tra cứu RAG ngữ cảnh bài giảng cho câu hỏi đào sâu
            refs = await self.service.retrieval.retrieve(
                course_id=self.exam.course_id,
                query=query,
                embedding_model=self.service.settings.gemini_embedding_model,
            )
            self.plan = {
                "type": "followup",
                "question_order": self.current_q_index + 1,
                "followup_index": self.followups_used,
                "sources": refs,
            }
            await self.send(
                {
                    "type": "plan",
                    "kind": "followup",
                    "number": self.current_q_index + 1,
                    "followup_index": self.followups_used,
                    "sources": refs,
                }
            )
            return self.plan

        # Chuyển sang câu hỏi chính tiếp theo trong đề thi đã bốc thăm
        if self.followups_used > 0:
            self.current_q_index += 1
            self.followups_used = 0

        cur_q = self.current_question
        if not cur_q:
            # Đã hết toàn bộ câu hỏi trong đề
            self.finished = True
            await self.send({"type": "questions_complete"})
            return {"finished": True}

        self.plan = {
            "type": "main",
            "question_order": cur_q.question_order,
            "content": cur_q.content_snapshot,
            "sources": [],
        }
        await self.send(
            {
                "type": "plan",
                "kind": "main",
                "number": cur_q.question_order,
                "total": len(self.assigned_questions),
                "content": cur_q.content_snapshot,
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
                        raise AppError("Audio gửi quá nhanh. Mở lại mic.")
                    if self.live and self.accept_audio and not self.finished:
                        await self.live.send_realtime_input(
                            audio=types.Blob(data=data, mime_type="audio/pcm;rate=16000")
                        )
                elif frame.get("text"):
                    body = json.loads(frame["text"])
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
            kind, payload = await self.events.get()
            if kind == "disconnect":
                self.closed = True
                return
            if kind == "finish":
                self.finish_requested = True
                await self.close_buffers()
                # Chấm điểm toàn bộ ca thi
                report = await self.service.finish(self.id)
                await self.send({"type": "report", "report": report})
                self.closed = True
                return
            if kind == "ping":
                await self.send({"type": "pong"})
                continue
            if kind == "gemini":
                await self.server_event(live, payload)
            elif kind == "upstream_error":
                raise ReconnectLive() from payload

    async def run(self):
        await self.load()
        await self.send(
            {
                "type": "ready",
                "schedule_id": str(self.id),
                "exam_title": self.exam.title,
                "total_questions": len(self.assigned_questions),
            }
        )
        reader_task = asyncio.create_task(self.browser_reader())
        try:
            while not self.closed:
                config = live_config(
                    self.service.settings,
                    system_instruction=self.context(),
                )
                try:
                    async with self.service.gateway.client.aio.live.connect(
                        model=self.service.settings.gemini_live_model, config=config
                    ) as live:
                        self.live = live
                        self.accept_audio = True
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
                                            text=f"Bắt đầu ca thi vấn đáp cho môn học. Hãy chào thí sinh ngắn gọn và đặt câu hỏi thứ 1: '{first_q}'"
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
