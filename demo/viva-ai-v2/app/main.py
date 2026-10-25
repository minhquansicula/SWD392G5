import asyncio
import logging
import sys

if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    try:
        import uvicorn.loops.asyncio
        uvicorn.loops.asyncio.asyncio_loop_factory = lambda use_subprocess=False: asyncio.SelectorEventLoop
        import uvicorn.loops.auto
        uvicorn.loops.auto.auto_loop_factory = lambda use_subprocess=False: asyncio.SelectorEventLoop
    except Exception:
        pass
from contextlib import asynccontextmanager, suppress
from pathlib import Path
from uuid import UUID

from fastapi import FastAPI, File, Request, UploadFile, WebSocket, WebSocketDisconnect
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import ValidationError
from sqlalchemy import delete, select
from sqlalchemy.exc import SQLAlchemyError
from starlette.concurrency import run_in_threadpool

from app.config import get_settings
from app.database import Database
from app.documents import IngestionService, document_dict
from app.errors import AppError
from app.gemini import GeminiGateway
from app.interview import InterviewService, encode
from app.live_interview import VoiceRoom
from app.models import AiDocument, AiDocumentChunk, Course, ExamSchedule, Rubric
from app.prompts import QUESTION_GENERATOR_SYSTEM, RUBRIC_SYSTEM
from app.retrieval import RetrievalService
from app.schemas import GenerateQuestionsRequest, GeneratedQuestionsResponse, RubricData


logger = logging.getLogger("viva-ai")


