# AIVES — Data Dictionary

**Database baseline:** The user-supplied `SWD392 - AI Interview.sql`, received on October 18, 2026. The complete DDL is preserved in [SWD392_AI_Interview.sql](../database/reference/SWD392_AI_Interview.sql).
**Scope:** Exactly the tables, columns, defaults, keys, indexes, and CHECK constraints declared in that SQL. Application behavior and suggested improvements are not presented as existing database constraints. This document does not confirm that the SQL has been executed in a running database.
**Source SHA-256:** `4C7DFB50382BF7998406E4F11EF471962DCE5599028F60C35B77BCA5A8191C63`.

## 1. Schema Overview

| Table | Columns | Purpose |
|---|---:|---|
| `roles` | 4 | Stores the three supported application roles. |
| `users` | 13 | Stores user identity, authentication data, role membership, and password-setup metadata. |
| `courses` | 3 | Stores the courses used to organize questions, lecturer assignments, and exams. |
| `course_lecturers` | 4 | Associates lecturers with courses. Each course/lecturer pair can occur only once. |
| `exams` | 11 | Stores examination configuration, course association, examination period, and question/answer limits. |
| `questions` | 6 | Stores bank questions, their course, content, classification, and expected answers. |
| `rubrics` | 6 | Stores rubric items/criteria attached directly to questions. Each row has its own description, maximum score, and display order; this schema has no separate rubric header/criterion tables. |
| `exam_schedules` | 12 | Stores one student's scheduled attempt in an exam, timing, connection/recording metadata, and the overall grade. |
| `assigned_questions` | 6 | Stores bank questions assigned to an attempt, their ordering, and immutable-by-policy content snapshots. SQL alone does not prevent snapshot updates. |
| `transcripts` | 11 | Stores spoken/text utterances for assigned questions. Attempt and bank-question identity are obtained through assigned_questions, not direct transcript columns. |
| `question_results` | 9 | Stores grading records for an attempt and a rubric item. Results refer to rubrics.id, not directly to a question assignment; per-question grouping follows rubrics.question_id. |

**Totals:** 11 tables, 85 columns, 11 primary keys, 15 declared foreign keys, 10 explicit CHECK constraints, and 13 explicit CREATE INDEX statements (9 unique and 4 non-unique). Indexes implicitly created for primary keys and inline UNIQUE declarations are not included in the 13 explicit index statements.

### Reading conventions

- **Nullable = Yes** means the DDL allows SQL NULL. A DEFAULT does not imply NOT NULL. A CHECK generally does not prohibit NULL unless the column is separately NOT NULL.
- **PK** = primary key; **FK** = a foreign key actually declared in the supplied SQL; **UQ** = inline uniqueness or a declared unique index. **Composite** means the constraint applies to a combination of columns.
- **No default** means the DDL declares no DEFAULT expression. It does not mean an explicit default value of zero, false, or an empty string.
- Defaults below reproduce the declared SQL expressions, including parentheses and string literals.
- `timestamp` means timestamp without time zone. `timestamp with time zone` is PostgreSQL's `timestamptz` type.
- Column descriptions explain intended business meaning inferred from names and project requirements. Such descriptions do not add SQL enforcement.

## 2. Column Dictionary

### 2.1. `roles`

Stores the three supported application roles.

| Column | Data type | Nullable | Key | Default | Description |
|---|---|---|---|---|---|
| `id` | `uuid` | No | PK | `(gen_random_uuid())` | Unique role identifier. |
| `role_code` | `varchar(50)` | No | UQ | No default | Role code used for authorization: ADMIN, LECTURER, or STUDENT. |
| `role_name` | `varchar(100)` | No | — | No default | Human-readable role name. |
| `description` | `text` | Yes | — | No default | Optional explanation of the role. |

**Declared table constraints and indexes:**

- Primary key: `(id)`.
- Inline UNIQUE: `role_code`.
- CHECK `roles_role_code_check`: role_code must be ADMIN, LECTURER, or STUDENT.

