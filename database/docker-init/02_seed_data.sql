-- ==============================================================================
-- AIVES (AI Viva Examination System) - Docker Seed Data
-- Khởi tạo dữ liệu mẫu chuẩn chỉ cho: ADMIN, LECTURER, STUDENT,
-- Môn học, Ngân hàng câu hỏi, Rubric, Lịch thi diễn ra NGAY LÚC KHỞI CHẠY
-- ==============================================================================

-- 1. TẠO TÀI KHOẢN NGƯỜI DÙNG (USERS)
-- Mật khẩu mặc định:
-- Quản trị viên: Admin@123
-- Giảng viên:    Lecturer@123
-- Sinh viên:     Student@123
INSERT INTO "users" (
    "id", "email", "email_normalized", "password_hash", "full_name", 
    "role", "student_code", "is_system_admin", "password_set_at"
) VALUES
-- Quản trị viên (ADMIN)
(
    'a0000000-0000-0000-0000-000000000001',
    'admin@aives.edu.vn',
    'admin@aives.edu.vn',
    '$2a$10$iapJIPLcYcklHe0nM9hTwOau5OkXzorazHb/kSyWSre377jTOjr7q', -- Admin@123
    'Quản Trị Viên Hệ Thống',
    'ADMIN',
    NULL,
    true,
    CURRENT_TIMESTAMP
),
-- Giảng viên 1 (LECTURER)
(
    'b0000000-0000-0000-0000-000000000001',
    'lecturer@aives.edu.vn',
    'lecturer@aives.edu.vn',
    '$2a$10$zBYDwNOn5fD207kSkyokh.G8lemf7TP4Iinghoq1CiaKmd8L4LRaC', -- Lecturer@123
    'TS. Nguyễn Văn An',
    'LECTURER',
    NULL,
    false,
    CURRENT_TIMESTAMP
),
-- Giảng viên 2 (LECTURER)
(
    'b0000000-0000-0000-0000-000000000002',
    'lecturer2@aives.edu.vn',
    'lecturer2@aives.edu.vn',
    '$2a$10$zBYDwNOn5fD207kSkyokh.G8lemf7TP4Iinghoq1CiaKmd8L4LRaC', -- Lecturer@123
    'ThS. Lê Thị Thu Thảo',
    'LECTURER',
    NULL,
    false,
    CURRENT_TIMESTAMP
),
-- Sinh viên 1 (STUDENT - Tài khoản kiểm thử chính thức)
(
    'c0000000-0000-0000-0000-000000000001',
    'student@aives.edu.vn',
    'student@aives.edu.vn',
    '$2a$10$93ttQVEdnm0oHvxl1mguBu6.B8w0j7iC5uizRbPq67t//eAmIA/B.', -- Student@123
    'Trần Thị Bình',
    'STUDENT',
    'SE180001',
    false,
    CURRENT_TIMESTAMP
),
-- Sinh viên 2 (STUDENT - Tài khoản cá nhân dùng đăng nhập trên Mobile)
(
    'c0000000-0000-0000-0000-000000000002',
    'hoangma.se200043@gmail.com',
    'hoangma.se200043@gmail.com',
    '$2a$10$93ttQVEdnm0oHvxl1mguBu6.B8w0j7iC5uizRbPq67t//eAmIA/B.', -- Student@123
    'Mai Anh Hoàng',
    'STUDENT',
    'SE200043',
    false,
    CURRENT_TIMESTAMP
);

-- ==============================================================================
-- 2. TẠO MÔN HỌC (COURSES) & PHÂN CÔNG GIẢNG VIÊN (COURSE_LECTURERS)
-- ==============================================================================
INSERT INTO "courses" ("id", "course_code", "course_name") VALUES
(
    '10000000-0000-0000-0000-000000000392',
    'SWD392',
    'Thiết kế và Kiến trúc Phần mềm (Software Architecture & Design)'
),
(
    '10000000-0000-0000-0000-000000000231',
    'PRN231',
    'Xây dựng Ứng dụng Phân tán (Building Distributed Applications)'
),
(
    '10000000-0000-0000-0000-000000000101',
    'CS101',
    'Lập trình Hướng đối tượng Nâng cao (Advanced OOP)'
);

-- Phân công TS. Nguyễn Văn An phụ trách SWD392 và PRN231
INSERT INTO "course_lecturers" ("course_id", "lecturer_id", "assigned_by") VALUES
('10000000-0000-0000-0000-000000000392', 'b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001'),
('10000000-0000-0000-0000-000000000231', 'b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001'),
('10000000-0000-0000-0000-000000000392', 'b0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001');

