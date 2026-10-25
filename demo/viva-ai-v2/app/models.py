from datetime import UTC, datetime
from uuid import UUID, uuid4

from pgvector.sqlalchemy import Vector
from sqlalchemy import DateTime, ForeignKey, Index, Integer, Numeric, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column

from app.config import EMBEDDING_DIMENSIONS


def now() -> datetime:
    return datetime.now(UTC)


class Base(DeclarativeBase):
    pass


# ==============================================================================
# MAPPING CÁC BẢNG CHUẨN TỪ SPRING BOOT / POSTGRESQL (DB.sql)
# ==============================================================================

class User(Base):
    """Người dùng / Sinh viên / Giảng viên (Do Spring Boot quản lý, Python chỉ đọc tham chiếu)."""
    __tablename__ = "users"
    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    full_name: Mapped[str] = mapped_column(String(255))
    role: Mapped[str] = mapped_column(String(50))
    student_code: Mapped[str | None] = mapped_column(String(50), nullable=True)
    email: Mapped[str] = mapped_column(Text)


class Course(Base):
    """Môn học (Do Spring Boot quản lý, Python chỉ đọc tham chiếu)."""
    __tablename__ = "courses"
    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    course_code: Mapped[str] = mapped_column(String(50), nullable=False)
    course_name: Mapped[str] = mapped_column(String(255), nullable=False)


class Exam(Base):
    """Kỳ thi (Do Spring Boot quản lý)."""
    __tablename__ = "exams"
    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    course_id: Mapped[UUID] = mapped_column(ForeignKey("courses.id"))
    title: Mapped[str] = mapped_column(String(255))
    start_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    end_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    max_main_questions: Mapped[int] = mapped_column(Integer, default=0)
    max_followup_questions: Mapped[int] = mapped_column(Integer, default=0)
    created_by: Mapped[UUID | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    max_followups_per_main: Mapped[int] = mapped_column(Integer, default=2)
    main_answer_time_limit_seconds: Mapped[int] = mapped_column(Integer, default=120)
    followup_answer_time_limit_seconds: Mapped[int] = mapped_column(Integer, default=60)


class ExamSchedule(Base):
    """Ca thi của sinh viên (Spring Boot xếp lịch, Python AI cập nhật kết quả thi)."""
    __tablename__ = "exam_schedules"
    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    exam_id: Mapped[UUID] = mapped_column(ForeignKey("exams.id"))
    student_id: Mapped[UUID] = mapped_column(ForeignKey("users.id"))
    scheduled_start_time: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    scheduled_end_time: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    status: Mapped[str] = mapped_column(String(50), default="PENDING")
    final_score: Mapped[float | None] = mapped_column(Numeric(5, 2), nullable=True)
    is_connected: Mapped[bool] = mapped_column(default=False)
    full_recording_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    graded_by: Mapped[UUID | None] = mapped_column(nullable=True)
    actual_start_time: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    actual_end_time: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class Question(Base):
    """Câu hỏi trong ngân hàng đề môn học."""
    __tablename__ = "questions"
    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    course_id: Mapped[UUID] = mapped_column(ForeignKey("courses.id"))
    content: Mapped[str] = mapped_column(Text)
    difficulty_level: Mapped[str | None] = mapped_column(String(50), nullable=True)
    topic: Mapped[str | None] = mapped_column(String(255), nullable=True)
    expected_answer: Mapped[str | None] = mapped_column(Text, nullable=True)


class AssignedQuestion(Base):
    """Đề thi bốc thăm đã gán cho ca thi của sinh viên."""
    __tablename__ = "assigned_questions"
    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    exam_schedule_id: Mapped[UUID] = mapped_column(ForeignKey("exam_schedules.id"))
    question_id: Mapped[UUID] = mapped_column(ForeignKey("questions.id"))
    question_order: Mapped[int] = mapped_column(Integer)
    content_snapshot: Mapped[str] = mapped_column(Text)
    assigned_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)