### 2.2. `users`

Stores user identity, authentication data, role membership, and password-setup metadata.

| Column | Data type | Nullable | Key | Default | Description |
|---|---|---|---|---|---|
| `id` | `uuid` | No | PK | `(gen_random_uuid())` | Stable user/account identifier. |
| `password_hash` | `varchar(255)` | No | — | No default | Stored password hash; the schema does not specify a hashing algorithm. |
| `full_name` | `varchar(255)` | No | — | No default | User's full display name. |
| `role_id` | `uuid` | No | FK | No default | References the user's role in roles.id. |
| `created_at` | `timestamp` | Yes | — | `(CURRENT_TIMESTAMP)` | Account creation time. This column is timestamp WITHOUT time zone. |
| `student_code` | `varchar(50)` | Yes | UQ | No default | Optional student identifier. When supplied, it must be unique and nonblank; this SQL does not require it specifically for STUDENT accounts. |
| `email` | `text` | No | UQ | No default | User email address. Limited to 255 characters; SQL does not validate email syntax. |
| `email_normalized` | `text` | No | UQ | No default | Canonical email value used for matching. Length is 1–255 characters; normalization rules such as lowercasing are not enforced by this SQL. |
| `password_set_at` | `timestamp with time zone` | Yes | — | No default | Time at which a usable password was set; null can represent a password not yet set. |
| `password_token_hash` | `varchar(64)` | Yes | UQ | No default | Hash of a password setup/reset token. The column is limited to 64 characters; the SQL does not specify its hashing algorithm. |
| `password_token_expires_at` | `timestamp with time zone` | Yes | — | No default | Expiration time of the password setup/reset token. |
| `password_mail_status` | `varchar(20)` | Yes | — | No default | Outcome of sending a password email: SENT, FAILED, or null. |
| `is_system_admin` | `boolean` | No | — | `false` | Flag distinguishing a system-administrator account; authorization behavior is application-defined. |

**Declared table constraints and indexes:**

- Primary key: `(id)`.
- Unique index `users_student_code_key` on `(student_code)`.
- Unique index `users_email_key` on `(email)`.
- Unique index `users_email_normalized_key` on `(email_normalized)`.
- Unique index `users_password_token_hash_key` on `(password_token_hash)`.
- CHECK `users_email_length_check`: email may not exceed 255 characters. email is separately declared NOT NULL.
- CHECK `users_email_normalized_length_check`: email_normalized must contain 1–255 characters because it is separately NOT NULL.
- CHECK `users_password_mail_status_check`: password_mail_status is null, SENT, or FAILED.
- CHECK `users_student_code_not_blank_check`: student_code may be null; otherwise its trimmed value must not be empty.
- FK `users_role_id_fkey`: `role_id` → `roles.id`; ON DELETE `RESTRICT`.

### 2.3. `courses`

Stores the courses used to organize questions, lecturer assignments, and exams.

| Column | Data type | Nullable | Key | Default | Description |
|---|---|---|---|---|---|
| `id` | `uuid` | No | PK | `(gen_random_uuid())` | Unique course identifier. |
| `course_code` | `varchar(50)` | No | UQ | No default | Unique course code. |
| `course_name` | `varchar(255)` | No | — | No default | Course name. |

**Declared table constraints and indexes:**

- Primary key: `(id)`.
- Unique index `courses_course_code_key` on `(course_code)`.

### 2.4. `course_lecturers`

Associates lecturers with courses. Each course/lecturer pair can occur only once.

| Column | Data type | Nullable | Key | Default | Description |
|---|---|---|---|---|---|
| `course_id` | `uuid` | No | PK (composite); FK | No default | Course covered by this lecturer assignment. |
| `lecturer_id` | `uuid` | No | PK (composite); FK | No default | Assigned user. The FK checks user existence, not that the user has the LECTURER role. |
| `assigned_at` | `timestamp with time zone` | Yes | — | `(CURRENT_TIMESTAMP)` | Time the lecturer was assigned to the course. |
| `assigned_by` | `uuid` | Yes | — | No default | Intended identifier of the user making the assignment. No FK is declared for this column. |

