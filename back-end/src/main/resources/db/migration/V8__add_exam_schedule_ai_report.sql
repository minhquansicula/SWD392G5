-- Rubric-criterion grading report written by the Python AI service after an exam.
ALTER TABLE exam_schedules ADD COLUMN IF NOT EXISTS ai_report JSONB;
