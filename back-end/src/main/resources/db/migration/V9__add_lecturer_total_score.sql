ALTER TABLE exam_schedules ADD COLUMN lecturer_total_score NUMERIC(5, 2) CHECK (lecturer_total_score BETWEEN 0 AND 10);
CREATE UNIQUE INDEX uq_question_result_schedule_question ON question_results(exam_schedule_id, question_id);