**Declared table constraints and indexes:**

- Primary key: `(course_id, lecturer_id)`.
- Index `idx_course_lecturers_course` on `(course_id)`.
- Index `idx_course_lecturers_lecturer` on `(lecturer_id)`.
- FK `fk_course_lecturers_lecturer`: `lecturer_id` → `users.id`; ON DELETE `CASCADE`.
- FK `fk_course_lecturers_course`: `course_id` → `courses.id`; ON DELETE `CASCADE`.
- `assigned_by` is a logical user reference only; the supplied SQL declares no FK for it.

### 2.5. `exams`

Stores examination configuration, course association, examination period, and question/answer limits.

| Column | Data type | Nullable | Key | Default | Description |
|---|---|---|---|---|---|
| `id` | `uuid` | No | PK | `(gen_random_uuid())` | Unique exam identifier. |
| `course_id` | `uuid` | No | FK | No default | Course for which the exam is organized. |
| `title` | `varchar(255)` | No | — | No default | Examination title. |
| `start_date` | `timestamp with time zone` | No | — | No default | Beginning of the exam period. |
| `end_date` | `timestamp with time zone` | No | — | No default | End of the exam period. This SQL does not enforce end_date > start_date. |
| `max_main_questions` | `integer` | Yes | — | `0` | Configured maximum number of main questions per attempt. Nullable despite its default. |
| `max_followup_questions` | `integer` | Yes | — | `0` | Configured maximum total number of follow-up questions per attempt. Nullable despite its default. |
| `created_by` | `uuid` | Yes | FK | No default | User recorded as the exam creator. |
| `max_followups_per_main` | `integer` | Yes | — | `2` | Configured maximum number of follow-ups per main question. Nullable despite its default. |
| `main_answer_time_limit_seconds` | `integer` | Yes | — | `120` | Configured answer-time limit in seconds for a main question. No positive-value CHECK is declared. |
| `followup_answer_time_limit_seconds` | `integer` | Yes | — | `60` | Configured answer-time limit in seconds for a follow-up question. No positive-value CHECK is declared. |

**Declared table constraints and indexes:**

- Primary key: `(id)`.
- FK `exams_created_by_fkey`: `created_by` → `users.id`; ON DELETE `SET NULL`.
- FK `exams_course_id_fkey`: `course_id` → `courses.id`; ON DELETE `CASCADE`.

### 2.6. `questions`

Stores bank questions, their course, content, classification, and expected answers.

| Column | Data type | Nullable | Key | Default | Description |
|---|---|---|---|---|---|
| `id` | `uuid` | No | PK | `(gen_random_uuid())` | Unique bank-question identifier. |
| `course_id` | `uuid` | No | FK | No default | Course owning the question. |
| `content` | `text` | No | — | No default | Question text. |
| `difficulty_level` | `varchar(50)` | Yes | — | No default | Optional difficulty label. No vocabulary CHECK or Bloom-level field is declared. |
| `topic` | `varchar(255)` | Yes | — | No default | Optional subject/topic label. |
| `expected_answer` | `text` | Yes | — | No default | Optional reference answer used to support assessment. |

**Declared table constraints and indexes:**

- Primary key: `(id)`.
- FK `questions_course_id_fkey`: `course_id` → `courses.id`; ON DELETE `CASCADE`.

### 2.7. `rubrics`

Stores rubric items/criteria attached directly to questions. Each row has its own description, maximum score, and display order; this schema has no separate rubric header/criterion tables.

| Column | Data type | Nullable | Key | Default | Description |
|---|---|---|---|---|---|
| `id` | `uuid` | No | PK | `(gen_random_uuid())` | Unique rubric-item identifier. |
| `question_id` | `uuid` | No | FK; UQ (composite) | No default | Bank question to which the rubric item belongs. |
| `title` | `varchar(250)` | No | — | No default | Title of the rubric item or assessment criterion. |
| `description` | `text` | No | — | No default | Description of what is assessed by this rubric item. |
| `max_score` | `numeric(5,2)` | No | — | `1` | Maximum score for this rubric item; must be greater than zero. |
| `display_order` | `integer` | No | UQ (composite) | `1` | Positive display position within the question's rubric items. Positions are unique per question. |

