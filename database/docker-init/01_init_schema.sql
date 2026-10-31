-- ==============================================================================
-- AIVES (AI Viva Examination System) - Docker Database Schema Initialization
-- Automatically executed by PostgreSQL container upon startup
-- ==============================================================================

-- 1. Kích hoạt các Extensions bắt buộc
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. Đảm bảo schema public sạch sẽ khi khởi động
DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;

CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ==============================================================================
-- 3. ĐỊNH NGHĨA CÁC BẢNG HỆ THỐNG
-- ==============================================================================

-- Bảng Người dùng (Quản trị viên, Giảng viên, Sinh viên)
CREATE TABLE "users" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "password_hash" varchar(255) NOT NULL,
    "full_name" varchar(255) NOT NULL,
    "role" varchar(50) NOT NULL,
    "created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
    "student_code" varchar(50) UNIQUE,
    "email" text NOT NULL UNIQUE,
    "email_normalized" text NOT NULL UNIQUE,
    "password_set_at" timestamp with time zone,
    "password_token_hash" varchar(64) UNIQUE,
    "password_token_expires_at" timestamp with time zone,
    "password_mail_status" varchar(20),
    "is_system_admin" boolean DEFAULT false NOT NULL,
    CONSTRAINT "users_role_check" CHECK (role IN ('ADMIN', 'LECTURER', 'STUDENT')),
    CONSTRAINT "users_student_code_role_check" CHECK (
        (role = 'STUDENT' AND student_code IS NOT NULL AND btrim(student_code) <> '') OR
        (role <> 'STUDENT' AND student_code IS NULL)
    )
);

-- Bảng Môn học
CREATE TABLE "courses" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "course_code" varchar(50) NOT NULL UNIQUE,
    "course_name" varchar(255) NOT NULL
);

-- Bảng Phân công giảng viên cho môn học
CREATE TABLE "course_lecturers" (
    "course_id" uuid NOT NULL REFERENCES "courses"("id") ON DELETE CASCADE,
    "lecturer_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "assigned_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "assigned_by" uuid REFERENCES "users"("id") ON DELETE SET NULL,
    PRIMARY KEY ("course_id", "lecturer_id")
);

-- Bảng Kỳ thi (Exams)
CREATE TABLE "exams" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "course_id" uuid NOT NULL REFERENCES "courses"("id") ON DELETE CASCADE,
    "title" varchar(255) NOT NULL,
    "start_date" timestamp with time zone NOT NULL,
    "end_date" timestamp with time zone NOT NULL,
    "max_main_questions" integer DEFAULT 3,
    "max_followup_questions" integer DEFAULT 3,
    "created_by" uuid REFERENCES "users"("id") ON DELETE SET NULL,
    "max_followups_per_main" integer DEFAULT 1,
    "main_answer_time_limit_seconds" integer DEFAULT 180,
    "followup_answer_time_limit_seconds" integer DEFAULT 60
);

-- Bảng Ca thi của sinh viên (Exam Schedules)
CREATE TABLE "exam_schedules" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "exam_id" uuid NOT NULL REFERENCES "exams"("id") ON DELETE CASCADE,
    "student_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "scheduled_start_time" timestamp with time zone NOT NULL,
    "scheduled_end_time" timestamp with time zone NOT NULL,
    "status" varchar(50) DEFAULT 'PENDING',
    "final_score" numeric(5, 2),
    "ai_report" jsonb,
    "is_connected" boolean DEFAULT false,
    "full_recording_url" varchar(500),
    "graded_by" uuid REFERENCES "users"("id") ON DELETE SET NULL,
    "actual_start_time" timestamp with time zone,
    "actual_end_time" timestamp with time zone,
    CONSTRAINT "uq_exam_schedule_student" UNIQUE ("exam_id", "student_id"),
    CONSTRAINT "chk_exam_schedule_final_score" CHECK (final_score IS NULL OR (final_score >= 0 AND final_score <= 10)),
    CONSTRAINT "exam_schedules_status_check" CHECK (status IN ('PENDING', 'IN_PROGRESS', 'COMPLETED'))
);

-- Bảng Ngân hàng câu hỏi môn học
CREATE TABLE "questions" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "course_id" uuid NOT NULL REFERENCES "courses"("id") ON DELETE CASCADE,
    "content" text NOT NULL,
    "difficulty_level" varchar(50),
    "topic" varchar(255),
    "expected_answer" text
);

-- Bảng Câu hỏi đã bốc thăm cho từng ca thi (Assigned Questions)
CREATE TABLE "assigned_questions" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "exam_schedule_id" uuid NOT NULL REFERENCES "exam_schedules"("id") ON DELETE RESTRICT,
    "question_id" uuid NOT NULL REFERENCES "questions"("id") ON DELETE RESTRICT,
    "question_order" integer NOT NULL CHECK (question_order > 0),
    "content_snapshot" text NOT NULL,
    "assigned_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT "uq_assigned_question" UNIQUE ("exam_schedule_id", "question_id"),
    CONSTRAINT "uq_assigned_question_order" UNIQUE ("exam_schedule_id", "question_order")
);