-- ==============================================================================
-- 3. RUBRIC MÔN HỌC (RUBRICS) - Chuẩn Schema RubricData của Python viva-ai-v2
-- ==============================================================================
INSERT INTO "rubrics" ("id", "course_id", "title", "data", "created_at") VALUES
(
    '80000000-0000-0000-0000-000000000392',
    '10000000-0000-0000-0000-000000000392',
    'Rubric Vấn đáp Môn Kiến trúc Phần mềm (SWD392)',
    '{
        "title": "Rubric Vấn đáp Môn Thiết kế và Kiến trúc Phần mềm (SWD392)",
        "criteria": [
            {
                "id": "crit_concept",
                "name": "Nắm vững Khái niệm Cốt lõi & Nguyên lý Thiết kế",
                "description": "Thí sinh hiểu rõ và giải thích chính xác các khái niệm kiến trúc, nguyên lý SOLID, mẫu thiết kế hướng đối tượng và kiến trúc phân tán.",
                "weight": 35
            },
            {
                "id": "crit_analysis",
                "name": "Năng lực Phân tích & So sánh Giải pháp Kỹ thuật",
                "description": "Thí sinh phân tích được bài toán thực tiễn, so sánh ưu nhược điểm giữa các giải pháp kiến trúc (Monolith vs Microservices, Saga, CAP Theorem, Event-Driven).",
                "weight": 35
            },
            {
                "id": "crit_communication",
                "name": "Tư duy Phản biện & Kỹ năng Trình bày Vấn đáp",
                "description": "Thí sinh diễn đạt gãy gọn, lập luận logic, tự tin và phản hồi chuẩn xác các câu hỏi đào sâu (Socratic probing) của Giám khảo AI.",
                "weight": 30
            }
        ]
    }'::jsonb,
    CURRENT_TIMESTAMP
);

-- ==============================================================================
-- 4. TÀI LIỆU GIÁO TRÌNH & CHUNKS VECTOR CHO RAG PYTHON (AI_DOCUMENTS, CHUNKS)
-- ==============================================================================
INSERT INTO "ai_documents" (
    "id", "course_id", "filename", "sha256", "embedding_model", "chunk_count", "created_at"
) VALUES (
    'd0000000-0000-0000-0000-000000000392',
    '10000000-0000-0000-0000-000000000392',
    'SWD392_Software_Architecture_Handbook.pdf',
    'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    'gemini-embedding-001',
    3,
    CURRENT_TIMESTAMP
);

-- Nạp 3 chunk kiến thức cốt lõi kèm vector 768 chiều phục vụ cosine similarity
INSERT INTO "ai_document_chunks" (
    "id", "document_id", "course_id", "position", "page", "text", "embedding"
) VALUES
(
    'dc000000-0000-0000-0000-000000000001',
    'd0000000-0000-0000-0000-000000000392',
    '10000000-0000-0000-0000-000000000392',
    1,
    12,
    'Nguyên lý thiết kế SOLID: Single Responsibility Principle (SRP) phát biểu rằng một lớp chỉ nên có một lý do duy nhất để thay đổi. Open/Closed Principle (OCP) yêu cầu hệ thống mở cho việc mở rộng nhưng đóng cho việc sửa đổi. Liskov Substitution Principle (LSP) bảo đảm các lớp con có thể thay thế hoàn toàn cho lớp cha. Interface Segregation (ISP) chia nhỏ interface theo mục đích. Dependency Inversion (DIP) đảo ngược phụ thuộc qua abstraction.',
    ('[' || array_to_string(array_fill(0.012::float4, ARRAY[768]), ',') || ']')::vector
),
(
    'dc000000-0000-0000-0000-000000000002',
    'd0000000-0000-0000-0000-000000000392',
    '10000000-0000-0000-0000-000000000392',
    2,
    45,
    'Kiến trúc Monolithic gom toàn bộ giao diện, nghiệp vụ và truy cập dữ liệu vào một khối duy nhất. Ưu điểm là triển khai ban đầu đơn giản, test dễ dàng. Nhược điểm là khó mở rộng từng phần, rủi ro sập toàn bộ hệ thống khi một module gặp sự cố. Kiến trúc Microservices chia tách hệ thống thành các dịch vụ độc lập theo nghiệp vụ, mỗi dịch vụ quản lý database riêng và giao tiếp qua REST, gRPC hoặc Message Queue.',
    ('[' || array_to_string(array_fill(0.025::float4, ARRAY[768]), ',') || ']')::vector
),
(
    'dc000000-0000-0000-0000-000000000003',
    'd0000000-0000-0000-0000-000000000392',
    '10000000-0000-0000-0000-000000000392',
    3,
    78,
    'Định lý CAP chỉ ra trong môi trường phân tán mạng có phân mảnh (Partition Tolerance), hệ thống chỉ có thể đánh đổi giữa tính Nhất quán (Consistency) và tính Khả dụng (Availability). Để xử lý giao dịch phân tán kéo dài qua nhiều service, Saga Pattern thay thế giao dịch 2PC blocking bằng chuỗi các local transaction cùng các compensating transaction nhằm rollback trạng thái khi có lỗi.',
    ('[' || array_to_string(array_fill(0.038::float4, ARRAY[768]), ',') || ']')::vector
);