**Declared table constraints and indexes:**

- Primary key: `(id)`.
- Unique index `uq_rubrics_question_order` on `(question_id, display_order)`.
- Index `ix_rubrics_question_id` on `(question_id)`.
- CHECK `rubrics_max_score_check`: rubrics.max_score must be greater than zero.
- CHECK `rubrics_display_order_check`: rubrics.display_order must be greater than zero.
- FK `rubrics_question_id_fkey`: `question_id` → `questions.id`; ON DELETE `CASCADE`.

### 2.8. `exam_schedules`

Stores one student's scheduled attempt in an exam, timing, connection/recording metadata, and the overall grade.

| Column | Data type | Nullable | Key | Default | Description |
|---|---|---|---|---|---|
| `id` | `uuid` | No | PK | `(gen_random_uuid())` | Unique examination-attempt/schedule identifier. |
| `exam_id` | `uuid` | No | FK; UQ (composite) | No default | Exam associated with this attempt. |
| `student_id` | `uuid` | No | FK; UQ (composite) | No default | User scheduled for the attempt. The FK does not verify the STUDENT role. |
| `scheduled_start_time` | `timestamp with time zone` | Yes | — | No default | Planned start time; nullable in the supplied SQL. |
| `scheduled_end_time` | `timestamp with time zone` | Yes | — | No default | Planned end time; nullable in the supplied SQL. No schedule-order or overlap constraint is declared. |
| `status` | `varchar(50)` | Yes | — | `'PENDING'` | Attempt status: PENDING, IN_PROGRESS, or COMPLETED when non-null. The CHECK does not prohibit null. |
| `final_score` | `numeric(5,2)` | Yes | — | No default | Overall grade, constrained to 0–10 when present. This column alone does not prove lecturer finalization/publication. |
| `is_connected` | `boolean` | Yes | — | `false` | Connection-status flag. Nullable despite its false default. |
| `full_recording_url` | `varchar(500)` | Yes | — | No default | Optional URL/path reference for the full-session recording; does not itself guarantee that a complete recording exists. |
| `graded_by` | `uuid` | Yes | — | No default | Intended identifier of the finalizing grader. No FK is declared for this column. |
| `actual_start_time` | `timestamp with time zone` | Yes | — | No default | Actual attempt start time. |
| `actual_end_time` | `timestamp with time zone` | Yes | — | No default | Actual attempt end time. |

**Declared table constraints and indexes:**

- Primary key: `(id)`.
- Unique index `uq_exam_schedule_student` on `(exam_id, student_id)`.
- CHECK `chk_exam_schedule_final_score`: final_score is null or between 0 and 10, inclusive.
- CHECK `exam_schedules_status_check`: A non-null status must be PENDING, IN_PROGRESS, or COMPLETED. Null is allowed.
- FK `exam_schedules_student_id_fkey`: `student_id` → `users.id`; ON DELETE `CASCADE`.
- FK `exam_schedules_exam_id_fkey`: `exam_id` → `exams.id`; ON DELETE `CASCADE`.
- `graded_by` is a logical user reference only; the supplied SQL declares no FK for it.

### 2.9. `assigned_questions`

Stores bank questions assigned to an attempt, their ordering, and immutable-by-policy content snapshots. SQL alone does not prevent snapshot updates.

| Column | Data type | Nullable | Key | Default | Description |
|---|---|---|---|---|---|
| `id` | `uuid` | No | PK | `(gen_random_uuid())` | Unique question-assignment identifier. |
| `exam_schedule_id` | `uuid` | No | FK; UQ (composite) | No default | Attempt receiving this question. |
| `question_id` | `uuid` | No | FK; UQ (composite) | No default | Original bank question. The same question cannot be assigned twice to the same attempt. |
| `question_order` | `integer` | No | UQ (composite) | No default | Positive question position, unique within the attempt. |
| `content_snapshot` | `text` | No | — | No default | Question text captured for the assignment. |
| `assigned_at` | `timestamp with time zone` | No | — | `(CURRENT_TIMESTAMP)` | Time the question was assigned. |

