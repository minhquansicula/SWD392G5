-- Chỉ dành cho database Docker aives_reporting_local. Toàn bộ nội dung là dữ liệu mô phỏng.
BEGIN;

-- Sinh viên thứ hai cho bảng thống kê; dùng cùng mật khẩu mẫu với student@aives.edu.vn.
INSERT INTO users (id, email, email_normalized, password_hash, full_name, role, student_code, password_set_at)
SELECT 'c0000000-0000-0000-0000-000000000003', 'report.student2@aives.test',
       'report.student2@aives.test', password_hash, 'Sinh viên thử nghiệm 2',
       'STUDENT', 'TEST002', CURRENT_TIMESTAMP
FROM users WHERE email_normalized = 'student@aives.edu.vn';

-- Giữ ca thi thử mở trong 7 ngày tính từ lần khởi tạo database.
UPDATE exams SET start_date = CURRENT_TIMESTAMP - INTERVAL '1 hour', end_date = CURRENT_TIMESTAMP + INTERVAL '7 days'
WHERE id = '30000000-0000-0000-0000-000000000001';
UPDATE exam_schedules SET scheduled_start_time = CURRENT_TIMESTAMP - INTERVAL '30 minutes',
                          scheduled_end_time = CURRENT_TIMESTAMP + INTERVAL '7 days'
WHERE id = '40000000-0000-0000-0000-000000000001' AND status = 'PENDING';

-- Kỳ thi đã hoàn thành có hai sinh viên để kiểm tra phân bố và thống kê.
INSERT INTO exam_schedules (id, exam_id, student_id, scheduled_start_time, scheduled_end_time,
                            status, final_score, actual_start_time, actual_end_time)
VALUES ('40000000-0000-0000-0000-000000000004', '30000000-0000-0000-0000-000000000002',
        'c0000000-0000-0000-0000-000000000003', CURRENT_TIMESTAMP - INTERVAL '3 days',
        CURRENT_TIMESTAMP - INTERVAL '3 days' + INTERVAL '45 minutes', 'COMPLETED', 6.20,
        CURRENT_TIMESTAMP - INTERVAL '3 days', CURRENT_TIMESTAMP - INTERVAL '3 days' + INTERVAL '40 minutes');

-- Cả hai ca đều được giao cùng 3 câu, bao gồm ca mẫu cũ vốn chưa có assigned_questions.
INSERT INTO assigned_questions (exam_schedule_id, question_id, question_order, content_snapshot)
SELECT s.id, q.id, v.question_order, q.content
FROM (VALUES
    ('40000000-0000-0000-0000-000000000003'::uuid, '20000000-0000-0000-0000-000000000001'::uuid, 1),
    ('40000000-0000-0000-0000-000000000003'::uuid, '20000000-0000-0000-0000-000000000002'::uuid, 2),
    ('40000000-0000-0000-0000-000000000003'::uuid, '20000000-0000-0000-0000-000000000003'::uuid, 3),
    ('40000000-0000-0000-0000-000000000004'::uuid, '20000000-0000-0000-0000-000000000001'::uuid, 1),
    ('40000000-0000-0000-0000-000000000004'::uuid, '20000000-0000-0000-0000-000000000002'::uuid, 2),
    ('40000000-0000-0000-0000-000000000004'::uuid, '20000000-0000-0000-0000-000000000003'::uuid, 3)
) AS v(schedule_id, question_id, question_order)
JOIN exam_schedules s ON s.id = v.schedule_id JOIN questions q ON q.id = v.question_id;

INSERT INTO transcripts (exam_schedule_id, question_id, role, text_content, transcript_type)
VALUES
('40000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000002', 'STUDENT', 'Monolith triển khai một khối; microservices chia thành các dịch vụ độc lập.', 'MAIN'),
('40000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000003', 'STUDENT', 'CAP liên quan đến nhất quán và khả dụng khi mạng bị phân mảnh.', 'MAIN'),
('40000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000001', 'STUDENT', 'SRP giúp một lớp tập trung vào một trách nhiệm.', 'MAIN'),
('40000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000002', 'STUDENT', 'Microservices có thể triển khai các dịch vụ độc lập.', 'MAIN'),
('40000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000003', 'STUDENT', 'Saga sử dụng các bước bồi hoàn khi giao dịch thất bại.', 'MAIN');

INSERT INTO question_results (exam_schedule_id, question_id, ai_score, ai_feedback)
VALUES
('40000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000002', 6, 'Nhận xét mô phỏng: nêu được khác biệt chính, cần phân tích thêm.'),
('40000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000003', 4, 'Nhận xét mô phỏng: cần giải thích thêm về Saga.'),
('40000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000001', 7, 'Nhận xét mô phỏng: nêu đúng ý chính.'),
('40000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000002', 8, 'Nhận xét mô phỏng: trả lời tốt.'),
('40000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000003', 3, 'Nhận xét mô phỏng: cần giải thích thêm về CAP.');

-- Báo cáo rubric mô phỏng; không tuyên bố nội dung này do Gemini tạo.
UPDATE exam_schedules SET ai_report = jsonb_build_object(
    'total_score', 8.85, 'scale', 10, 'summary', 'Dữ liệu mô phỏng: nắm vững kiến thức cơ bản.', 'assessed_criteria', 3,
    'criteria', jsonb_build_array(
        jsonb_build_object('criterion_id','crit_concept','name','Khái niệm','weight',35,'score',9,'assessed',true,'rationale','Nhận xét mô phỏng.','improvement',''),
        jsonb_build_object('criterion_id','crit_analysis','name','Phân tích','weight',35,'score',9,'assessed',true,'rationale','Nhận xét mô phỏng.','improvement',''),
        jsonb_build_object('criterion_id','crit_communication','name','Trình bày','weight',30,'score',8.5,'assessed',true,'rationale','Nhận xét mô phỏng.','improvement','')))
WHERE id = '40000000-0000-0000-0000-000000000003';

UPDATE exam_schedules SET ai_report = jsonb_build_object(
    'total_score', 6.20, 'scale', 10, 'summary', 'Dữ liệu mô phỏng: cần bổ sung ví dụ.', 'assessed_criteria', 3,
    'criteria', jsonb_build_array(
        jsonb_build_object('criterion_id','crit_concept','name','Khái niệm','weight',35,'score',7,'assessed',true,'rationale','Nhận xét mô phỏng.','improvement',''),
        jsonb_build_object('criterion_id','crit_analysis','name','Phân tích','weight',35,'score',6,'assessed',true,'rationale','Nhận xét mô phỏng.','improvement',''),
        jsonb_build_object('criterion_id','crit_communication','name','Trình bày','weight',30,'score',5.5,'assessed',true,'rationale','Nhận xét mô phỏng.','improvement','')))
WHERE id = '40000000-0000-0000-0000-000000000004';

COMMIT;
