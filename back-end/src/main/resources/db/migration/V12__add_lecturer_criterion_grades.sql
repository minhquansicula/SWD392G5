CREATE TABLE lecturer_criterion_grades (
    exam_schedule_id UUID NOT NULL REFERENCES exam_schedules(id) ON DELETE CASCADE,
    criterion_id VARCHAR(100) NOT NULL,
    score NUMERIC(5, 2) NOT NULL CHECK (score BETWEEN 0 AND 10),
    graded_by UUID REFERENCES users(id) ON DELETE SET NULL,
    graded_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    PRIMARY KEY (exam_schedule_id, criterion_id)
);
ALTER TABLE lecturer_grading_history ADD COLUMN criterion_id VARCHAR(100);