**Declared table constraints and indexes:**

- Primary key: `(id)`.
- Unique index `uq_assigned_question` on `(exam_schedule_id, question_id)`.
- Unique index `uq_assigned_question_order` on `(exam_schedule_id, question_order)`.
- Index `ix_assigned_questions_question_id` on `(question_id)`.
- CHECK `assigned_questions_question_order_check`: question_order must be greater than zero.
- FK `assigned_questions_exam_schedule_id_fkey`: `exam_schedule_id` → `exam_schedules.id`; ON DELETE `RESTRICT`.
- FK `assigned_questions_question_id_fkey`: `question_id` → `questions.id`; ON DELETE `RESTRICT`.

### 2.10. `transcripts`

Stores spoken/text utterances for assigned questions. Attempt and bank-question identity are obtained through assigned_questions, not direct transcript columns.

| Column | Data type | Nullable | Key | Default | Description |
|---|---|---|---|---|---|
| `id` | `uuid` | No | PK | `(gen_random_uuid())` | Unique transcript/utterance identifier. |
| `assigned_question_id` | `uuid` | No | FK | No default | Question assignment associated with this utterance. Required for every transcript row in this schema. |
| `parent_transcript_id` | `uuid` | Yes | FK | No default | Optional parent utterance for conversation threading. Deleting the parent sets this reference to null. |
| `role` | `varchar(50)` | No | — | No default | Speaker-role label. The supplied SQL does not restrict it to AI/STUDENT or any other vocabulary. |
| `text_content` | `text` | No | — | No default | Utterance/transcription text. |
| `audio_url` | `varchar(500)` | Yes | — | No default | Optional audio reference for this utterance. |
| `created_at` | `timestamp with time zone` | Yes | — | `(CURRENT_TIMESTAMP)` | Time the transcript row was created. |
| `transcript_type` | `varchar(50)` | Yes | — | `'MAIN'` | Utterance/question classification label, default MAIN. No allowed-value CHECK is declared. |
| `stream_session_id` | `varchar(100)` | Yes | — | No default | Optional identifier of the audio/streaming session. |
| `speech_duration_ms` | `integer` | Yes | — | No default | Optional speaking duration in milliseconds. No nonnegative-value CHECK is declared. |
| `latency_ms` | `integer` | Yes | — | No default | Optional processing/response latency in milliseconds. No nonnegative-value CHECK is declared. |

**Declared table constraints and indexes:**

- Primary key: `(id)`.
- FK `transcripts_assigned_question_id_fkey`: `assigned_question_id` → `assigned_questions.id`; ON DELETE `CASCADE`.
- FK `transcripts_parent_transcript_id_fkey`: `parent_transcript_id` → `transcripts.id`; ON DELETE `SET NULL`.
- The SQL declares no CHECK on `role` or `transcript_type`, no unique utterance-order constraint, and no direct `exam_schedule_id` or `question_id` column.

### 2.11. `question_results`

Stores grading records for an attempt and a rubric item. Results refer to rubrics.id, not directly to a question assignment; per-question grouping follows rubrics.question_id.

