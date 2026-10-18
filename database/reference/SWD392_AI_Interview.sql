CREATE TABLE "roles" (
  "id" uuid PRIMARY KEY NOT NULL DEFAULT (gen_random_uuid()),
  "role_code" varchar(50) UNIQUE NOT NULL,
  "role_name" varchar(100) NOT NULL,
  "description" text,
  CONSTRAINT "roles_role_code_check" CHECK (((role_code)::text = ANY ((ARRAY['ADMIN'::character varying, 'LECTURER'::character varying, 'STUDENT'::character varying])::text[])))
);

CREATE TABLE "users" (
  "id" uuid PRIMARY KEY NOT NULL DEFAULT (gen_random_uuid()),
  "password_hash" varchar(255) NOT NULL,
  "full_name" varchar(255) NOT NULL,
  "role_id" uuid NOT NULL,
  "created_at" timestamp DEFAULT (CURRENT_TIMESTAMP),
  "student_code" varchar(50),
  "email" text NOT NULL,
  "email_normalized" text NOT NULL,
  "password_set_at" timestamp with time zone,
  "password_token_hash" varchar(64),
  "password_token_expires_at" timestamp with time zone,
  "password_mail_status" varchar(20),
  "is_system_admin" boolean NOT NULL DEFAULT false,
  CONSTRAINT "users_email_length_check" CHECK (((email IS NULL) OR (char_length(email) <= 255))),
  CONSTRAINT "users_email_normalized_length_check" CHECK (((email_normalized IS NULL) OR ((char_length(email_normalized) >= 1) AND (char_length(email_normalized) <= 255)))),
  CONSTRAINT "users_password_mail_status_check" CHECK (((password_mail_status IS NULL) OR ((password_mail_status)::text = ANY ((ARRAY['SENT'::character varying, 'FAILED'::character varying])::text[])))),
  CONSTRAINT "users_student_code_not_blank_check" CHECK (((student_code IS NULL) OR (btrim((student_code)::text) <> ''::text)))
);

CREATE TABLE "courses" (
  "id" uuid PRIMARY KEY NOT NULL DEFAULT (gen_random_uuid()),
  "course_code" varchar(50) NOT NULL,
  "course_name" varchar(255) NOT NULL
);

CREATE TABLE "course_lecturers" (
  "course_id" uuid NOT NULL,
  "lecturer_id" uuid NOT NULL,
  "assigned_at" timestamp with time zone DEFAULT (CURRENT_TIMESTAMP),
  "assigned_by" uuid,
  PRIMARY KEY ("course_id", "lecturer_id")
);

CREATE TABLE "exams" (
  "id" uuid PRIMARY KEY NOT NULL DEFAULT (gen_random_uuid()),
  "course_id" uuid NOT NULL,
  "title" varchar(255) NOT NULL,
  "start_date" timestamp with time zone NOT NULL,
  "end_date" timestamp with time zone NOT NULL,
  "max_main_questions" integer DEFAULT 0,
  "max_followup_questions" integer DEFAULT 0,
  "created_by" uuid,
  "max_followups_per_main" integer DEFAULT 2,
  "main_answer_time_limit_seconds" integer DEFAULT 120,
  "followup_answer_time_limit_seconds" integer DEFAULT 60
);

CREATE TABLE "questions" (
  "id" uuid PRIMARY KEY NOT NULL DEFAULT (gen_random_uuid()),
  "course_id" uuid NOT NULL,
  "content" text NOT NULL,
  "difficulty_level" varchar(50),
  "topic" varchar(255),
  "expected_answer" text
);

CREATE TABLE "rubrics" (
  "id" uuid PRIMARY KEY NOT NULL DEFAULT (gen_random_uuid()),
  "question_id" uuid NOT NULL,
  "title" varchar(250) NOT NULL,
  "description" text NOT NULL,
  "max_score" numeric(5,2) NOT NULL DEFAULT 1,
  "display_order" integer NOT NULL DEFAULT 1,
  CONSTRAINT "rubrics_max_score_check" CHECK ((max_score > (0)::numeric)),
  CONSTRAINT "rubrics_display_order_check" CHECK ((display_order > 0))
);

CREATE TABLE "exam_schedules" (
  "id" uuid PRIMARY KEY NOT NULL DEFAULT (gen_random_uuid()),
  "exam_id" uuid NOT NULL,
  "student_id" uuid NOT NULL,
  "scheduled_start_time" timestamp with time zone,
  "scheduled_end_time" timestamp with time zone,
  "status" varchar(50) DEFAULT 'PENDING',
  "final_score" numeric(5,2),
  "is_connected" boolean DEFAULT false,
  "full_recording_url" varchar(500),
  "graded_by" uuid,
  "actual_start_time" timestamp with time zone,
  "actual_end_time" timestamp with time zone,
  CONSTRAINT "chk_exam_schedule_final_score" CHECK (((final_score IS NULL) OR ((final_score >= (0)::numeric) AND (final_score <= (10)::numeric)))),
  CONSTRAINT "exam_schedules_status_check" CHECK (((status)::text = ANY ((ARRAY['PENDING'::character varying, 'IN_PROGRESS'::character varying, 'COMPLETED'::character varying])::text[])))
);

