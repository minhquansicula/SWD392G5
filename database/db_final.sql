CREATE SCHEMA "public";
CREATE TABLE "assigned_questions" (
                                      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
                                      "exam_schedule_id" uuid NOT NULL,
                                      "question_id" uuid NOT NULL,
                                      "question_order" integer NOT NULL,
                                      "content_snapshot" text NOT NULL,
                                      "assigned_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
                                      CONSTRAINT "uq_assigned_question" UNIQUE("exam_schedule_id","question_id"),
                                      CONSTRAINT "uq_assigned_question_order" UNIQUE("exam_schedule_id","question_order"),
                                      CONSTRAINT "assigned_questions_question_order_check" CHECK ((question_order > 0))
);
CREATE TABLE "course_lecturers" (
                                    "course_id" uuid,
                                    "lecturer_id" uuid,
                                    "assigned_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
                                    "assigned_by" uuid,
                                    CONSTRAINT "course_lecturers_pkey" PRIMARY KEY("course_id","lecturer_id")
);
CREATE TABLE "courses" (
                           "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
                           "course_code" varchar(50) NOT NULL CONSTRAINT "courses_course_code_key" UNIQUE,
                           "course_name" varchar(255) NOT NULL
);
CREATE TABLE "exam_schedules" (
                                  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
                                  "exam_id" uuid,
                                  "student_id" uuid,
                                  "scheduled_start_time" timestamp with time zone,
                                  "scheduled_end_time" timestamp with time zone,
                                  "status" varchar(50) DEFAULT 'PENDING',
                                  "final_score" numeric(5, 2),
                                  "is_connected" boolean DEFAULT false,
                                  "full_recording_url" varchar(500),
                                  "graded_by" uuid,
                                  "actual_start_time" timestamp with time zone,
                                  "actual_end_time" timestamp with time zone,
                                  CONSTRAINT "uq_exam_schedule_student" UNIQUE("exam_id","student_id"),
                                  CONSTRAINT "chk_exam_schedule_final_score" CHECK (((final_score IS NULL) OR ((final_score >= (0)::numeric) AND (final_score <= (10)::numeric)))),
                                  CONSTRAINT "exam_schedules_status_check" CHECK (((status)::text = ANY ((ARRAY['PENDING'::character varying, 'IN_PROGRESS'::character varying, 'COMPLETED'::character varying])::text[])))
);
CREATE TABLE "exams" (
                         "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
                         "course_id" uuid,
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
CREATE TABLE "flyway_schema_history" (
	"installed_rank" integer,
	"version" varchar(50),
	"description" varchar(200) NOT NULL,
	"type" varchar(20) NOT NULL,
	"script" varchar(1000) NOT NULL,
	"checksum" integer,
	"installed_by" varchar(100) NOT NULL,
	"installed_on" timestamp DEFAULT now() NOT NULL,
	"execution_time" integer NOT NULL,
	"success" boolean NOT NULL,
	CONSTRAINT "flyway_schema_history_pk" PRIMARY KEY("installed_rank")
);
CREATE TABLE "question_results" (
                                    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
                                    "exam_schedule_id" uuid,
                                    "question_id" uuid,
                                    "ai_score" numeric(5, 2),
                                    "ai_feedback" text,
                                    "max_score" numeric(5, 2) DEFAULT '10.0',
                                    "lecturer_score" numeric(5, 2),
                                    "lecturer_feedback" text,
                                    "graded_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE "questions" (
                             "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
                             "course_id" uuid,
                             "content" text NOT NULL,
                             "difficulty_level" varchar(50),
                             "topic" varchar(255),
                             "expected_answer" text
);
CREATE TABLE "transcripts" (
                               "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
                               "exam_schedule_id" uuid,
                               "question_id" uuid,
                               "parent_transcript_id" uuid,
                               "role" varchar(50) NOT NULL,
                               "text_content" text NOT NULL,
                               "audio_url" varchar(500),
                               "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
                               "transcript_type" varchar(50) DEFAULT 'MAIN',
                               "stream_session_id" varchar(100),
                               "speech_duration_ms" integer,
                               "latency_ms" integer,
                               CONSTRAINT "transcripts_role_check" CHECK (((role)::text = ANY ((ARRAY['AI'::character varying, 'STUDENT'::character varying])::text[])))
);
CREATE TABLE "users" (
                         "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
                         "username" varchar(255) NOT NULL CONSTRAINT "users_username_key" UNIQUE,
                         "password_hash" varchar(255) NOT NULL,
                         "full_name" varchar(255) NOT NULL,
                         "role" varchar(50) NOT NULL,
                         "created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
                         "student_code" varchar(50) CONSTRAINT "users_student_code_key" UNIQUE,
                         "email" varchar(255),
                         CONSTRAINT "users_role_check" CHECK (((role)::text = ANY ((ARRAY['ADMIN'::character varying, 'LECTURER'::character varying, 'STUDENT'::character varying])::text[])))
);
CREATE UNIQUE INDEX "assigned_questions_pkey" ON "assigned_questions" ("id");
CREATE INDEX "ix_assigned_questions_question_id" ON "assigned_questions" ("question_id");
CREATE UNIQUE INDEX "uq_assigned_question" ON "assigned_questions" ("exam_schedule_id","question_id");
CREATE UNIQUE INDEX "uq_assigned_question_order" ON "assigned_questions" ("exam_schedule_id","question_order");
CREATE UNIQUE INDEX "course_lecturers_pkey" ON "course_lecturers" ("course_id","lecturer_id");
CREATE INDEX "idx_course_lecturers_course" ON "course_lecturers" ("course_id");
CREATE INDEX "idx_course_lecturers_lecturer" ON "course_lecturers" ("lecturer_id");
CREATE UNIQUE INDEX "courses_course_code_key" ON "courses" ("course_code");
CREATE UNIQUE INDEX "courses_pkey" ON "courses" ("id");
CREATE UNIQUE INDEX "exam_schedules_pkey" ON "exam_schedules" ("id");
CREATE UNIQUE INDEX "uq_exam_schedule_student" ON "exam_schedules" ("exam_id","student_id");
CREATE UNIQUE INDEX "exams_pkey" ON "exams" ("id");
CREATE UNIQUE INDEX "flyway_schema_history_pk" ON "flyway_schema_history" ("installed_rank");
CREATE INDEX "flyway_schema_history_s_idx" ON "flyway_schema_history" ("success");
CREATE UNIQUE INDEX "question_results_pkey" ON "question_results" ("id");
CREATE UNIQUE INDEX "questions_pkey" ON "questions" ("id");
CREATE UNIQUE INDEX "transcripts_pkey" ON "transcripts" ("id");
CREATE UNIQUE INDEX "users_pkey" ON "users" ("id");
CREATE UNIQUE INDEX "users_student_code_key" ON "users" ("student_code");
CREATE UNIQUE INDEX "users_username_key" ON "users" ("username");
ALTER TABLE "assigned_questions" ADD CONSTRAINT "assigned_questions_exam_schedule_id_fkey" FOREIGN KEY ("exam_schedule_id") REFERENCES "exam_schedules"("id") ON DELETE RESTRICT;
ALTER TABLE "assigned_questions" ADD CONSTRAINT "assigned_questions_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "questions"("id") ON DELETE RESTRICT;
ALTER TABLE "course_lecturers" ADD CONSTRAINT "course_lecturers_assigned_by_fkey" FOREIGN KEY ("assigned_by") REFERENCES "users"("id") ON DELETE SET NULL;
ALTER TABLE "course_lecturers" ADD CONSTRAINT "fk_course_lecturers_course" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE CASCADE;
ALTER TABLE "course_lecturers" ADD CONSTRAINT "fk_course_lecturers_lecturer" FOREIGN KEY ("lecturer_id") REFERENCES "users"("id") ON DELETE CASCADE;
ALTER TABLE "exam_schedules" ADD CONSTRAINT "exam_schedules_exam_id_fkey" FOREIGN KEY ("exam_id") REFERENCES "exams"("id") ON DELETE CASCADE;
ALTER TABLE "exam_schedules" ADD CONSTRAINT "exam_schedules_graded_by_fkey" FOREIGN KEY ("graded_by") REFERENCES "users"("id") ON DELETE SET NULL;
ALTER TABLE "exam_schedules" ADD CONSTRAINT "exam_schedules_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE CASCADE;
ALTER TABLE "exams" ADD CONSTRAINT "exams_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE CASCADE;
ALTER TABLE "exams" ADD CONSTRAINT "exams_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL;
ALTER TABLE "question_results" ADD CONSTRAINT "question_results_exam_schedule_id_fkey" FOREIGN KEY ("exam_schedule_id") REFERENCES "exam_schedules"("id") ON DELETE CASCADE;
ALTER TABLE "question_results" ADD CONSTRAINT "question_results_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "questions"("id") ON DELETE CASCADE;
ALTER TABLE "questions" ADD CONSTRAINT "questions_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE CASCADE;
ALTER TABLE "transcripts" ADD CONSTRAINT "transcripts_exam_schedule_id_fkey" FOREIGN KEY ("exam_schedule_id") REFERENCES "exam_schedules"("id") ON DELETE CASCADE;
ALTER TABLE "transcripts" ADD CONSTRAINT "transcripts_parent_transcript_id_fkey" FOREIGN KEY ("parent_transcript_id") REFERENCES "transcripts"("id") ON DELETE CASCADE;
ALTER TABLE "transcripts" ADD CONSTRAINT "transcripts_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "questions"("id") ON DELETE SET NULL;