| Column | Data type | Nullable | Key | Default | Description |
|---|---|---|---|---|---|
| `id` | `uuid` | No | PK | `(gen_random_uuid())` | Unique grading-record identifier. |
| `exam_schedule_id` | `uuid` | No | FK | No default | Attempt being assessed. |
| `rubric_id` | `uuid` | No | FK | No default | Rubric item being assessed. The associated bank question is obtained through rubrics.question_id. |
| `ai_score` | `numeric(5,2)` | Yes | — | No default | Optional AI-suggested score. No range CHECK is declared. |
| `ai_feedback` | `text` | Yes | — | No default | Optional AI-generated qualitative feedback. |
| `max_score` | `numeric(5,2)` | Yes | — | `'10.0'` | Maximum score recorded on the result. Nullable despite its 10.0 default; SQL does not require it to match rubrics.max_score. |
| `lecturer_score` | `numeric(5,2)` | Yes | — | No default | Optional lecturer-assigned score. No range CHECK is declared. |
| `lecturer_feedback` | `text` | Yes | — | No default | Optional lecturer feedback. |
| `graded_at` | `timestamp with time zone` | Yes | — | `(CURRENT_TIMESTAMP)` | Timestamp defaulted when the row is inserted. This is not an explicit lecturer-finalization timestamp. |

**Declared table constraints and indexes:**

- Primary key: `(id)`.
- FK `question_results_rubric_id_fkey`: `rubric_id` → `rubrics.id`; ON DELETE `RESTRICT`.
- FK `question_results_exam_schedule_id_fkey`: `exam_schedule_id` → `exam_schedules.id`; ON DELETE `CASCADE`.
- No UNIQUE constraint is declared on `(exam_schedule_id, rubric_id)`. Multiple grading rows for the same pair are therefore allowed by this SQL.
- No `question_id` or `assigned_question_id` column exists in this table. The reference is `rubric_id → rubrics.question_id`.

## 3. Declared Foreign-Key Relationships

All 15 FK declarations specify `ON UPDATE NO ACTION DEFERRABLE INITIALLY IMMEDIATE`. The table below lists their exact deletion behavior.

| Foreign-key constraint | Source column | Referenced column | On delete |
|---|---|---|---|
| `users_role_id_fkey` | `users.role_id` | `roles.id` | `RESTRICT` |
| `fk_course_lecturers_lecturer` | `course_lecturers.lecturer_id` | `users.id` | `CASCADE` |
| `fk_course_lecturers_course` | `course_lecturers.course_id` | `courses.id` | `CASCADE` |
| `exams_created_by_fkey` | `exams.created_by` | `users.id` | `SET NULL` |
| `exam_schedules_student_id_fkey` | `exam_schedules.student_id` | `users.id` | `CASCADE` |
| `exams_course_id_fkey` | `exams.course_id` | `courses.id` | `CASCADE` |
| `exam_schedules_exam_id_fkey` | `exam_schedules.exam_id` | `exams.id` | `CASCADE` |
| `questions_course_id_fkey` | `questions.course_id` | `courses.id` | `CASCADE` |
| `assigned_questions_exam_schedule_id_fkey` | `assigned_questions.exam_schedule_id` | `exam_schedules.id` | `RESTRICT` |
| `assigned_questions_question_id_fkey` | `assigned_questions.question_id` | `questions.id` | `RESTRICT` |
| `transcripts_assigned_question_id_fkey` | `transcripts.assigned_question_id` | `assigned_questions.id` | `CASCADE` |
| `transcripts_parent_transcript_id_fkey` | `transcripts.parent_transcript_id` | `transcripts.id` | `SET NULL` |
| `rubrics_question_id_fkey` | `rubrics.question_id` | `questions.id` | `CASCADE` |
| `question_results_rubric_id_fkey` | `question_results.rubric_id` | `rubrics.id` | `RESTRICT` |
| `question_results_exam_schedule_id_fkey` | `question_results.exam_schedule_id` | `exam_schedules.id` | `CASCADE` |

**Deletion meanings:** CASCADE deletes dependent rows when the referenced parent is deleted; SET NULL clears the nullable reference; RESTRICT rejects deletion while referencing rows exist. Cascading deletion must be considered alongside the requirement to preserve examination evidence.

## 4. Explicit Index Catalog

