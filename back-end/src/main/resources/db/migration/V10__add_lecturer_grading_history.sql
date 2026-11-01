CREATE TABLE lecturer_grading_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exam_schedule_id UUID NOT NULL REFERENCES exam_schedules(id) ON DELETE CASCADE,
    question_id UUID,
    lecturer_id UUID REFERENCES users(id) ON DELETE SET NULL,
    lecturer_name TEXT NOT NULL,
    old_score NUMERIC(5, 2),
    new_score NUMERIC(5, 2),
    old_feedback TEXT,
    new_feedback TEXT,
    changed_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);
CREATE INDEX idx_lecturer_grading_history_schedule ON lecturer_grading_history(exam_schedule_id, changed_at DESC, id DESC);
