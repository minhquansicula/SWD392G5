TRUNCATE TABLE 
    "transcripts",
    "question_results",
    "assigned_questions",
    "exam_schedules",
    "exams",
    "questions",
    "course_lecturers",
    "courses",
    "documents"
RESTART IDENTITY CASCADE;


-- 1. Thêm dữ liệu mẫu vào bảng courses
INSERT INTO "courses" ("id", "course_code", "course_name") VALUES
('11111111-1111-1111-1111-111111111111', 'CS101', 'Nhập môn Lập trình'),
('11111111-1111-1111-1111-111111111112', 'CS102', 'Cấu trúc Dữ liệu và Giải thuật');

-- 2. Phân công giảng viên cho khóa học (course_lecturers)
-- lecturer_id = Giảng Viên Nguyễn Văn An | assigned_by = Quản Trị Viên Hệ Thống
INSERT INTO "course_lecturers" ("course_id", "lecturer_id", "assigned_by") VALUES
('11111111-1111-1111-1111-111111111111', '6ab040f2-6cc0-49b2-b660-f73689056a99', '1182d2a2-b27a-48a9-bd63-eb9cd06976a9'),
('11111111-1111-1111-1111-111111111112', '6ab040f2-6cc0-49b2-b660-f73689056a99', '1182d2a2-b27a-48a9-bd63-eb9cd06976a9');

