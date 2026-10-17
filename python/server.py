import asyncio
import json
import logging
from pathlib import Path

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, JSONResponse

from config import settings
from services.backend_client import backend_client
from viva_core import VivaLiveSession

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("aives.server")

app = FastAPI(title="AIVES Viva High-Performance Bridge", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

HTML_CLIENT_PATH = Path(__file__).parent / "web_client" / "index.html"

@app.get("/health")
async def health():
    return {
        "status": "online",
        "model_live": settings.model_live,
        "model_live_fallback": settings.model_live_fallback,
        "model_grading": settings.model_grading,
        "voice": settings.live_voice
    }

@app.get("/", response_class=HTMLResponse)
async def serve_test_client():
    """Phục vụ giao diện Web Test Harness để kiểm thử ngay trên trình duyệt mà chưa cần Mobile App."""
    if HTML_CLIENT_PATH.exists():
        return HTMLResponse(content=HTML_CLIENT_PATH.read_text(encoding="utf-8"))
    return HTMLResponse("<h1>AIVES Viva Bridge Server đang hoạt động</h1><p>Truy cập WebSocket tại: /ws/viva/{scheduleId}</p>")


@app.websocket("/ws/viva/{schedule_id}")
async def websocket_viva_endpoint(websocket: WebSocket, schedule_id: str):
    """
    WebSocket Endpoint hiệu năng cao phục vụ ứng dụng Flutter Mobile & Web Client:
    - Nhận Binary Frames: Luồng Audio PCM 16kHz từ Micro của thí sinh.
    - Nhận JSON Messages: Ảnh camera dạng JPEG base64 (Proctoring) hoặc sự kiện 'finish_exam'.
    - Gửi Binary Frames: Luồng Audio PCM 24kHz từ Giám khảo AI phát ra loa thí sinh.
    - Gửi JSON Messages: Phụ đề chữ chạy thời gian thực ('subtitle_delta') & Kết quả thi ('exam_completed').
    """
    await websocket.accept()
    logger.info(f"Client đã kết nối WebSocket cho ca thi: {schedule_id}")

    # 1. Lấy context ca thi (từ Spring Boot Backend hoặc Mock Fallback)
    exam_context = backend_client.get_exam_context(schedule_id)
    
    # Gửi thông tin đề thi ban đầu cho Client
    await websocket.send_json({
        "event": "exam_info",
        "data": {
            "schedule_id": schedule_id,
            "course_name": exam_context.get("course_name"),
            "student_name": exam_context.get("student_name"),
            "question_count": len(exam_context.get("questions", []))
        }
    })

    # Callbacks gửi dữ liệu ngược về Flutter / Web
    async def handle_audio_out(pcm_bytes: bytes):
        try:
            await websocket.send_bytes(pcm_bytes)
        except Exception:
            pass

    async def handle_subtitle(role: str, text: str, is_interim: bool = False):
        try:
            await websocket.send_json({
                "event": "subtitle_delta",
                "role": role,
                "text": text,
                "is_interim": is_interim
            })
        except Exception:
            pass

    async def handle_turn_complete():
        try:
            await websocket.send_json({"event": "turn_complete"})
        except Exception:
            pass

    async def handle_interrupted():
        try:
            await websocket.send_json({"event": "interrupted"})
        except Exception:
            pass

    # 2. Khởi tạo phiên Gemini Live (Pure Audio Mode)
    session = VivaLiveSession(
        schedule_id=schedule_id,
        exam_context=exam_context,
        on_audio_out=handle_audio_out,
        on_subtitle=handle_subtitle,
        on_turn_complete=handle_turn_complete,
        on_interrupted=handle_interrupted
    )

    audio_chunks_received = 0
    total_audio_bytes = 0

    try:
        await session.start()
        await websocket.send_json({"event": "examiner_ready"})

        # Vòng lặp nhận dữ liệu liên tục từ Client (Flutter / Web)
        while True:
            message = await websocket.receive()
            if "bytes" in message and message["bytes"]:
                # Binary Frame = PCM audio 16kHz từ mic của thí sinh
                pcm_data = message["bytes"]
                audio_chunks_received += 1
                total_audio_bytes += len(pcm_data)
                if audio_chunks_received % 100 == 1:
                    logger.info(f"Mic Streaming: đã nhận {audio_chunks_received} audio chunks ({total_audio_bytes / 1024:.1f} KB) từ thí sinh")
                await session.send_audio_chunk(pcm_data)

            elif "text" in message and message["text"]:
                try:
                    payload = json.loads(message["text"])
                    event_type = payload.get("event")

                    # Thí sinh hoặc Client bấm kết thúc ca thi
                    if event_type == "finish_exam":
                        logger.info(f"Nhận yêu cầu kết thúc ca thi từ Client {schedule_id}")
                        break

                except Exception as json_err:
                    logger.warning(f"Lỗi parse text message: {json_err}")

    except WebSocketDisconnect:
        logger.info(f"Client đã ngắt kết nối WebSocket ca thi: {schedule_id}")
    except Exception as e:
        logger.error(f"Lỗi phiên WebSocket ca thi {schedule_id}: {e}")
    finally:
        logger.info(f"Đang tiến hành chấm điểm ca thi {schedule_id}...")
        try:
            grading_result = await session.stop_and_grade()
            # Bắn kết quả chấm điểm cuối cùng trước khi đóng
            await websocket.send_json({
                "event": "exam_completed",
                "schedule_id": schedule_id,
                "result": grading_result
            })
        except Exception as grade_err:
            logger.error(f"Lỗi khi hoàn tất chấm điểm: {grade_err}")


if __name__ == "__main__":
    import uvicorn
    logger.info(f"=== AIVES Viva High-Performance Bridge đang khởi động tại http://{settings.host}:{settings.port} ===")
    uvicorn.run("server:app", host=settings.host, port=settings.port, reload=False)
