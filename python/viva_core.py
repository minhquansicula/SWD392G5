import asyncio
import logging
import time
from typing import Dict, Any, List, Optional, Callable, Awaitable

from google import genai
from google.genai import types

from config import settings
from prompts.viva_prompts import build_examiner_instructions
from services.grader_service import grader_service
from services.backend_client import backend_client

logger = logging.getLogger("aives.viva_core")

class VivaLiveSession:
    """
    Quản lý phiên đàm thoại hai chiều thời gian thực giữa Thí sinh và Gemini 3.8 Live.
    Kế thừa kiến trúc AudioLoop không độ trễ từ liveTrans/agent.py.
    """

    def __init__(
        self,
        schedule_id: str,
        exam_context: Dict[str, Any],
        on_audio_out: Callable[[bytes], Awaitable[None]],
        on_subtitle: Callable[[str, str, bool], Awaitable[None]],  # (role, text_delta, is_interim)
        on_turn_complete: Optional[Callable[[], Awaitable[None]]] = None,
        on_interrupted: Optional[Callable[[], Awaitable[None]]] = None,
    ):
        self.schedule_id = schedule_id
        self.exam_context = exam_context
        self.on_audio_out = on_audio_out
        self.on_subtitle = on_subtitle
        self.on_turn_complete = on_turn_complete
        self.on_interrupted = on_interrupted

        self.client = genai.Client(
            http_options={"api_version": "v1beta"},
            api_key=settings.gemini_api_key
        )

        self.session = None
        self.is_running = False
        self.input_queue: asyncio.Queue = asyncio.Queue()
        self.tasks: List[asyncio.Task] = []

        # Lưu vết toàn bộ biên bản hội thoại để chấm điểm
        self.transcripts: List[Dict[str, Any]] = []
        self._current_ai_text = ""
        self._current_user_text = ""

    def _build_config(self) -> types.LiveConnectConfig:
        instructions = build_examiner_instructions(self.exam_context)
        return types.LiveConnectConfig(
            response_modalities=["AUDIO"],
            output_audio_transcription=types.AudioTranscriptionConfig(),
            input_audio_transcription=types.AudioTranscriptionConfig(
                language_codes=["vi-VN", "vi"]
            ),
            system_instruction=types.Content(
                parts=[types.Part.from_text(text=instructions)]
            ),
            speech_config=types.SpeechConfig(
                voice_config=types.VoiceConfig(
                    prebuilt_voice_config=types.PrebuiltVoiceConfig(
                        voice_name=settings.live_voice
                    )
                )
            ),
            context_window_compression=types.ContextWindowCompressionConfig(
                trigger_tokens=2500,
                sliding_window=types.SlidingWindow(target_tokens=1200)
            )
        )

    async def start(self):
        """Khởi động kết nối WebSocket hai chiều tới Gemini Live."""
        self.is_running = True
        config = self._build_config()

        # Thử kết nối với model ưu tiên (Gemini 3.8 Live), nếu chưa mở quyền thì fallback về bản 2.5
        model_name = settings.model_live
        try:
            logger.info(f"Đang kết nối Gemini Live WebSocket với model: {model_name}...")
            self._ws_context = self.client.aio.live.connect(model=model_name, config=config)
            self.session = await self._ws_context.__aenter__()
            logger.info(f"Kết nối Gemini Live ({model_name}) THÀNH CÔNG!")
        except Exception as e:
            logger.warning(f"Không thể kết nối với {model_name} ({e}). Thử fallback về: {settings.model_live_fallback}")
            model_name = settings.model_live_fallback
            self._ws_context = self.client.aio.live.connect(model=model_name, config=config)
            self.session = await self._ws_context.__aenter__()
            logger.info(f"Kết nối Gemini Live Fallback ({model_name}) THÀNH CÔNG!")

        # Chạy song song 2 task: gửi dữ liệu (send_worker) và nhận dữ liệu (receive_worker)
        self.tasks.append(asyncio.create_task(self._send_worker(), name="viva_send_worker"))
        self.tasks.append(asyncio.create_task(self._receive_worker(), name="viva_receive_worker"))

        # Gửi trigger mở đầu PHẢI dùng send_realtime_input (không được dùng send_client_content
        # khi cùng session sẽ dùng send_realtime_input cho audio - mixing hai API gây lỗi 1007!)
        student_name = self.exam_context.get("student_name", "Sinh viên")
        first_q = self.exam_context.get("questions", [{}])[0].get("question_content", "")
        init_trigger = (
            f"Xin chào, thí sinh {student_name} đã sẵn sàng. "
            f"Hãy bắt đầu chào và đọc câu hỏi 1: '{first_q}'."
        )
        await self.session.send_realtime_input(text=init_trigger)

    async def send_audio_chunk(self, pcm_bytes: bytes):
        """Nhận chunk âm thanh PCM 16kHz từ mic của thí sinh và đưa vào hàng đợi gửi."""
        if not self.is_running or self.session is None:
            return
        blob = types.Blob(data=pcm_bytes, mime_type="audio/pcm;rate=16000")
        await self.input_queue.put(blob)

    async def _send_worker(self):
        """Task nền liên tục gửi realtime audio chunks tới Gemini Live (kích hoạt VAD tự động)."""
        sent_count = 0
        try:
            while self.is_running:
                blob = await self.input_queue.get()
                if self.session is not None:
                    try:
                        # Dùng audio= (không phải media=) để kích hoạt Server-side VAD của Gemini
                        await self.session.send_realtime_input(audio=blob)
                        sent_count += 1
                        if sent_count % 200 == 0:
                            logger.debug(f"Đã stream {sent_count} audio chunks tới Gemini Live")
                    except Exception as send_err:
                        logger.warning(f"Lỗi send_realtime_input: {send_err}")
                self.input_queue.task_done()
        except asyncio.CancelledError:
            pass
        except Exception as e:
            logger.error(f"Lỗi trong _send_worker: {e}")

    async def _receive_worker(self):
        """Task nền lắng nghe stream trả về từ Gemini Live (Audio PCM + Subtitle Text)."""
        turn_index = 0
        try:
            while self.is_running and self.session is not None:
                turn_index += 1
                logger.info(f"[RECEIVE_WORKER] Bắt đầu lắng nghe turn #{turn_index}...")
                turn = self.session.receive()
                msg_count = 0
                async for response in turn:
                    msg_count += 1

                    # Kiểm tra VAD signal (Gemini xác nhận đang nghe giọng nói)
                    vad_signal = getattr(response, "voice_activity_detection_signal", None)
                    if vad_signal:
                        logger.info(f"[VAD] Tín hiệu phát hiện giọng nói: {vad_signal}")

                    sc = getattr(response, "server_content", None)
                    if sc:
                        # 0. Thí sinh nói chen ngang (Barge-in / Interruption)
                        if getattr(sc, "interrupted", False):
                            logger.info("[BARGE-IN] Thí sinh nói chen ngang. Dừng phát âm thanh cũ.")
                            if self.on_interrupted:
                                await self.on_interrupted()

                        # 1. Phụ đề Giám khảo AI nói (stream từng từ)
                        if sc.output_transcription and sc.output_transcription.text:
                            chunk = sc.output_transcription.text
                            self._current_ai_text += chunk
                            await self.on_subtitle("EXAMINER", chunk, False)

                        # 2. Phụ đề Thí sinh nói qua Mic (interim: thời gian thực khi đang phát âm)
                        if getattr(sc, "interim_input_transcription", None) and sc.interim_input_transcription.text:
                            interim_text = sc.interim_input_transcription.text
                            logger.info(f"[STUDENT INTERIM]: {interim_text}")
                            await self.on_subtitle("STUDENT", interim_text, True)

                        # 3. Phụ đề Thí sinh nói qua Mic (finalized: đã chốt câu)
                        if sc.input_transcription and sc.input_transcription.text:
                            chunk = sc.input_transcription.text
                            self._current_user_text += chunk
                            logger.info(f"[STUDENT FINAL]: {chunk}")
                            await self.on_subtitle("STUDENT", chunk, False)

                        # 4. Âm thanh phản hồi từ Giám khảo AI (PCM 24kHz)
                        if sc.model_turn:
                            for part in sc.model_turn.parts:
                                if part.inline_data and part.inline_data.data:
                                    await self.on_audio_out(part.inline_data.data)

                    # Fallback nếu response có direct data hoặc text
                    elif response.data:
                        await self.on_audio_out(response.data)
                    elif response.text:
                        self._current_ai_text += response.text
                        await self.on_subtitle("EXAMINER", response.text, False)

                logger.info(f"[RECEIVE_WORKER] Turn #{turn_index} kết thúc (nhận {msg_count} messages).")

                # Khi kết thúc lượt nói của AI
                if self._current_ai_text.strip():
                    self.transcripts.append({
                        "role": "EXAMINER",
                        "text": self._current_ai_text.strip(),
                        "timestamp": time.time()
                    })
                    logger.info(f"[EXAMINER]: {self._current_ai_text.strip()[:80]}...")
                    self._current_ai_text = ""

                # Khi kết thúc lượt nói của Thí sinh
                if self._current_user_text.strip():
                    self.transcripts.append({
                        "role": "STUDENT",
                        "text": self._current_user_text.strip(),
                        "timestamp": time.time()
                    })
                    logger.info(f"[STUDENT]: {self._current_user_text.strip()[:80]}...")
                    self._current_user_text = ""

                if self.on_turn_complete:
                    await self.on_turn_complete()

        except asyncio.CancelledError:
            pass
        except Exception as e:
            logger.error(f"Lỗi trong _receive_worker (turn #{turn_index}): {e}", exc_info=True)


    async def stop_and_grade(self) -> Dict[str, Any]:
        """Dừng ca thi, ngắt kết nối WebSocket và thực hiện chấm điểm tự động."""
        self.is_running = False
        for t in self.tasks:
            t.cancel()
        await asyncio.gather(*self.tasks, return_exceptions=True)

        if self.session is not None:
            try:
                await self._ws_context.__aexit__(None, None, None)
            except Exception:
                pass
            self.session = None

        logger.info(f"Đã đóng phiên Gemini Live ca thi {self.schedule_id}. Tổng số lượt thoại: {len(self.transcripts)}")

        # Thực hiện chấm điểm Rubric tự động
        grading_result = grader_service.grade_exam(self.exam_context, self.transcripts)

        # Nộp kết quả về Spring Boot Backend
        payload = {
            "status": "COMPLETED",
            "final_score": grading_result.get("final_score", 0.0),
            "summary_feedback": grading_result.get("summary_feedback", ""),
            "transcripts": self.transcripts,
            "question_results": grading_result.get("question_results", [])
        }
        backend_client.submit_exam_results(self.schedule_id, payload)
        return grading_result
