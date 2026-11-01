-- Bộ dữ liệu mô phỏng riêng cho Docker aives_reporting_local. Không reset hoặc ghi đè đánh giá đã lưu.
BEGIN;

DO $$
BEGIN
    IF current_database() <> 'aives_reporting_local' THEN
        RAISE EXCEPTION 'Chỉ chạy dữ liệu mẫu này trên database Docker aives_reporting_local';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM users WHERE id = 'b0000000-0000-0000-0000-000000000001' AND email_normalized = 'lecturer@aives.edu.vn' AND role = 'LECTURER')
       OR NOT EXISTS (SELECT 1 FROM users WHERE id = 'c0000000-0000-0000-0000-000000000001' AND email_normalized = 'student@aives.edu.vn' AND role = 'STUDENT')
       OR NOT EXISTS (SELECT 1 FROM courses WHERE id = '10000000-0000-0000-0000-000000000392')
       OR (SELECT count(*) FROM questions WHERE course_id = '10000000-0000-0000-0000-000000000392'
           AND id IN ('20000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000002','20000000-0000-0000-0000-000000000003')) <> 3 THEN
        RAISE EXCEPTION 'Thiếu tài khoản hoặc dữ liệu SWD392 mẫu; hãy dùng database từ compose.reporting-test.yml';
    END IF;
    IF EXISTS (SELECT 1 FROM exams WHERE id = '31000000-0000-0000-0000-000000000001'
               AND (title <> 'TEST ĐỐI CHIẾU - Trần Thị Bình' OR course_id <> '10000000-0000-0000-0000-000000000392'
                    OR created_by IS DISTINCT FROM 'b0000000-0000-0000-0000-000000000001'::uuid))
       OR EXISTS (SELECT 1 FROM exam_schedules WHERE id = '41000000-0000-0000-0000-000000000001'
                  AND (exam_id <> '31000000-0000-0000-0000-000000000001' OR student_id <> 'c0000000-0000-0000-0000-000000000001')) THEN
        RAISE EXCEPTION 'ID dữ liệu đối chiếu đã được dùng cho đối tượng khác; không thực hiện thay đổi';
    END IF;
END $$;

INSERT INTO exams (id, course_id, title, start_date, end_date, max_main_questions, max_followup_questions, created_by)
VALUES ('31000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000392',
        'TEST ĐỐI CHIẾU - Trần Thị Bình', CURRENT_TIMESTAMP - INTERVAL '3 days', CURRENT_TIMESTAMP - INTERVAL '1 day',
        3, 0, 'b0000000-0000-0000-0000-000000000001')
ON CONFLICT DO NOTHING;

INSERT INTO exam_schedules (id, exam_id, student_id, scheduled_start_time, scheduled_end_time, status, final_score,
                            actual_start_time, actual_end_time, ai_report)
VALUES ('41000000-0000-0000-0000-000000000001', '31000000-0000-0000-0000-000000000001',
        'c0000000-0000-0000-0000-000000000001', CURRENT_TIMESTAMP - INTERVAL '2 days',
        CURRENT_TIMESTAMP - INTERVAL '2 days' + INTERVAL '45 minutes', 'COMPLETED', 7.00,
        CURRENT_TIMESTAMP - INTERVAL '2 days', CURRENT_TIMESTAMP - INTERVAL '2 days' + INTERVAL '40 minutes',
        jsonb_build_object('total_score', 7, 'scale', 10, 'summary', 'Dữ liệu mô phỏng để kiểm thử, không phải kết quả Gemini.',
          'assessed_criteria', 3, 'criteria', jsonb_build_array(
            jsonb_build_object('criterion_id','concept','name','Khái niệm','weight',35,'score',8,'assessed',true,'rationale','Nhận xét AI mô phỏng.','improvement',''),
            jsonb_build_object('criterion_id','analysis','name','Phân tích','weight',35,'score',6,'assessed',true,'rationale','Nhận xét AI mô phỏng.','improvement',''),
            jsonb_build_object('criterion_id','communication','name','Trình bày','weight',30,'score',7,'assessed',true,'rationale','Nhận xét AI mô phỏng.','improvement',''))))
ON CONFLICT DO NOTHING;

INSERT INTO assigned_questions (id, exam_schedule_id, question_id, question_order, content_snapshot)
SELECT v.id, '41000000-0000-0000-0000-000000000001'::uuid, q.id, v.question_order, q.content
FROM (VALUES
    ('51000000-0000-0000-0000-000000000001'::uuid, '20000000-0000-0000-0000-000000000001'::uuid, 1),
    ('51000000-0000-0000-0000-000000000002'::uuid, '20000000-0000-0000-0000-000000000002'::uuid, 2),
    ('51000000-0000-0000-0000-000000000003'::uuid, '20000000-0000-0000-0000-000000000003'::uuid, 3)
) AS v(id, question_id, question_order) JOIN questions q ON q.id = v.question_id
ON CONFLICT DO NOTHING;

INSERT INTO transcripts (id, exam_schedule_id, question_id, role, text_content, transcript_type)
VALUES
('61000000-0000-0000-0000-000000000001','41000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','STUDENT','SRP nghĩa là một lớp chỉ nên có một lý do để thay đổi.','MAIN'),
('61000000-0000-0000-0000-000000000002','41000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000002','STUDENT','Monolith triển khai một khối; microservices tách thành các dịch vụ.','MAIN'),
('61000000-0000-0000-0000-000000000003','41000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000003','STUDENT','Saga dùng giao dịch bồi hoàn khi một bước thất bại.','MAIN')
ON CONFLICT DO NOTHING;

INSERT INTO question_results (id, exam_schedule_id, question_id, ai_score, ai_feedback, max_score)
SELECT v.id, '41000000-0000-0000-0000-000000000001'::uuid, v.question_id, v.score, v.feedback, 10
FROM (VALUES
    ('71000000-0000-0000-0000-000000000001'::uuid,'20000000-0000-0000-0000-000000000001'::uuid,8::numeric,'AI mô phỏng: nắm đúng ý chính.'),
    ('71000000-0000-0000-0000-000000000002'::uuid,'20000000-0000-0000-0000-000000000002'::uuid,6::numeric,'AI mô phỏng: cần thêm ví dụ so sánh.'),
    ('71000000-0000-0000-0000-000000000003'::uuid,'20000000-0000-0000-0000-000000000003'::uuid,7::numeric,'AI mô phỏng: cần phân tích thêm CAP.')
) AS v(id, question_id, score, feedback)
WHERE NOT EXISTS (SELECT 1 FROM question_results r WHERE r.exam_schedule_id = '41000000-0000-0000-0000-000000000001' AND r.question_id = v.question_id)
ON CONFLICT DO NOTHING;

COMMIT;
