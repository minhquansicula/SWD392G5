CREATE TABLE IF NOT EXISTS exams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    start_date TIMESTAMPTZ NOT NULL,
    end_date TIMESTAMPTZ NOT NULL,
    max_main_questions INT DEFAULT 0,
    max_followup_questions INT DEFAULT 0,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS exam_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exam_id UUID REFERENCES exams(id) ON DELETE CASCADE,
    student_id UUID REFERENCES users(id) ON DELETE CASCADE,
    scheduled_start_time TIMESTAMPTZ,
    scheduled_end_time TIMESTAMPTZ,
    status VARCHAR(50) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'IN_PROGRESS', 'COMPLETED')),
    final_score DECIMAL(5, 2)
);

CREATE TABLE IF NOT EXISTS assigned_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exam_schedule_id UUID NOT NULL REFERENCES exam_schedules(id) ON DELETE RESTRICT,
    question_id UUID NOT NULL REFERENCES questions(id) ON DELETE RESTRICT,
    question_order INT NOT NULL CHECK (question_order > 0),
    content_snapshot TEXT NOT NULL,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_exams_course_id ON exams(course_id);
CREATE INDEX IF NOT EXISTS idx_exams_created_by ON exams(created_by);
CREATE INDEX IF NOT EXISTS idx_questions_course_id ON questions(course_id);
CREATE INDEX IF NOT EXISTS idx_exam_schedules_exam_status ON exam_schedules(exam_id, status);
CREATE INDEX IF NOT EXISTS idx_exam_schedules_student_time ON exam_schedules(student_id, scheduled_start_time);
CREATE INDEX IF NOT EXISTS idx_assigned_questions_question_id ON assigned_questions(question_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_exam_student ON exam_schedules(exam_id, student_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_assigned_order ON assigned_questions(exam_schedule_id, question_order);
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_assigned_question ON assigned_questions(exam_schedule_id, question_id);
