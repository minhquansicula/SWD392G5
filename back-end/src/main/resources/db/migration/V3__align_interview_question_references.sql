-- Support both the original question_id schema and the updated scriptDB.sql schema.
CREATE TABLE IF NOT EXISTS transcripts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exam_schedule_id UUID REFERENCES exam_schedules(id) ON DELETE CASCADE,
    assigned_question_id UUID REFERENCES assigned_questions(id) ON DELETE CASCADE,
    parent_transcript_id UUID REFERENCES transcripts(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL CHECK (role IN ('AI', 'STUDENT')),
    text_content TEXT NOT NULL,
    audio_url VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS question_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exam_schedule_id UUID REFERENCES exam_schedules(id) ON DELETE CASCADE,
    assigned_question_id UUID REFERENCES assigned_questions(id) ON DELETE CASCADE,
    ai_score DECIMAL(5, 2),
    ai_feedback TEXT
);

ALTER TABLE transcripts ADD COLUMN IF NOT EXISTS assigned_question_id UUID
    REFERENCES assigned_questions(id) ON DELETE CASCADE;
ALTER TABLE question_results ADD COLUMN IF NOT EXISTS assigned_question_id UUID
    REFERENCES assigned_questions(id) ON DELETE CASCADE;

-- Legacy records have no historical snapshot. Preserve their current question content
-- at migration time, without deleting or rewriting any transcript/score payload.
DO $$
DECLARE
    source_table TEXT;
BEGIN
    FOREACH source_table IN ARRAY ARRAY['transcripts', 'question_results'] LOOP
        IF EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_schema = current_schema() AND table_name = source_table AND column_name = 'question_id') THEN
            EXECUTE format($sql$
                INSERT INTO assigned_questions (exam_schedule_id, question_id, question_order, content_snapshot)
                SELECT legacy.exam_schedule_id, legacy.question_id,
                       COALESCE((SELECT MAX(a.question_order) FROM assigned_questions a
                                 WHERE a.exam_schedule_id = legacy.exam_schedule_id), 0)
                       + ROW_NUMBER() OVER (PARTITION BY legacy.exam_schedule_id ORDER BY legacy.question_id),
                       q.content
                FROM (SELECT DISTINCT exam_schedule_id, question_id FROM %I
                      WHERE assigned_question_id IS NULL AND exam_schedule_id IS NOT NULL AND question_id IS NOT NULL) legacy
                JOIN questions q ON q.id = legacy.question_id
                WHERE NOT EXISTS (SELECT 1 FROM assigned_questions a
                                  WHERE a.exam_schedule_id = legacy.exam_schedule_id AND a.question_id = legacy.question_id)
                $sql$, source_table);
            EXECUTE format($sql$
                UPDATE %I legacy SET assigned_question_id = a.id
                FROM assigned_questions a
                WHERE legacy.assigned_question_id IS NULL
                  AND a.exam_schedule_id = legacy.exam_schedule_id AND a.question_id = legacy.question_id
                $sql$, source_table);
        END IF;
    END LOOP;
END $$;

-- Deliberately fail on conflicting historical scores rather than discard data.
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_result_assignment ON question_results(assigned_question_id);
CREATE INDEX IF NOT EXISTS idx_transcripts_assignment ON transcripts(assigned_question_id);
