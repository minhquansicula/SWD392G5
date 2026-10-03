import asyncio
import json
import logging
from contextlib import asynccontextmanager, suppress
from pathlib import Path
from urllib.parse import urlparse
from uuid import UUID

from fastapi import FastAPI, File, Request, UploadFile, WebSocket, WebSocketDisconnect
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.responses import FileResponse, JSONResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from pydantic import ValidationError
from sqlalchemy import select
from sqlalchemy.exc import SQLAlchemyError
from starlette.concurrency import run_in_threadpool
from starlette.middleware.trustedhost import TrustedHostMiddleware

from app.config import get_settings
from app.database import Database
from app.documents import IngestionService, document_dict
from app.errors import AppError
from app.gemini import GeminiGateway
from app.interview import InterviewService, encode, interview_dict
from app.models import Course, Document, Interview, Rubric
from app.prompts import RUBRIC_SYSTEM
from app.retrieval import RetrievalService
from app.schemas import CourseCreate, RubricData, SessionCreate, TurnRequest

logger = logging.getLogger("viva")
ROOT = Path(__file__).resolve().parent


def create_app(settings=None, gateway=None) -> FastAPI:
    settings = settings or get_settings()
    database = Database(settings)
    provider = gateway or GeminiGateway(settings)
    retrieval = RetrievalService(database, provider, settings.retrieval_top_k)
    ingestion = IngestionService(database, provider, settings)
    interviews = InterviewService(database, provider, retrieval, settings)

    @asynccontextmanager
    async def lifespan(app):
        app.state.db_ready = False
        try:
            await database.initialize()
            app.state.db_ready = True
        except Exception as exc:
            logger.warning(
                "Database unavailable on startup (%s). Start PostgreSQL and restart.",
                type(exc).__name__,
            )
        yield
        await provider.close()
        await database.close()

    app = FastAPI(title="Viva AI Interview API", version="0.1.0", lifespan=lifespan)
    app.state.database, app.state.interviews, app.state.gateway = database, interviews, provider
    app.add_middleware(
        TrustedHostMiddleware, allowed_hosts=["localhost", "127.0.0.1", "[::1]", "testserver"]
    )

    @app.middleware("http")
    async def local_origin(request: Request, call_next):
        origin = request.headers.get("origin")
        if request.method not in ("GET", "HEAD", "OPTIONS") and origin:
            if urlparse(origin).netloc != request.headers.get("host"):
                return JSONResponse({"detail": "Origin không hợp lệ."}, status_code=403)
        if request.url.path.startswith("/api/v1/") and not app.state.db_ready:
            return JSONResponse(
                {
                    "detail": "Chưa kết nối PostgreSQL. Chạy docker compose up -d db rồi khởi động lại ứng dụng."
                },
                status_code=503,
            )
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["Referrer-Policy"] = "same-origin"
        response.headers["Content-Security-Policy"] = (
            "default-src 'self'; style-src 'self'; script-src 'self'; connect-src 'self'; img-src 'self' data:; frame-ancestors 'none'; base-uri 'self'"
        )
        return response

    @app.exception_handler(AppError)
    async def handle_app_error(request, error):
        return JSONResponse({"detail": error.message, "code": error.code}, status_code=error.status)

    @app.exception_handler(RequestValidationError)
    async def handle_validation(request, error):
        issues = [
            {"field": ".".join(map(str, e["loc"])), "message": e["msg"]} for e in error.errors()
        ]
        return JSONResponse({"detail": "Dữ liệu chưa hợp lệ.", "issues": issues}, status_code=422)

    @app.exception_handler(SQLAlchemyError)
    async def handle_db_error(request, error):
        logger.warning("Database operation failed (%s)", type(error).__name__)
        return JSONResponse(
            {"detail": "Không truy cập được dữ liệu. Kiểm tra PostgreSQL rồi thử lại."},
            status_code=503,
        )

    @app.get("/health")
    async def health():
        connected = app.state.db_ready
        if connected:
            try:
                await database.ping()
            except Exception:
                connected = False
        return {
            "database": connected,
            "gemini_configured": bool(settings.gemini_api_key.get_secret_value()),
            "model": settings.gemini_model,
            "embedding_model": settings.gemini_embedding_model,
            "embedding_dimensions": 768,
        }

    @app.get("/api/v1/courses")
    async def list_courses():
        async with database.sessions() as db:
            rows = (await db.scalars(select(Course).order_by(Course.created_at.desc()))).all()
            return [{"id": str(c.id), "name": c.name} for c in rows]

    @app.post("/api/v1/courses", status_code=201)
    async def create_course(body: CourseCreate):
        async with database.sessions() as db:
            course = Course(name=body.name)
            db.add(course)
            await db.commit()
            return {"id": str(course.id), "name": course.name}

    @app.get("/api/v1/courses/{course_id}/documents")
    async def list_documents(course_id: UUID):
        async with database.sessions() as db:
            rows = (
                await db.scalars(
                    select(Document)
                    .where(Document.course_id == course_id)
                    .order_by(Document.created_at.desc())
                )
            ).all()
            return [document_dict(d) for d in rows]

    async def read_upload(file):
        try:
            data = await file.read(settings.max_upload_bytes + 1)
            if len(data) > settings.max_upload_bytes:
                raise AppError("File vượt giới hạn 10 MB.", 413)
            if not data:
                raise AppError("File rỗng.")
            return data
        finally:
            await file.close()

    @app.post("/api/v1/courses/{course_id}/documents", status_code=201)
    async def upload_document(course_id: UUID, file: UploadFile = File(...)):
        return await ingestion.ingest(
            course_id, file.filename or "document.txt", await read_upload(file)
        )

    @app.post("/api/v1/rubrics/preview")
    async def preview_rubric(file: UploadFile = File(...)):
        filename, data = file.filename or "rubric.txt", await read_upload(file)
        if filename.lower().endswith(".json"):
            try:
                return RubricData.model_validate_json(data).model_dump()
            except (ValidationError, ValueError) as exc:
                raise AppError("JSON rubric chưa đúng mẫu hoặc tổng trọng số khác 100%.") from exc
        pages = await run_in_threadpool(
            ingestion.parser.parse, filename, data, settings.max_rubric_chars
        )
        result = await provider.structured(RubricData, RUBRIC_SYSTEM, encode({"document": pages}))
        return result.model_dump()

    @app.get("/api/v1/courses/{course_id}/rubrics")
    async def list_rubrics(course_id: UUID):
        async with database.sessions() as db:
            rows = (
                await db.scalars(
                    select(Rubric)
                    .where(Rubric.course_id == course_id)
                    .order_by(Rubric.created_at.desc())
                )
            ).all()
            return [{"id": str(r.id), **r.data} for r in rows]

    @app.post("/api/v1/courses/{course_id}/rubrics", status_code=201)
    async def save_rubric(course_id: UUID, body: RubricData):
        async with database.sessions() as db:
            if not await db.get(Course, course_id):
                raise AppError("Không tìm thấy môn học.", 404)
            rubric = Rubric(course_id=course_id, title=body.title, data=body.model_dump())
            db.add(rubric)
            await db.commit()
            return {"id": str(rubric.id), **rubric.data}

    @app.get("/api/v1/sessions")
    async def list_sessions(course_id: UUID):
        async with database.sessions() as db:
            rows = (
                await db.scalars(
                    select(Interview)
                    .where(Interview.course_id == course_id)
                    .order_by(Interview.created_at.desc())
                    .limit(100)
                )
            ).all()
            return [interview_dict(i) for i in rows]

    @app.post("/api/v1/sessions", status_code=201)
    async def create_session(body: SessionCreate):
        return await interviews.create(body)

    @app.get("/api/v1/sessions/{interview_id}")
    async def get_session(interview_id: UUID):
        return await interviews.detail(interview_id)

    async def safe_events(interview_id, body):
        terminal_event = None
        try:
            async for event in interviews.turn(interview_id, body):
                if event["type"] == "done":
                    terminal_event = event
                else:
                    yield event
        except AppError as exc:
            terminal_event = {"type": "error", "message": exc.message, "code": exc.code}
        except Exception as exc:
            logger.warning("Turn failed (%s)", type(exc).__name__)
            terminal_event = {
                "type": "error",
                "message": "Lượt hỏi chưa hoàn thành. Hãy thử lại để tiếp tục.",
                "code": "internal_error",
            }
        if terminal_event:
            yield terminal_event

    @app.post("/api/v1/sessions/{interview_id}/turns")
    async def stream_turn(interview_id: UUID, body: TurnRequest):
        """HTTP SSE alternative for Spring WebClient. Errors after headers are SSE events."""
        await interviews.detail(interview_id)

        async def events():
            iterator = safe_events(interview_id, body).__aiter__()
            task = None
            try:
                while True:
                    if task is None:
                        task = asyncio.create_task(anext(iterator))
                    done, _ = await asyncio.wait({task}, timeout=15)
                    if not done:
                        yield ": heartbeat\n\n"
                        continue
                    try:
                        event = task.result()
                    except StopAsyncIteration:
                        break
                    task = None
                    yield f"event: {event['type']}\ndata: {encode(event)}\n\n"
            finally:
                if task and not task.done():
                    task.cancel()
                    with suppress(asyncio.CancelledError, StopAsyncIteration):
                        await task
                await iterator.aclose()

        return StreamingResponse(
            events(),
            media_type="text/event-stream",
            headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
        )

    @app.post("/api/v1/sessions/{interview_id}/finish")
    async def finish_session(interview_id: UUID):
        return await interviews.finish(interview_id)

    @app.get("/api/v1/sessions/{interview_id}/export")
    async def export_session(interview_id: UUID):
        data = await interviews.detail(interview_id)
        return JSONResponse(
            jsonable_encoder(data),
            headers={"Content-Disposition": f'attachment; filename="viva-{interview_id}.json"'},
        )

    @app.websocket("/ws/sessions/{interview_id}")
    async def interview_socket(websocket: WebSocket, interview_id: UUID):
        origin = websocket.headers.get("origin")
        if origin and urlparse(origin).netloc != websocket.headers.get("host"):
            await websocket.close(code=1008)
            return
        if not app.state.db_ready:
            await websocket.close(code=1013)
            return
        await websocket.accept()
        active_task = None
        send_lock = asyncio.Lock()
        ready_for_next = asyncio.Event()
        ready_for_next.set()

        async def send(event):
            async with send_lock:
                await websocket.send_json(event)

        async def run_turn(body):
            terminal_event = None
            async for event in safe_events(interview_id, body):
                if event["type"] in ("done", "error"):
                    terminal_event = event
                else:
                    await send(event)
            # Release the generator's DB lock before announcing completion.
            ready_for_next.set()
            if terminal_event:
                await send(terminal_event)

        async def run_finish():
            try:
                await send({"type": "status", "message": "Đang đối chiếu câu trả lời với rubric…"})
                report = await interviews.finish(interview_id)
                terminal_event = {"type": "report", "report": report}
            except AppError as exc:
                terminal_event = {"type": "error", "message": exc.message, "code": exc.code}
            except Exception as exc:
                logger.warning("Grading failed (%s)", type(exc).__name__)
                terminal_event = {
                        "type": "error",
                        "message": "Chưa thể chấm điểm. Hãy thử lại.",
                        "code": "internal_error",
                    }
            ready_for_next.set()
            await send(terminal_event)

        try:
            await send({"type": "snapshot", "session": await interviews.detail(interview_id)})
            while True:
                raw = await websocket.receive_text()
                if len(raw) > 30000:
                    await send(
                        {"type": "error", "message": "Tin nhắn quá dài.", "code": "validation"}
                    )
                    continue
                try:
                    data = json.loads(raw)
                    if not isinstance(data, dict):
                        raise ValueError()
                    kind = data.pop("type", "turn")
                    if kind == "ping":
                        await send({"type": "pong"})
                        continue
                    if kind == "cancel":
                        if active_task and not active_task.done():
                            active_task.cancel()
                            with suppress(asyncio.CancelledError):
                                await active_task
                        await send(
                            {
                                "type": "error",
                                "message": "Đã dừng sinh câu hỏi. Câu trả lời vẫn được lưu; chọn Thử lại để tiếp tục.",
                                "code": "cancelled",
                            }
                        )
                        continue
                    if active_task and not active_task.done():
                        if ready_for_next.is_set():
                            await active_task
                        else:
                            await send({"type": "busy", "message": "Đang xử lý lượt hiện tại."})
                            continue
                    if active_task:
                        with suppress(asyncio.CancelledError):
                            active_task.result()
                    if kind == "finish":
                        ready_for_next.clear()
                        active_task = asyncio.create_task(run_finish())
                    elif kind == "turn":
                        body = TurnRequest.model_validate(data)
                        ready_for_next.clear()
                        active_task = asyncio.create_task(
                            run_turn(body)
                        )
                    else:
                        raise ValueError()
                except (ValueError, ValidationError):
                    await send(
                        {"type": "error", "message": "Tin nhắn chưa hợp lệ.", "code": "validation"}
                    )
        except AppError as exc:
            with suppress(Exception):
                await send({"type": "error", "message": exc.message, "code": exc.code})
        except (WebSocketDisconnect, RuntimeError):
            pass
        finally:
            if active_task and not active_task.done():
                active_task.cancel()
            if active_task:
                with suppress(asyncio.CancelledError, Exception):
                    await active_task

    @app.get("/")
    async def index():
        return FileResponse(ROOT / "static" / "index.html")

    app.mount("/static", StaticFiles(directory=ROOT / "static"), name="static")
    app.mount("/examples", StaticFiles(directory=ROOT / "examples"), name="examples")
    return app


app = create_app()