-- ==============================================================================
-- 5. NGÂN HÀNG CÂU HỎI VẤN ĐÁP (QUESTIONS)
-- ==============================================================================
INSERT INTO "questions" ("id", "course_id", "content", "difficulty_level", "topic", "expected_answer") VALUES
(
    '20000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000392',
    'Trình bày 5 nguyên lý thiết kế SOLID trong lập trình hướng đối tượng. Hãy giải thích chi tiết nguyên lý Đơn trách nhiệm (Single Responsibility Principle) và cách áp dụng trong kiến trúc phân lớp Clean Architecture.',
    'EASY',
    'Nguyên lý Thiết kế Hướng đối tượng (SOLID)',
    'SOLID gồm SRP, OCP, LSP, ISP, DIP. Trong Clean Architecture, SRP thể hiện qua việc tách bạch Controller (nhận request), Use Case / Service (xử lý logic nghiệp vụ), Repository (truy xuất DB) để mỗi class chỉ có một lý do thay đổi.'
),
(
    '20000000-0000-0000-0000-000000000002',
    '10000000-0000-0000-0000-000000000392',
    'So sánh sự khác biệt giữa kiến trúc Monolithic và Microservices. Khi xây dựng một sàn thương mại điện tử lớn, bạn sẽ lựa chọn kiến trúc nào và phân chia các bounded context như thế nào?',
    'MEDIUM',
    'Kiến trúc Phần mềm & Microservices',
    'Monolith dễ khởi đầu nhưng khó scale độc lập và độ phụ thuộc cao. Microservices cho phép triển khai độc lập, chọn stack công nghệ tối ưu cho từng service. Các bounded context tiêu biểu: User/Auth, Product Catalog, Order, Payment, Shipping, Notification.'
),
(
    '20000000-0000-0000-0000-000000000003',
    '10000000-0000-0000-0000-000000000392',
    'Phân tích định lý CAP trong hệ thống phân tán. Giải thích cách mẫu thiết kế Saga Pattern (Choreography vs Orchestration) giải quyết bài toán giao dịch phân tán và xử lý bồi hoàn (Compensating Transaction) khi xảy ra sự cố thanh toán.',
    'HARD',
    'Giao dịch Phân tán & Saga Pattern',
    'Định lý CAP bắt buộc chọn AP hoặc CP khi xảy ra Network Partition. 2PC làm tắc nghẽn tài nguyên nên Saga được dùng thay thế. Choreography trao đổi qua event giữa các service. Orchestration có orchestrator trung tâm điều khiển quy trình. Khi bước thanh toán thất bại, compensating transaction sẽ hoàn tiền hoặc hủy đơn hàng.'
),
(
    '20000000-0000-0000-0000-000000000004',
    '10000000-0000-0000-0000-000000000231',
    'So sánh cơ chế truyền tải thông điệp giữa RESTful API qua HTTP/1.1 và gRPC qua HTTP/2. Tại sao gRPC và Protocol Buffers lại là lựa chọn tối ưu cho giao tiếp nội bộ giữa các microservices?',
    'MEDIUM',
    'Giao tiếp Microservices & gRPC',
    'gRPC dùng HTTP/2 hỗ trợ multiplexing, streaming hai chiều, nén header và truyền tải nhị phân qua Protobuf nhỏ gọn hơn nhiều so với chuỗi văn bản JSON của REST HTTP/1.1, giúp giảm đáng kể độ trễ mạng.'
);