-- 3. ĐA DẠNG TRẠNG THÁI: Thêm câu hỏi (questions) với các difficulty_level khác nhau
INSERT INTO "questions" ("id", "course_id", "content", "difficulty_level", "topic", "expected_answer") VALUES
('22222222-2222-2222-2222-222222222221', '11111111-1111-1111-1111-111111111111', 'Biến (variable) trong lập trình là gì?', 'EASY', 'Cơ bản', 'Biến là vùng nhớ dùng để lưu trữ dữ liệu trong quá trình chạy chương trình.'),
('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'Giải thích tính đa hình (Polymorphism) trong OOP.', 'MEDIUM', 'OOP', 'Đa hình là khả năng một đối tượng hoặc phương thức thể hiện dưới nhiều dạng khác nhau.'),
('22222222-2222-2222-2222-222222222223', '11111111-1111-1111-1111-111111111111', 'Phân biệt Interface và Abstract Class?', 'HARD', 'OOP', 'Interface đa kế thừa, Abstract Class đơn kế thừa và có phương thức thực thi.');

-- 4. Tạo bài thi (exams) - Tạo 3 bài để phục vụ 3 trạng thái lịch thi của sinh viên
-- created_by = Giảng Viên Nguyễn Văn An
INSERT INTO "exams" ("id", "course_id", "title", "start_date", "end_date", "max_main_questions", "max_followup_questions", "created_by") VALUES
('33333333-3333-3333-3333-333333333331', '11111111-1111-1111-1111-111111111111', 'Bài thi đã hoàn thành', CURRENT_TIMESTAMP - INTERVAL '7 days', CURRENT_TIMESTAMP, 5, 2, '6ab040f2-6cc0-49b2-b660-f73689056a99'),
('33333333-3333-3333-3333-333333333332', '11111111-1111-1111-1111-111111111111', 'Bài thi đang diễn ra', CURRENT_TIMESTAMP - INTERVAL '1 hour', CURRENT_TIMESTAMP + INTERVAL '1 day', 3, 1, '6ab040f2-6cc0-49b2-b660-f73689056a99'),
('33333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', 'Bài thi sắp tới', CURRENT_TIMESTAMP + INTERVAL '3 days', CURRENT_TIMESTAMP + INTERVAL '10 days', 5, 2, '6ab040f2-6cc0-49b2-b660-f73689056a99');

-- 5. ĐA DẠNG TRẠNG THÁI: Lên lịch thi cho Sinh Viên Trần Thị Bình với đủ 3 status
INSERT INTO "exam_schedules" ("id", "exam_id", "student_id", "scheduled_start_time", "scheduled_end_time", "status", "final_score", "graded_by") VALUES
-- Trạng thái 1: COMPLETED (Đã thi xong, có điểm, có người chấm)
('44444444-4444-4444-4444-444444444441', '33333333-3333-3333-3333-333333333331', '735c7f72-6582-448f-bc22-31a1fa86fb04', CURRENT_TIMESTAMP - INTERVAL '2 days', CURRENT_TIMESTAMP - INTERVAL '2 days' + INTERVAL '1 hour', 'COMPLETED', 8.50, '6ab040f2-6cc0-49b2-b660-f73689056a99'),
-- Trạng thái 2: IN_PROGRESS (Đang thi, chưa có điểm)
('44444444-4444-4444-4444-444444444442', '33333333-3333-3333-3333-333333333332', '735c7f72-6582-448f-bc22-31a1fa86fb04', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + INTERVAL '1 hour', 'IN_PROGRESS', NULL, NULL),
-- Trạng thái 3: PENDING (Chưa diễn ra, chưa có điểm)
('44444444-4444-4444-4444-444444444443', '33333333-3333-3333-3333-333333333333', '735c7f72-6582-448f-bc22-31a1fa86fb04', CURRENT_TIMESTAMP + INTERVAL '4 days', CURRENT_TIMESTAMP + INTERVAL '4 days' + INTERVAL '1 hour', 'PENDING', NULL, NULL);

-- 6. Gán câu hỏi vào các lịch thi (assigned_questions)
INSERT INTO "assigned_questions" ("id", "exam_schedule_id", "question_id", "question_order", "content_snapshot") VALUES
('55555555-5555-5555-5555-555555555551', '44444444-4444-4444-4444-444444444441', '22222222-2222-2222-2222-222222222221', 1, 'Biến (variable) trong lập trình là gì?'),
('55555555-5555-5555-5555-555555555552', '44444444-4444-4444-4444-444444444441', '22222222-2222-2222-2222-222222222222', 2, 'Giải thích tính đa hình (Polymorphism) trong OOP.'),
('55555555-5555-5555-5555-555555555553', '44444444-4444-4444-4444-444444444442', '22222222-2222-2222-2222-222222222223', 1, 'Phân biệt Interface và Abstract Class?'); -- Đang thi câu khó

-- 7. ĐA DẠNG TRẠNG THÁI: Hội thoại vấn đáp với roles (AI/STUDENT), types (MAIN/FOLLOW_UP), parent_id
INSERT INTO "transcripts" ("id", "exam_schedule_id", "question_id", "parent_transcript_id", "role", "text_content", "transcript_type") VALUES
-- Luồng cho bài COMPLETED (Đã có cả hỏi xoáy đáp xoay FOLLOW_UP)
('66666666-6666-6666-6666-666666666661', '44444444-4444-4444-4444-444444444441', '22222222-2222-2222-2222-222222222221', NULL, 'AI', 'Chào bạn, hãy cho biết biến trong lập trình là gì?', 'MAIN'),
('66666666-6666-6666-6666-666666666662', '44444444-4444-4444-4444-444444444441', '22222222-2222-2222-2222-222222222221', '66666666-6666-6666-6666-666666666661', 'STUDENT', 'Thưa thầy/cô, biến là một nơi dùng để lưu trữ dữ liệu.', 'MAIN'),
('66666666-6666-6666-6666-666666666663', '44444444-4444-4444-4444-444444444441', '22222222-2222-2222-2222-222222222221', '66666666-6666-6666-6666-666666666662', 'AI', 'Vậy bạn có thể cho một ví dụ khai báo biến kiểu int trong Java không?', 'FOLLOW_UP'),
('66666666-6666-6666-6666-666666666664', '44444444-4444-4444-4444-444444444441', '22222222-2222-2222-2222-222222222221', '66666666-6666-6666-6666-666666666663', 'STUDENT', 'Dạ ví dụ như: int tuoi = 20; ạ.', 'FOLLOW_UP'),

-- Luồng cho bài IN_PROGRESS (AI mới hỏi, sinh viên chưa kịp trả lời hoặc hệ thống vừa streaming xong)
('66666666-6666-6666-6666-666666666665', '44444444-4444-4444-4444-444444444442', '22222222-2222-2222-2222-222222222223', NULL, 'AI', 'Hãy cho biết điểm khác nhau lớn nhất giữa Interface và Abstract Class là gì?', 'MAIN');

-- 8. Kết quả chấm điểm (Chỉ áp dụng cho bài thi trạng thái COMPLETED)
INSERT INTO "question_results" ("id", "exam_schedule_id", "question_id", "ai_score", "ai_feedback", "lecturer_score", "lecturer_feedback") VALUES
('77777777-7777-7777-7777-777777777771', '44444444-4444-4444-4444-444444444441', '22222222-2222-2222-2222-222222222221', 9.50, 'Trả lời đúng và có ví dụ khai báo chuẩn xác qua câu hỏi follow-up.', 9.00, 'Đồng ý với điểm AI.'),
('77777777-7777-7777-7777-777777777772', '44444444-4444-4444-4444-444444444441', '22222222-2222-2222-2222-222222222222', 7.50, 'Chưa nêu được ví dụ đa hình thực tiễn.', 8.00, 'Cần thêm ví dụ.');