-- Bảng Lịch sử đàm thoại phỏng vấn (Transcripts)
CREATE TABLE "transcripts" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "exam_schedule_id" uuid NOT NULL REFERENCES "exam_schedules"("id") ON DELETE CASCADE,
    "question_id" uuid REFERENCES "questions"("id") ON DELETE SET NULL,
    "parent_transcript_id" uuid REFERENCES "transcripts"("id") ON DELETE CASCADE,
    "role" varchar(50) NOT NULL CHECK (role IN ('AI', 'STUDENT')),
    "text_content" text NOT NULL,
    "audio_url" varchar(500),
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "transcript_type" varchar(50) DEFAULT 'MAIN',
    "stream_session_id" varchar(100),
    "speech_duration_ms" integer,
    "latency_ms" integer
);

-- Bảng Kết quả chấm điểm từng câu hỏi (Question Results)
CREATE TABLE "question_results" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "exam_schedule_id" uuid NOT NULL REFERENCES "exam_schedules"("id") ON DELETE CASCADE,
    "question_id" uuid NOT NULL REFERENCES "questions"("id") ON DELETE CASCADE,
    "ai_score" numeric(5, 2),
    "ai_feedback" text,
    "max_score" numeric(5, 2) DEFAULT 10.0,
    "lecturer_score" numeric(5, 2),
    "lecturer_feedback" text,
    "graded_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);

-- Bảng Tiêu chí chấm điểm Rubric môn học
CREATE TABLE "rubrics" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "course_id" uuid NOT NULL REFERENCES "courses"("id") ON DELETE CASCADE,
    "title" varchar(150) NOT NULL,
    "data" jsonb NOT NULL,
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Bảng Tài liệu giáo trình môn học (AI Documents)
CREATE TABLE "ai_documents" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "course_id" uuid NOT NULL REFERENCES "courses"("id") ON DELETE CASCADE,
    "filename" varchar(255) NOT NULL,
    "sha256" varchar(64) NOT NULL,
    "embedding_model" varchar(120) NOT NULL,
    "chunk_count" integer NOT NULL,
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT "ai_documents_course_id_sha256_embedding_model_key" UNIQUE ("course_id", "sha256", "embedding_model")
);

-- Bảng Đoạn văn bản băm nhỏ kèm vector phục vụ RAG (AI Document Chunks)
CREATE TABLE "ai_document_chunks" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "document_id" uuid NOT NULL REFERENCES "ai_documents"("id") ON DELETE CASCADE,
    "course_id" uuid NOT NULL REFERENCES "courses"("id") ON DELETE CASCADE,
    "position" integer NOT NULL,
    "page" integer,
    "text" text NOT NULL,
    "embedding" vector(768) NOT NULL
);

-- Bảng Trạng thái phòng thi thời gian thực của Python Live Voice
CREATE TABLE "ai_voice_sessions" (
    "schedule_id" uuid PRIMARY KEY REFERENCES "exam_schedules"("id") ON DELETE CASCADE,
    "live_model" varchar(120) NOT NULL,
    "state" jsonb NOT NULL
);

-- Bảng Lịch sử Flyway Schema Migration (Đồng bộ với Spring Boot Flyway)
CREATE TABLE "flyway_schema_history" (
    "installed_rank" integer PRIMARY KEY,
    "version" varchar(50),
    "description" varchar(200) NOT NULL,
    "type" varchar(20) NOT NULL,
    "script" varchar(1000) NOT NULL,
    "checksum" integer,
    "installed_by" varchar(100) NOT NULL,
    "installed_on" timestamp DEFAULT now() NOT NULL,
    "execution_time" integer NOT NULL,
    "success" boolean NOT NULL
);

-- Chỉ mục tối ưu truy vấn
CREATE INDEX "idx_course_lecturers_course" ON "course_lecturers" ("course_id");
CREATE INDEX "idx_course_lecturers_lecturer" ON "course_lecturers" ("lecturer_id");
CREATE INDEX "ix_assigned_questions_question_id" ON "assigned_questions" ("question_id");
CREATE INDEX "ix_rubrics_course_id" ON "rubrics" ("course_id");
CREATE INDEX "ix_ai_documents_course_id" ON "ai_documents" ("course_id");
CREATE INDEX "ix_ai_document_chunks_course_id" ON "ai_document_chunks" ("course_id");
CREATE INDEX "ix_ai_document_chunks_document_id" ON "ai_document_chunks" ("document_id");

-- Đăng ký các migration của Flyway đã được áp dụng để Spring Boot khởi động êm
INSERT INTO "flyway_schema_history" 
    ("installed_rank", "version", "description", "type", "script", "checksum", "installed_by", "installed_on", "execution_time", "success")
VALUES
    (1, '1', 'create core tables', 'SQL', 'V1__create_core_tables.sql', NULL, 'postgres', now(), 1, true),
    (2, '2', 'create exam schedule tables', 'SQL', 'V2__create_exam_schedule_tables.sql', NULL, 'postgres', now(), 1, true),
    (3, '3', 'align interview question references', 'SQL', 'V3__align_interview_question_references.sql', NULL, 'postgres', now(), 1, true),
    (4, '5', 'add normalized user email', 'SQL', 'V5__add_normalized_user_email.sql', NULL, 'postgres', now(), 1, true),
    (5, '6', 'add password setup link', 'SQL', 'V6__add_password_setup_link.sql', NULL, 'postgres', now(), 1, true),
    (6, '7', 'use email and student code', 'SQL', 'V7__use_email_and_student_code.sql', NULL, 'postgres', now(), 1, true);