-- ==============================================================================
-- 6. KỲ THI VẤN ĐÁP (EXAMS)
-- ==============================================================================
INSERT INTO "exams" (
    "id", "course_id", "title", "start_date", "end_date",
    "max_main_questions", "max_followup_questions", "created_by",
    "max_followups_per_main", "main_answer_time_limit_seconds", "followup_answer_time_limit_seconds"
) VALUES 
(
    '30000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000392',
    'Kỳ thi Vấn đáp: Thiết kế & Kiến trúc Phần mềm (SWD392)',
    CURRENT_TIMESTAMP - INTERVAL '1 day',
    CURRENT_TIMESTAMP + INTERVAL '3 days',
    3,
    3,
    'b0000000-0000-0000-0000-000000000001',
    1,
    180,
    60
),
(
    '30000000-0000-0000-0000-000000000002',
    '10000000-0000-0000-0000-000000000392',
    'Kỳ thi Vấn đáp: Kiến trúc Phần mềm (Đợt 1 - Đã hoàn thành)',
    CURRENT_TIMESTAMP - INTERVAL '10 days',
    CURRENT_TIMESTAMP - INTERVAL '2 days',
    3,
    3,
    'b0000000-0000-0000-0000-000000000001',
    1,
    180,
    60
);

-- ==============================================================================
-- 7. LỊCH THI CỦA SINH VIÊN (EXAM_SCHEDULES)
-- CỰC KỲ QUAN TRỌNG: Lịch thi diễn ra NGAY LÚC KHỞI CHẠY (CURRENT_TIMESTAMP)
-- để sinh viên đăng nhập vào là thấy ca thi "Đang diễn ra" và bấm vào phòng thi ngay!
-- ==============================================================================
INSERT INTO "exam_schedules" (
    "id", "exam_id", "student_id", "scheduled_start_time", "scheduled_end_time",
    "status", "final_score", "is_connected", "graded_by"
) VALUES
-- Ca thi 1: Dành cho sinh viên mẫu student@aives.edu.vn (ĐANG DIỄN RA NGAY LÚC NÀY)
(
    '40000000-0000-0000-0000-000000000001',
    '30000000-0000-0000-0000-000000000001',
    'c0000000-0000-0000-0000-000000000001',
    CURRENT_TIMESTAMP - INTERVAL '15 minutes',
    CURRENT_TIMESTAMP + INTERVAL '105 minutes',
    'PENDING',
    NULL,
    false,
    NULL
),
-- Ca thi 2: Dành cho tài khoản cá nhân hoangma.se200043@gmail.com (ĐANG DIỄN RA NGAY LÚC NÀY)
(
    '40000000-0000-0000-0000-000000000002',
    '30000000-0000-0000-0000-000000000001',
    'c0000000-0000-0000-0000-000000000002',
    CURRENT_TIMESTAMP - INTERVAL '15 minutes',
    CURRENT_TIMESTAMP + INTERVAL '105 minutes',
    'PENDING',
    NULL,
    false,
    NULL
),
-- Ca thi 3: Ca thi đã hoàn tất có điểm để test màn hình Báo cáo & Bảng điểm
(
    '40000000-0000-0000-0000-000000000003',
    '30000000-0000-0000-0000-000000000002',
    'c0000000-0000-0000-0000-000000000001',
    CURRENT_TIMESTAMP - INTERVAL '2 days',
    CURRENT_TIMESTAMP - INTERVAL '2 days' + INTERVAL '45 minutes',
    'COMPLETED',
    8.85,
    false,
    'b0000000-0000-0000-0000-000000000001'
);

-- ==============================================================================
-- 8. GÁN CÂU HỎI VÀO CA THI (ASSIGNED_QUESTIONS)
-- Bốc thăm sẵn 3 câu hỏi đại diện cho 3 độ khó để Python AI xướng đề ngay
-- ==============================================================================
-- Gán cho Ca thi 1 (student@aives.edu.vn)
INSERT INTO "assigned_questions" ("id", "exam_schedule_id", "question_id", "question_order", "content_snapshot") VALUES
(
    '50000000-0000-0000-0000-000000000001',
    '40000000-0000-0000-0000-000000000001',
    '20000000-0000-0000-0000-000000000001',
    1,
    'Trình bày 5 nguyên lý thiết kế SOLID trong lập trình hướng đối tượng. Hãy giải thích chi tiết nguyên lý Đơn trách nhiệm (Single Responsibility Principle) và cách áp dụng trong kiến trúc phân lớp Clean Architecture.'
),
(
    '50000000-0000-0000-0000-000000000002',
    '40000000-0000-0000-0000-000000000001',
    '20000000-0000-0000-0000-000000000002',
    2,
    'So sánh sự khác biệt giữa kiến trúc Monolithic và Microservices. Khi xây dựng một sàn thương mại điện tử lớn, bạn sẽ lựa chọn kiến trúc nào và phân chia các bounded context như thế nào?'
),
(
    '50000000-0000-0000-0000-000000000003',
    '40000000-0000-0000-0000-000000000001',
    '20000000-0000-0000-0000-000000000003',
    3,
    'Phân tích định lý CAP trong hệ thống phân tán. Giải thích cách mẫu thiết kế Saga Pattern (Choreography vs Orchestration) giải quyết bài toán giao dịch phân tán và xử lý bồi hoàn (Compensating Transaction) khi xảy ra sự cố thanh toán.'
);

