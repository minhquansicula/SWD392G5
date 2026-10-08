"""
AIVES Viva Desktop Standalone Examiner CLI
Chạy kiểm thử trực tiếp trên máy tính qua Microphone, Loa (PyAudio) và Webcam (OpenCV).
Kế thừa kiến trúc từ liveTrans/agent.py kết hợp logic Giám khảo AI và Chấm điểm tự động.
"""

import os
import sys
import io
import time
import base64
import asyncio
import traceback
import argparse
import cv2
import pyaudio
import PIL.Image

from google import genai
from google.genai import types

from config import settings
from services.backend_client import backend_client
from services.grader_service import grader_service
from prompts.viva_prompts import build_examiner_instructions

FORMAT = pyaudio.paInt16
CHANNELS = 1
SEND_SAMPLE_RATE = 16000
RECEIVE_SAMPLE_RATE = 24000
CHUNK_SIZE = 1024

pya = pyaudio.PyAudio()

class DesktopVivaLoop:
    def __init__(self, schedule_id: str = "test-session", enable_camera: bool = True):
        self.schedule_id = schedule_id
        self.enable_camera = enable_camera
        self.exam_context = backend_client.get_exam_context(schedule_id)
        
        self.audio_in_queue = None
        self.out_queue = None
        self.session = None
        self.audio_stream = None

        self.transcripts = []
        self._current_ai_text = ""
        self.is_running = True

    def _get_frame(self, cap):
        ret, frame = cap.read()
        if not ret:
            return None
        frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        img = PIL.Image.fromarray(frame_rgb)
        img.thumbnail([640, 480])

        image_io = io.BytesIO()
        img.save(image_io, format="jpeg", quality=70)
        image_io.seek(0)

        image_bytes = image_io.read()
        return {
            "mime_type": "image/jpeg",
            "data": base64.b64encode(image_bytes).decode("utf-8")
        }

    async def get_frames(self):
        cap = await asyncio.to_thread(cv2.VideoCapture, 0)
        try:
            while self.is_running:
                frame = await asyncio.to_thread(self._get_frame, cap)
                if frame is not None and self.out_queue is not None:
                    await self.out_queue.put(frame)
                await asyncio.sleep(1.5)  # Gửi 1 frame mỗi 1.5s để tiết kiệm băng thông
        finally:
            cap.release()

    async def send_realtime(self):
        while self.is_running:
            if self.out_queue is not None:
                msg = await self.out_queue.get()
                if self.session is not None:
                    try:
                        await self.session.send(input=msg)
                    except Exception:
                        pass
                self.out_queue.task_done()

    async def listen_audio(self):
        mic_info = pya.get_default_input_device_info()
        self.audio_stream = await asyncio.to_thread(
            pya.open,
            format=FORMAT,
            channels=CHANNELS,
            rate=SEND_SAMPLE_RATE,
            input=True,
            input_device_index=mic_info["index"],
            frames_per_buffer=CHUNK_SIZE,
        )
        try:
            while self.is_running:
                data = await asyncio.to_thread(self.audio_stream.read, CHUNK_SIZE, exception_on_overflow=False)
                if self.out_queue is not None:
                    await self.out_queue.put({"data": data, "mime_type": "audio/pcm"})
        finally:
            if self.audio_stream:
                self.audio_stream.close()

    async def receive_audio(self):
        while self.is_running and self.session is not None:
            turn = self.session.receive()
            async for response in turn:
                if data := response.data:
                    self.audio_in_queue.put_nowait(data)
                if text := response.text:
                    self._current_ai_text += text
                    print(text, end="", flush=True)

            # Kết thúc một lượt nói của AI
            if self._current_ai_text.strip():
                print()  # Xuống dòng
                self.transcripts.append({
                    "role": "EXAMINER",
                    "text": self._current_ai_text.strip(),
                    "timestamp": time.time()
                })
                self._current_ai_text = ""

            # Xử lý ngắt lời (Barge-in): dọn sạch queue audio khi đổi lượt
            while not self.audio_in_queue.empty():
                try:
                    self.audio_in_queue.get_nowait()
                except Exception:
                    break

    async def play_audio(self):
        stream = await asyncio.to_thread(
            pya.open,
            format=FORMAT,
            channels=CHANNELS,
            rate=RECEIVE_SAMPLE_RATE,
            output=True,
        )
        try:
            while self.is_running:
                if self.audio_in_queue is not None:
                    bytestream = await self.audio_in_queue.get()
                    await asyncio.to_thread(stream.write, bytestream)
                    self.audio_in_queue.task_done()
        finally:
            stream.close()

    async def user_input_monitor(self):
        """Cho phép người dùng nhấn Enter hoặc gõ 'q' để kết thúc ca thi và chấm điểm."""
        while self.is_running:
            cmd = await asyncio.to_thread(input, "\n[Gõ 'q' và nhấn Enter để kết thúc thi và xem điểm] > ")
            if cmd.strip().lower() == "q":
                self.is_running = False
                break

    async def run(self):
        client = genai.Client(
            http_options={"api_version": "v1beta"},
            api_key=settings.gemini_api_key
        )

        instructions = build_examiner_instructions(self.exam_context)
        config = types.LiveConnectConfig(
            response_modalities=["AUDIO"],
            system_instruction=types.Content(
                parts=[types.Part.from_text(text=instructions)]
            ),
            speech_config=types.SpeechConfig(
                voice_config=types.VoiceConfig(
                    prebuilt_voice_config=types.PrebuiltVoiceConfig(voice_name=settings.live_voice)
                )
            ),
            media_resolution="MEDIA_RESOLUTION_MEDIUM",
            context_window_compression=types.ContextWindowCompressionConfig(
                trigger_tokens=2500,
                sliding_window=types.SlidingWindow(target_tokens=1200)
            )
        )

        model_name = settings.model_live
        print(f"\n🎙️ Đang kết nối tới Gemini Live ({model_name})...")
        try:
            ws_conn = client.aio.live.connect(model=model_name, config=config)
            session = await ws_conn.__aenter__()
        except Exception as e:
            print(f"⚠️ Thử model {model_name} thất bại ({e}). Đang chuyển sang {settings.model_live_fallback}...")
            model_name = settings.model_live_fallback
            ws_conn = client.aio.live.connect(model=model_name, config=config)
            session = await ws_conn.__aenter__()

        print(f"✅ Đã kết nối thành công tới Giám khảo AI ({model_name})!")
        print(f"📚 Môn: {self.exam_context.get('course_name')} | Thí sinh: {self.exam_context.get('student_name')}")
        print("----------------------------------------------------------------------")
        print("💡 Hãy đeo tai nghe và nói vào micro để trả lời các câu hỏi của Giám khảo.\n")

        self.session = session
        self.audio_in_queue = asyncio.Queue()
        self.out_queue = asyncio.Queue(maxsize=10)

        # Trigger Giám khảo cất tiếng chào
        student_name = self.exam_context.get("student_name", "Sinh viên")
        first_q = self.exam_context.get("questions", [{}])[0].get("question_content", "")
        await session.send(input=f"Thí sinh {student_name} đã vào phòng thi. Hãy chào mừng và đọc Câu hỏi 1: '{first_q}'.", end_of_turn=True)

        try:
            async with asyncio.TaskGroup() as tg:
                tg.create_task(self.send_realtime())
                tg.create_task(self.listen_audio())
                if self.enable_camera:
                    tg.create_task(self.get_frames())
                tg.create_task(self.receive_audio())
                tg.create_task(self.play_audio())
                tg.create_task(self.user_input_monitor())

        except* Exception:
            pass
        finally:
            await ws_conn.__aexit__(None, None, None)
            print("\n----------------------------------------------------------------------")
            print("📝 Đang tiến hành chấm điểm tự động theo Rubric...")
            grade_result = grader_service.grade_exam(self.exam_context, self.transcripts)
            print(f"\n🏆 KẾT QUẢ ĐÁNH GIÁ CA THI:")
            print(f"⭐ Điểm tổng kết: {grade_result.get('final_score')} / 10.0")
            print(f"📋 Nhận xét chung: {grade_result.get('summary_feedback')}")
            for qr in grade_result.get("question_results", []):
                print(f"  - Câu {qr.get('question_id')}: {qr.get('ai_score')} điểm | {qr.get('ai_feedback')}")
            
            # Gửi kết quả về Backend
            payload = {
                "status": "COMPLETED",
                "final_score": grade_result.get("final_score", 0.0),
                "summary_feedback": grade_result.get("summary_feedback", ""),
                "transcripts": self.transcripts,
                "question_results": grade_result.get("question_results", [])
            }
            backend_client.submit_exam_results(self.schedule_id, payload)
            print("✅ Đã hoàn tất phiên thi vấn đáp!")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="AIVES Desktop Standalone Viva Examiner")
    parser.add_argument("--schedule-id", type=str, default="test-session", help="ID ca thi")
    parser.add_argument("--no-camera", action="store_true", help="Tắt camera nếu không có webcam")
    args = parser.parse_args()

    loop = DesktopVivaLoop(schedule_id=args.schedule_id, enable_camera=not args.no_camera)
    asyncio.run(loop.run())