| Index | Table | Columns | Unique |
|---|---|---|---|
| `users_student_code_key` | `users` | `(student_code)` | Yes |
| `users_email_key` | `users` | `(email)` | Yes |
| `users_email_normalized_key` | `users` | `(email_normalized)` | Yes |
| `users_password_token_hash_key` | `users` | `(password_token_hash)` | Yes |
| `courses_course_code_key` | `courses` | `(course_code)` | Yes |
| `idx_course_lecturers_course` | `course_lecturers` | `(course_id)` | No |
| `idx_course_lecturers_lecturer` | `course_lecturers` | `(lecturer_id)` | No |
| `uq_rubrics_question_order` | `rubrics` | `(question_id, display_order)` | Yes |
| `ix_rubrics_question_id` | `rubrics` | `(question_id)` | No |
| `uq_exam_schedule_student` | `exam_schedules` | `(exam_id, student_id)` | Yes |
| `uq_assigned_question` | `assigned_questions` | `(exam_schedule_id, question_id)` | Yes |
| `uq_assigned_question_order` | `assigned_questions` | `(exam_schedule_id, question_order)` | Yes |
| `ix_assigned_questions_question_id` | `assigned_questions` | `(question_id)` | No |

The inline UNIQUE declaration on `roles.role_code` and primary keys also imply supporting indexes, whose generated names are not explicitly listed in the source SQL.

## 5. Schema Interpretation and Items to Confirm

1. **Role normalization:** `users.role_id` references `roles.id`. There is no `users.role` column in this baseline. The role code is obtained by joining `users` and `roles`.
2. **Rubric granularity:** A row in `rubrics` is a question-specific rubric item/criterion. `question_results` stores results against `rubric_id` for an attempt. A per-question report must group those records through `rubrics.question_id` and use an agreed aggregation formula. It must not assume one result row per assigned question.
3. **Duplicate result rows:** If the business rule requires one result per attempt/rubric item, uniqueness on `(exam_schedule_id, rubric_id)` is a proposed addition, not an existing constraint. If multiple revisions are intended, the revision/active-result policy must be defined.
4. **Maximum-score consistency:** `rubrics.max_score` defaults to 1 and is positive, while `question_results.max_score` defaults to 10.0 and is nullable. SQL does not keep them equal or constrain `ai_score`/`lecturer_score` against either maximum.
5. **Logical references without FKs:** `course_lecturers.assigned_by` and `exam_schedules.graded_by` are UUID columns with no declared user FK. The column dictionary intentionally does not label them as FK.
6. **Student and lecturer roles:** The user FKs ensure existence, not the correct role. The SQL does not require student codes specifically for STUDENT users and does not require non-STUDENT users to have a null student code.
7. **Timing and counters:** The SQL does not enforce exam end after start, schedule start/end ordering, schedule inclusion in exam dates, non-overlap, nonnegative question counts, or positive answer-time limits. These remain application requirements or proposed constraints.
8. **Transcript semantics:** Every transcript must have `assigned_question_id`. Greetings or unassigned AI questions cannot be represented without assigning a question or changing the schema. `parent_transcript_id` threads utterances but does not by itself establish a MAIN/FOLLOW_UP question entity or enforce a shared attempt.
9. **Grade finalization:** `COMPLETED`, `final_score`, `graded_by`, and `graded_at` do not provide a complete enforced lecturer-finalization/publication workflow. In particular, `question_results.graded_at` has an insert-time default and is not proof of lecturer approval.
10. **Historical grading basis:** `assigned_questions` snapshots question content, but this SQL has no expected-answer/rubric snapshot, rubric version, explicit question-review/Bloom fields, or grading-change audit table. Those are separate target requirements.
11. **AI and evidence support:** This SQL has no RAG document/chunk/vector tables, standalone recording metadata table, or voice-language configuration table. Audio URL fields store references, not proof of complete recordings. Such data may be handled by a separate service/schema, which must be documented before being added to this dictionary.
12. **Deletion and retention:** Several declared FKs use CASCADE. Do not describe this schema as guaranteeing long-term retention of all historical transcripts/results without validating deletion paths and the application's retention policy.

These observations document the submitted DDL; they do not modify it or assert that the corresponding checks are absent from application code.