-- Gán cho Ca thi 2 (hoangma.se200043@gmail.com)
INSERT INTO "assigned_questions" ("id", "exam_schedule_id", "question_id", "question_order", "content_snapshot") VALUES
(
    '50000000-0000-0000-0000-000000000004',
    '40000000-0000-0000-0000-000000000002',
    '20000000-0000-0000-0000-000000000001',
    1,
    'Trình bày 5 nguyên lý thiết kế SOLID trong lập trình hướng đối tượng. Hãy giải thích chi tiết nguyên lý Đơn trách nhiệm (Single Responsibility Principle) và cách áp dụng trong kiến trúc phân lớp Clean Architecture.'
),
(
    '50000000-0000-0000-0000-000000000005',
    '40000000-0000-0000-0000-000000000002',
    '20000000-0000-0000-0000-000000000002',
    2,
    'So sánh sự khác biệt giữa kiến trúc Monolithic và Microservices. Khi xây dựng một sàn thương mại điện tử lớn, bạn sẽ lựa chọn kiến trúc nào và phân chia các bounded context như thế nào?'
),
(
    '50000000-0000-0000-0000-000000000006',
    '40000000-0000-0000-0000-000000000002',
    '20000000-0000-0000-0000-000000000003',
    3,
    'Phân tích định lý CAP trong hệ thống phân tán. Giải thích cách mẫu thiết kế Saga Pattern (Choreography vs Orchestration) giải quyết bài toán giao dịch phân tán và xử lý bồi hoàn (Compensating Transaction) khi xảy ra sự cố thanh toán.'
);

-- ==============================================================================
-- 9. DỮ LIỆU ĐÀM THOẠI & KẾT QUẢ MẪU (CHO CA THI 3 ĐÃ HOÀN TẤT)
-- ==============================================================================
INSERT INTO "transcripts" (
    "id", "exam_schedule_id", "question_id", "role", "text_content", "transcript_type"
) VALUES
(
    '60000000-0000-0000-0000-000000000001',
    '40000000-0000-0000-0000-000000000003',
    '20000000-0000-0000-0000-000000000001',
    'AI',
    'Chào bạn, chúng ta bắt đầu với câu hỏi đầu tiên: Bạn hãy trình bày về nguyên lý Single Responsibility Principle trong bộ nguyên lý SOLID nhé.',
    'MAIN'
),
(
    '60000000-0000-0000-0000-000000000002',
    '40000000-0000-0000-0000-000000000003',
    '20000000-0000-0000-0000-000000000001',
    'STUDENT',
    'Thưa thầy cô và Giám khảo AI, nguyên lý Single Responsibility Principle phát biểu rằng một class chỉ nên đảm nhận một trách nhiệm duy nhất và chỉ có một lý do duy nhất để thay đổi. Ví dụ trong dự án phần mềm, lớp UserService chỉ nên phụ trách nghiệp vụ người dùng, không nên kiêm thêm việc gửi email hay xử lý log database.',
    'MAIN'
);

INSERT INTO "question_results" (
    "id", "exam_schedule_id", "question_id", "ai_score", "ai_feedback", "lecturer_score", "lecturer_feedback"
) VALUES (
    '70000000-0000-0000-0000-000000000001',
    '40000000-0000-0000-0000-000000000003',
    '20000000-0000-0000-0000-000000000001',
    9.00,
    'Thí sinh nắm rất vững nguyên lý SRP, lấy ví dụ thực tế mạch lạc và đúng trọng tâm chuyên môn.',
    8.85,
    'Đồng ý với đánh giá của AI Examiner. Thí sinh trả lời tự tin.'
);