def create_app(settings=None, gateway=None) -> FastAPI:
    settings = settings or get_settings()
    database = Database(settings)
    provider = gateway or GeminiGateway(settings)
    retrieval = RetrievalService(database, provider, settings.retrieval_top_k)
    ingestion = IngestionService(database, provider, settings)
    interviews = InterviewService(database, provider, retrieval, settings)

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        app.state.db_ready = False
        try:
            await database.initialize()
            app.state.db_ready = True
            logger.info("AI Service connected to database successfully.")
        except Exception as exc:
            logger.warning("Database unavailable on startup: %s", exc)
        yield
        await provider.close()
        await database.close()

    app = FastAPI(
        title="AIVES — AI Oral Viva Voce Engine",
        description="Microservice chuyên trách AI: Gemini Live Audio Duplex, RAG pgvector và Chấm điểm Rubric",
        version="2.0.0",
        lifespan=lifespan,
    )
    app.state.database = database
    app.state.interviews = interviews
    app.state.gateway = provider

    # Cấu hình CORS mở cho Frontend React (localhost:5173) và Spring Boot (localhost:8080)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.exception_handler(AppError)
    async def handle_app_error(request: Request, error: AppError):
        return JSONResponse({"detail": error.message, "code": error.code}, status_code=error.status)

    @app.exception_handler(RequestValidationError)
    async def handle_validation(request: Request, error: RequestValidationError):
        issues = [
            {"field": ".".join(map(str, e["loc"])), "message": e["msg"]} for e in error.errors()
        ]
        return JSONResponse({"detail": "Dữ liệu không hợp lệ.", "issues": issues}, status_code=422)

    @app.exception_handler(SQLAlchemyError)
    async def handle_db_error(request: Request, error: SQLAlchemyError):
        logger.warning("Database operation failed: %s", type(error).__name__)
        return JSONResponse(
            {"detail": "Lỗi truy cập cơ sở dữ liệu PostgreSQL. Vui lòng kiểm tra kết nối."},
            status_code=503,
        )

    # ==========================================================================
    # 1. HEALTH CHECK
    # ==========================================================================
    @app.get("/health")
    async def health():
        connected = app.state.db_ready
        if connected:
            try:
                await database.ping()
            except Exception:
                connected = False
        return {
            "status": "UP" if connected else "DEGRADED",
            "database_connected": connected,
            "gemini_live_model": settings.gemini_live_model,
            "gemini_grading_model": settings.gemini_model,
            "embedding_model": settings.gemini_embedding_model,
            "embedding_dimensions": 768,
        }

    # ==========================================================================
    # 2. RAG KNOWLEDGE BASE (Nạp và Quản lý tài liệu giáo trình)
    # ==========================================================================
    async def read_upload(file: UploadFile) -> bytes:
        try:
            data = await file.read(settings.max_upload_bytes + 1)
            if len(data) > settings.max_upload_bytes:
                raise AppError(f"File vượt quá giới hạn {settings.max_upload_bytes // (1024*1024)}MB.", 413)
            if not data:
                raise AppError("File rỗng.")
            return data
        finally:
            await file.close()

    @app.get("/api/v1/courses/{course_id}/documents")
    async def list_course_documents(course_id: UUID):
        """Lấy danh sách các tài liệu đã nạp cho môn học."""
        async with database.sessions() as db:
            rows = (
                await db.scalars(
                    select(AiDocument)
                    .where(AiDocument.course_id == course_id)
                    .order_by(AiDocument.created_at.desc())
                )
            ).all()
            return [document_dict(d) for d in rows]

    @app.get("/api/v1/courses")
    async def list_courses():
        """Lấy danh sách môn học từ cơ sở dữ liệu."""
        async with database.sessions() as db:
            rows = (await db.scalars(select(Course).order_by(Course.course_code))).all()
            return [
                {
                    "id": str(c.id),
                    "course_code": c.course_code,
                    "courseCode": c.course_code,
                    "course_name": c.course_name,
                    "courseName": c.course_name,
                }
                for c in rows
            ]

    @app.post("/api/v1/courses/{course_id}/documents", status_code=201)
    async def upload_course_document(course_id: UUID, file: UploadFile = File(...)):
        """Upload giáo trình môn học (PDF/DOCX/TXT/MD), phân đoạn và nhúng vector pgvector."""
        return await ingestion.ingest(
            course_id, file.filename or "document.txt", await read_upload(file)
        )

    @app.delete("/api/v1/courses/{course_id}/documents/{document_id}")
    async def delete_course_document(course_id: UUID, document_id: UUID):
        """Xóa tài liệu giáo trình và toàn bộ vector embedding liên quan."""
        async with database.sessions() as db:
            doc = await db.get(AiDocument, document_id)
            if not doc or doc.course_id != course_id:
                raise AppError("Không tìm thấy tài liệu tương ứng.", 404)
            await db.execute(
                delete(AiDocumentChunk).where(
                    AiDocumentChunk.document_id == document_id,
                    AiDocumentChunk.course_id == course_id,
                )
            )
            await db.execute(
                delete(AiDocument).where(
                    AiDocument.id == document_id,
                    AiDocument.course_id == course_id,
                )
            )
            await db.commit()
            return {
                "success": True,
                "message": "Đã xóa tài liệu và các vector chunks thành công.",
                "deleted_id": str(document_id),
            }

    # ==========================================================================
    # 3. RUBRIC ENGINE (Trích xuất & Lưu tiêu chí chấm thi)
    # ==========================================================================
    @app.post("/api/v1/rubrics/preview")
    async def preview_rubric(file: UploadFile = File(...)):
        """Dùng Gemini phân tích file Rubric (Markdown, PDF, DOCX, JSON) thành cấu trúc JSON chuẩn."""
        filename, data = file.filename or "rubric.txt", await read_upload(file)
        if filename.lower().endswith(".json"):
            try:
                return RubricData.model_validate_json(data).model_dump()
            except (ValidationError, ValueError) as exc:
                raise AppError("File JSON rubric không đúng mẫu hoặc tổng trọng số khác 100%.") from exc
        pages = await run_in_threadpool(
            ingestion.parser.parse, filename, data, settings.max_rubric_chars
        )
        result = await provider.structured(RubricData, RUBRIC_SYSTEM, encode({"document": pages}))
        return result.model_dump()

    @app.get("/api/v1/courses/{course_id}/rubrics")
    async def list_course_rubrics(course_id: UUID):
        """Lấy danh sách rubric của môn học."""
        async with database.sessions() as db:
            rows = (
                await db.scalars(
                    select(Rubric)
                    .where(Rubric.course_id == course_id)
                    .order_by(Rubric.created_at.desc())
                )
            ).all()
            return [{"id": str(r.id), "title": r.title, **r.data} for r in rows]

    @app.post("/api/v1/courses/{course_id}/rubrics", status_code=201)
    async def save_course_rubric(course_id: UUID, body: RubricData):
        """Lưu rubric cho môn học."""
        async with database.sessions() as db:
            if not await db.get(Course, course_id):
                raise AppError("Không tìm thấy môn học tương ứng.", 404)
            rubric = Rubric(course_id=course_id, title=body.title, data=body.model_dump())
            db.add(rubric)
            await db.commit()
            return {"id": str(rubric.id), "title": rubric.title, **rubric.data}

    @app.delete("/api/v1/courses/{course_id}/rubrics/{rubric_id}")
    async def delete_course_rubric(course_id: UUID, rubric_id: UUID):
        """Xóa tiêu chí rubric của môn học."""
        async with database.sessions() as db:
            rubric = await db.get(Rubric, rubric_id)
            if not rubric or rubric.course_id != course_id:
                raise AppError("Không tìm thấy rubric tương ứng.", 404)
            await db.execute(
                delete(Rubric).where(
                    Rubric.id == rubric_id,
                    Rubric.course_id == course_id,
                )
            )
            await db.commit()
            return {
                "success": True,
                "message": "Đã xóa rubric thành công.",
                "deleted_id": str(rubric_id),
            }

    # ==========================================================================
    # 3.1. AI QUESTION GENERATOR (Sinh câu hỏi từ Học liệu & Rubric)
    # ==========================================================================
    @app.post("/api/v1/courses/{course_id}/generate-questions", response_model=GeneratedQuestionsResponse)
    async def generate_course_questions(course_id: UUID, body: GenerateQuestionsRequest):
        """Dùng Gemini đọc học liệu và rubric của môn học để sinh câu hỏi gợi ý cho giáo viên."""
        async with database.sessions() as db:
            course = await db.get(Course, course_id)
            if not course:
                raise AppError("Không tìm thấy môn học tương ứng.", 404)

            # Lấy Rubric môn học
            rubric_row = (
                await db.scalars(
                    select(Rubric)
                    .where(Rubric.course_id == course_id)
                    .order_by(Rubric.created_at.desc())
                    .limit(1)
                )
            ).first()

            # Lấy các chunk học liệu tiêu biểu
            chunks = (
                await db.scalars(
                    select(AiDocumentChunk.text)
                    .where(AiDocumentChunk.course_id == course_id)
                    .order_by(AiDocumentChunk.position.asc())
                    .limit(25)
                )
            ).all()


            if not rubric_row and not chunks:
                raise AppError(
                    "Môn học chưa có tài liệu học tập hoặc rubric chấm điểm. Vui lòng tải tài liệu lên trước.",
                    400,
                    "NO_MATERIAL_FOUND",
                )

            # Phân bổ độ khó
            n = body.count
            diff_mode = (body.difficulty or "BALANCED").upper()
            if diff_mode == "EASY":
                n_easy, n_med, n_hard = max(1, round(n * 0.7)), max(0, n - round(n * 0.7)), 0
            elif diff_mode == "HARD":
                n_easy, n_med, n_hard = 0, max(0, n - round(n * 0.7)), max(1, round(n * 0.7))
            else:  # BALANCED
                n_easy = max(1, round(n * 0.3))
                n_hard = max(1, round(n * 0.2))
                n_med = max(0, n - n_easy - n_hard)

            context_payload = {
                "course_code": course.course_code,
                "course_name": course.course_name,
                "required_count": n,
                "difficulty_distribution": {
                    "EASY": n_easy,
                    "MEDIUM": n_med,
                    "HARD": n_hard,
                },
                "topic_focus": body.topic_hint or "Toàn bộ kiến thức trong giáo trình môn học",
                "rubric": rubric_row.data if rubric_row else "Chưa có rubric riêng; hãy biên soạn theo chuẩn môn học",
                "document_excerpts": list(chunks[:20]) if chunks else ["Kiến thức tiêu chuẩn môn học"],
            }

            user_prompt = (
                f"Hãy biên soạn chính xác {n} câu hỏi vấn đáp chính cho môn học [{course.course_code}] {course.course_name}.\n"
                f"Mục tiêu độ khó: {n_easy} câu EASY, {n_med} câu MEDIUM, {n_hard} câu HARD.\n\n"
                f"DỮ LIỆU HỌC LIỆU & TIÊU CHÍ:\n{encode(context_payload)}"
            )

            try:
                result = await provider.structured(
                    GeneratedQuestionsResponse,
                    QUESTION_GENERATOR_SYSTEM,
                    user_prompt,
                )
                result.course_id = str(course.id)
                result.course_name = course.course_name
                result.total_generated = len(result.questions)
                return result

            except Exception as exc:
                logger.exception("Failed to generate questions: %s", exc)
                raise


    # ==========================================================================
    # 4. GEMINI LIVE DUPLEX AUDIO WEBSOCKET (Phòng thi trực tiếp)
    # ==========================================================================

    @app.websocket("/ws/live/sessions/{schedule_id}")
    async def live_audio_socket(websocket: WebSocket, schedule_id: UUID):
        """Kết nối WebSocket Audio hai chiều giữa thí sinh và Gemini Live."""
        await websocket.accept()
        try:
            if not app.state.db_ready:
                raise AppError("Cơ sở dữ liệu chưa sẵn sàng.", 503)
            room = VoiceRoom(interviews, websocket, schedule_id)
            await room.run()
        except WebSocketDisconnect:
            logger.info("Thí sinh đã ngắt kết nối WebSocket: %s", schedule_id)
        except Exception as exc:
            logger.warning("Voice room lỗi: %s", type(exc).__name__)
            message = exc.message if isinstance(exc, AppError) else (
                "Lỗi kết nối Gemini Live. Vui lòng kiểm tra microphone, API key hoặc kết nối mạng."
            )
            with suppress(Exception):
                await websocket.send_json({"type": "error", "message": message})
        finally:
            with suppress(Exception):
                await websocket.close()

    # ==========================================================================
    # 5. GRADING & EXAMINATION RESULT (Chấm điểm & Lấy báo cáo)
    # ==========================================================================
    @app.get("/api/v1/sessions/{schedule_id}")
    async def get_session_detail(schedule_id: UUID):
        """Lấy chi tiết ca thi, danh sách câu hỏi đề thi và transcript đã lưu."""
        return await interviews.detail(schedule_id)

    @app.post("/api/v1/sessions/{schedule_id}/finish")
    async def finish_and_grade(schedule_id: UUID):
        """Kích hoạt AI chấm điểm toàn bộ ca thi dựa trên transcript và Rubric."""
        return await interviews.finish(schedule_id)

    @app.get("/api/v1/sessions/{schedule_id}/export")
    async def export_report(schedule_id: UUID):
        """Xuất file JSON báo cáo chi tiết buổi thi."""
        data = await interviews.detail(schedule_id)
        return JSONResponse(
            jsonable_encoder(data),
            headers={"Content-Disposition": f'attachment; filename="viva-report-{schedule_id}.json"'},
        )

    return app


app = create_app()