CREATE TABLE "assigned_questions" (
  "id" uuid PRIMARY KEY NOT NULL DEFAULT (gen_random_uuid()),
  "exam_schedule_id" uuid NOT NULL,
  "question_id" uuid NOT NULL,
  "question_order" integer NOT NULL,
  "content_snapshot" text NOT NULL,
  "assigned_at" timestamp with time zone NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  CONSTRAINT "assigned_questions_question_order_check" CHECK ((question_order > 0))
);

CREATE TABLE "transcripts" (
  "id" uuid PRIMARY KEY NOT NULL DEFAULT (gen_random_uuid()),
  "assigned_question_id" uuid NOT NULL,
  "parent_transcript_id" uuid,
  "role" varchar(50) NOT NULL,
  "text_content" text NOT NULL,
  "audio_url" varchar(500),
  "created_at" timestamp with time zone DEFAULT (CURRENT_TIMESTAMP),
  "transcript_type" varchar(50) DEFAULT 'MAIN',
  "stream_session_id" varchar(100),
  "speech_duration_ms" integer,
  "latency_ms" integer
);

CREATE TABLE "question_results" (
  "id" uuid PRIMARY KEY NOT NULL DEFAULT (gen_random_uuid()),
  "exam_schedule_id" uuid NOT NULL,
  "rubric_id" uuid NOT NULL,
  "ai_score" numeric(5,2),
  "ai_feedback" text,
  "max_score" numeric(5,2) DEFAULT '10.0',
  "lecturer_score" numeric(5,2),
  "lecturer_feedback" text,
  "graded_at" timestamp with time zone DEFAULT (CURRENT_TIMESTAMP)
);

CREATE UNIQUE INDEX "users_student_code_key" ON "users" ("student_code");

CREATE UNIQUE INDEX "users_email_key" ON "users" ("email");

CREATE UNIQUE INDEX "users_email_normalized_key" ON "users" ("email_normalized");

CREATE UNIQUE INDEX "users_password_token_hash_key" ON "users" ("password_token_hash");

CREATE UNIQUE INDEX "courses_course_code_key" ON "courses" ("course_code");

CREATE INDEX "idx_course_lecturers_course" ON "course_lecturers" ("course_id");

CREATE INDEX "idx_course_lecturers_lecturer" ON "course_lecturers" ("lecturer_id");

CREATE UNIQUE INDEX "uq_rubrics_question_order" ON "rubrics" ("question_id", "display_order");

CREATE INDEX "ix_rubrics_question_id" ON "rubrics" ("question_id");

CREATE UNIQUE INDEX "uq_exam_schedule_student" ON "exam_schedules" ("exam_id", "student_id");

CREATE UNIQUE INDEX "uq_assigned_question" ON "assigned_questions" ("exam_schedule_id", "question_id");

CREATE UNIQUE INDEX "uq_assigned_question_order" ON "assigned_questions" ("exam_schedule_id", "question_order");

CREATE INDEX "ix_assigned_questions_question_id" ON "assigned_questions" ("question_id");

ALTER TABLE "users" ADD CONSTRAINT "users_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles" ("id") ON DELETE RESTRICT ON UPDATE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "course_lecturers" ADD CONSTRAINT "fk_course_lecturers_lecturer" FOREIGN KEY ("lecturer_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "course_lecturers" ADD CONSTRAINT "fk_course_lecturers_course" FOREIGN KEY ("course_id") REFERENCES "courses" ("id") ON DELETE CASCADE ON UPDATE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "exams" ADD CONSTRAINT "exams_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "exam_schedules" ADD CONSTRAINT "exam_schedules_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "exams" ADD CONSTRAINT "exams_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses" ("id") ON DELETE CASCADE ON UPDATE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "exam_schedules" ADD CONSTRAINT "exam_schedules_exam_id_fkey" FOREIGN KEY ("exam_id") REFERENCES "exams" ("id") ON DELETE CASCADE ON UPDATE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "questions" ADD CONSTRAINT "questions_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses" ("id") ON DELETE CASCADE ON UPDATE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "assigned_questions" ADD CONSTRAINT "assigned_questions_exam_schedule_id_fkey" FOREIGN KEY ("exam_schedule_id") REFERENCES "exam_schedules" ("id") ON DELETE RESTRICT ON UPDATE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "assigned_questions" ADD CONSTRAINT "assigned_questions_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "questions" ("id") ON DELETE RESTRICT ON UPDATE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "transcripts" ADD CONSTRAINT "transcripts_assigned_question_id_fkey" FOREIGN KEY ("assigned_question_id") REFERENCES "assigned_questions" ("id") ON DELETE CASCADE ON UPDATE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "transcripts" ADD CONSTRAINT "transcripts_parent_transcript_id_fkey" FOREIGN KEY ("parent_transcript_id") REFERENCES "transcripts" ("id") ON DELETE SET NULL ON UPDATE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "rubrics" ADD CONSTRAINT "rubrics_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "questions" ("id") ON DELETE CASCADE ON UPDATE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "question_results" ADD CONSTRAINT "question_results_rubric_id_fkey" FOREIGN KEY ("rubric_id") REFERENCES "rubrics" ("id") ON DELETE RESTRICT ON UPDATE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "question_results" ADD CONSTRAINT "question_results_exam_schedule_id_fkey" FOREIGN KEY ("exam_schedule_id") REFERENCES "exam_schedules" ("id") ON DELETE CASCADE ON UPDATE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;