class Transcript(Base):
    """Lịch sử hội thoại phỏng vấn giữa AI và Sinh viên."""
    __tablename__ = "transcripts"
    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    exam_schedule_id: Mapped[UUID] = mapped_column(ForeignKey("exam_schedules.id"), index=True)
    question_id: Mapped[UUID | None] = mapped_column(ForeignKey("questions.id"), nullable=True)
    parent_transcript_id: Mapped[UUID | None] = mapped_column(ForeignKey("transcripts.id"), nullable=True)
    role: Mapped[str] = mapped_column(String(50))  # 'AI' | 'STUDENT'
    text_content: Mapped[str] = mapped_column(Text)
    audio_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    transcript_type: Mapped[str] = mapped_column(String(50), default="MAIN")
    stream_session_id: Mapped[str | None] = mapped_column(String(100), nullable=True)
    speech_duration_ms: Mapped[int | None] = mapped_column(Integer, nullable=True)
    latency_ms: Mapped[int | None] = mapped_column(Integer, nullable=True)


class QuestionResult(Base):
    """Kết quả chấm điểm chi tiết từng câu hỏi của AI."""
    __tablename__ = "question_results"
    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    exam_schedule_id: Mapped[UUID] = mapped_column(ForeignKey("exam_schedules.id"), index=True)
    question_id: Mapped[UUID] = mapped_column(ForeignKey("questions.id"))
    ai_score: Mapped[float | None] = mapped_column(Numeric(5, 2), nullable=True)
    ai_feedback: Mapped[str | None] = mapped_column(Text, nullable=True)
    max_score: Mapped[float] = mapped_column(Numeric(5, 2), default=10.0)
    lecturer_score: Mapped[float | None] = mapped_column(Numeric(5, 2), nullable=True)
    lecturer_feedback: Mapped[str | None] = mapped_column(Text, nullable=True)
    graded_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)


# ==============================================================================
# CÁC BẢNG DÀNH RIÊNG CHO AI RAG & RUBRIC (Tránh xung đột tên bảng)
# ==============================================================================

class AiDocument(Base):
    """Tài liệu giáo trình nạp cho RAG môn học."""
    __tablename__ = "ai_documents"
    __table_args__ = (UniqueConstraint("course_id", "sha256", "embedding_model"),)
    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    course_id: Mapped[UUID] = mapped_column(ForeignKey("courses.id"), index=True)
    filename: Mapped[str] = mapped_column(String(255))
    sha256: Mapped[str] = mapped_column(String(64))
    embedding_model: Mapped[str] = mapped_column(String(120))
    chunk_count: Mapped[int] = mapped_column(Integer)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)


class AiDocumentChunk(Base):
    """Các đoạn văn bản băm nhỏ kèm vector embedding phục vụ cosine search."""
    __tablename__ = "ai_document_chunks"
    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    document_id: Mapped[UUID] = mapped_column(ForeignKey("ai_documents.id"), index=True)
    course_id: Mapped[UUID] = mapped_column(ForeignKey("courses.id"), index=True)
    position: Mapped[int] = mapped_column(Integer)
    page: Mapped[int | None] = mapped_column(Integer, nullable=True)
    text: Mapped[str] = mapped_column(Text)
    embedding: Mapped[list[float]] = mapped_column(Vector(EMBEDDING_DIMENSIONS))


class Rubric(Base):
    """Tiêu chí đánh giá vấn đáp (Rubric) theo môn học."""
    __tablename__ = "rubrics"
    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    course_id: Mapped[UUID] = mapped_column(ForeignKey("courses.id"), index=True)
    title: Mapped[str] = mapped_column(String(150))
    data: Mapped[dict] = mapped_column(JSONB)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)


class VoiceSessionState(Base):
    """Trạng thái đàm thoại trực tiếp giữa Gemini Live và phòng thi sinh viên."""
    __tablename__ = "ai_voice_sessions"
    schedule_id: Mapped[UUID] = mapped_column(ForeignKey("exam_schedules.id"), primary_key=True)
    live_model: Mapped[str] = mapped_column(String(120))
    state: Mapped[dict] = mapped_column(JSONB, default=dict)
