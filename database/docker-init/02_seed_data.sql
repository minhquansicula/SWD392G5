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
    'Software Architecture and Design'
),
(
    '10000000-0000-0000-0000-000000000201',
    'PMG201c',
    'Project management'
),
(
    '10000000-0000-0000-0000-000000000301',
    'SBA301',
    'Integrate single page application with Spring Boot'
);

-- Phân công TS. Nguyễn Văn An và ThS. Lê Thị Thu Thảo phụ trách các môn
INSERT INTO "course_lecturers" ("course_id", "lecturer_id", "assigned_by") VALUES
('10000000-0000-0000-0000-000000000392', 'b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001'),
('10000000-0000-0000-0000-000000000392', 'b0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001'),
('10000000-0000-0000-0000-000000000201', 'b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001'),
('10000000-0000-0000-0000-000000000301', 'b0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001');

-- ==============================================================================
-- ==============================================================================
-- 3. RUBRIC MÔN HỌC (RUBRICS) - Bám sát chuẩn 7 CLO của Syllabus SWD392 FPT
-- ==============================================================================
INSERT INTO "rubrics" ("id", "course_id", "title", "data", "created_at") VALUES
(
    '80000000-0000-0000-0000-000000000392',
    '10000000-0000-0000-0000-000000000392',
    'Rubric Vấn đáp Môn Kiến trúc & Thiết kế Phần mềm (SWD392)',
    '{
        "title": "Rubric Vấn đáp Môn Software Architecture and Design (SWD392 - FPT University)",
        "criteria": [
            {
                "id": "crit_design_concepts",
                "name": "Nền tảng Thiết kế & COMET/UML Modeling (CLO1, CLO2, CLO3)",
                "description": "Thí sinh nắm vững quy trình thiết kế phần mềm, phương pháp COMET/UML, mô hình hóa phân tích tĩnh (lớp, quan hệ, multiplicity) và phân tích động (Interaction Diagram, Finite State Machines / Statecharts).",
                "weight": 30
            },
            {
                "id": "crit_architecture_patterns",
                "name": "Kiến trúc Tổng thể, Subsystem & Mẫu Thiết kế (CLO4, CLO6)",
                "description": "Thí sinh có năng lực phân tích và thiết kế kiến trúc tổng thể (Client/Server, Service-Oriented SOA, Component-Based, Concurrent & Real-time); áp dụng và phân tích đánh đổi của GoF Design Patterns (Creational, Structural, Behavioral).",
                "weight": 35
            },
            {
                "id": "crit_database_ai_tools",
                "name": "Thiết kế CSDL & Ứng dụng Công cụ AI trong Kiến trúc (CLO5, CLO7)",
                "description": "Năng lực thiết kế cơ sở dữ liệu quan hệ từ Software Design Model; hiểu cách ứng dụng AI tools (ChatGPT, PlantUML, GitHub Copilot) hỗ trợ sinh ca sử dụng, sinh biểu đồ kiến trúc và phân tích thiết kế.",
                "weight": 20
            },
            {
                "id": "crit_communication_defense",
                "name": "Tư duy Phản biện & Kỹ năng Vấn đáp Bảo vệ Kiến trúc",
                "description": "Trình bày mạch lạc, lập luận logic, tự tin bảo vệ quyết định kỹ thuật trước các câu hỏi đào sâu (Socratic probing) của Giám khảo AI.",
                "weight": 15
            }
        ]
    }'::jsonb,
    CURRENT_TIMESTAMP
);

-- ==============================================================================
-- 4. TÀI LIỆU GIÁO TRÌNH & CHUNKS VECTOR CHO RAG PYTHON (AI_DOCUMENTS, CHUNKS)
-- Bám sát giáo trình H. Gomaa (COMET/UML) & Erich Gamma (Design Patterns)
-- ==============================================================================
INSERT INTO "ai_documents" (
    "id", "course_id", "filename", "sha256", "embedding_model", "chunk_count", "created_at"
) VALUES (
    'd0000000-0000-0000-0000-000000000392',
    '10000000-0000-0000-0000-000000000392',
    'SWD392_Software_Modeling_and_Design_Gomaa.pdf',
    'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    'gemini-embedding-001',
    4,
    CURRENT_TIMESTAMP
);

-- Nạp các chunk kiến thức bám sát Syllabus SWD392 phục vụ RAG
INSERT INTO "ai_document_chunks" (
    "id", "document_id", "course_id", "position", "page", "text", "embedding"
) VALUES
(
    'dc000000-0000-0000-0000-000000000001',
    'd0000000-0000-0000-0000-000000000392',
    '10000000-0000-0000-0000-000000000392',
    1,
    25,
    'Quy trình COMET (Concurrent Object Modeling and Architectural Design Method): Bao gồm mô hình hóa yêu cầu (Use Case Modeling), mô hình hóa phân tích tĩnh (Static Modeling - thực thể, lớp biên, lớp điều khiển theo mẫu BCE/Entity-Boundary-Control), mô hình hóa động (Dynamic Interaction Modeling qua Sequence Diagram) và Statecharts cho các đối tượng phụ thuộc trạng thái (State-dependent objects).',
    ('[' || array_to_string(array_fill(0.012::float4, ARRAY[768]), ',') || ']')::vector
),
(
    'dc000000-0000-0000-0000-000000000002',
    'd0000000-0000-0000-0000-000000000392',
    '10000000-0000-0000-0000-000000000392',
    2,
    140,
    'GoF Design Patterns (Erich Gamma): Creational Patterns (Factory Method, Abstract Factory, Singleton, Builder) quản lý việc khởi tạo đối tượng độc lập với hệ thống. Structural Patterns (Adapter, Facade, Decorator, Composite, Proxy) quản lý ghép nối thành phần và giao diện. Behavioral Patterns (Observer, Strategy, State, Command, Template Method) phân bổ trách nhiệm và thuật toán giữa các đối tượng tương tác.',
    ('[' || array_to_string(array_fill(0.025::float4, ARRAY[768]), ',') || ']')::vector
),
(
    'dc000000-0000-0000-0000-000000000003',
    'd0000000-0000-0000-0000-000000000392',
    '10000000-0000-0000-0000-000000000392',
    3,
    210,
    'Các phong cách kiến trúc phần mềm (Software Architectural Styles): Client/Server Architecture (phân chia Presentation, Application Logic, Database Server), Service-Oriented Architecture SOA & Microservices (các service tự trị giao tiếp qua loose coupling protocol), Component-Based Architecture (tái sử dụng thành phần với contract rõ ràng), và Concurrent / Real-time Architectures (xử lý đa tiến trình, thread safety, message queues).',
    ('[' || array_to_string(array_fill(0.038::float4, ARRAY[768]), ',') || ']')::vector
),
(
    'dc000000-0000-0000-0000-000000000004',
    'd0000000-0000-0000-0000-000000000392',
    '10000000-0000-0000-0000-000000000392',
    4,
    305,
    'Ứng dụng AI Tools trong Kiến trúc phần mềm (CLO7): Sử dụng Prompt Engineering với LLM (như ChatGPT, Copilot) để sinh use case descriptions, tài liệu kiến trúc (Architecture Decision Records - ADR) và mã nguồn PlantUML/Mermaid để tự động hóa vẽ biểu đồ kiến trúc, biểu đồ tuần tự và gợi ý áp dụng mẫu thiết kế.',
    ('[' || array_to_string(array_fill(0.045::float4, ARRAY[768]), ',') || ']')::vector
);

-- ==============================================================================
-- 5. NGÂN HÀNG CÂU HỎI VẤN ĐÁP BÁM SÁT CLO MÔN SWD392 (QUESTIONS)
-- ==============================================================================
INSERT INTO "questions" ("id", "course_id", "content", "difficulty_level", "topic", "expected_answer") VALUES
(
    '20000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000392',
    'Trình bày quy trình phân tích và thiết kế theo phương pháp COMET/UML (CLO1, CLO2). Hãy giải thích cách phân loại các đối tượng theo mẫu BCE (Boundary - Control - Entity) khi thiết kế ca sử dụng và cách chuyển giao sang biểu đồ tuần tự (Sequence Diagram).',
    'EASY',
    'Phương pháp COMET & Phân loại BCE (CLO1, CLO2, CLO3)',
    'COMET gồm Use Case Modeling, Static Modeling, Dynamic Interaction Modeling và Design Modeling. Phân loại BCE: Boundary nhận tương tác từ Actor/User; Control điều phối luồng nghiệp vụ và kiểm tra logic; Entity lưu trữ dữ liệu bền vững. Trong Sequence Diagram, Actor gọi Boundary, Boundary gửi thông điệp tới Control, Control truy xuất và cập nhật Entity.'
),
(
    '20000000-0000-0000-0000-000000000002',
    '10000000-0000-0000-0000-000000000392',
    'So sánh sự khác nhau giữa kiến trúc Client/Server nhiều tầng (Multi-tier) và Kiến trúc Hướng Dịch vụ / Microservices (CLO4). Khi hệ thống cần đáp ứng các thuộc tính chất lượng (Quality Attributes) như Khả năng mở rộng (Scalability) và Tính sẵn sàng (Availability), bạn sẽ đưa ra quyết định phân tách phân hệ (Subsystem Architectural Design) như thế nào?',
    'MEDIUM',
    'Thiết kế Kiến trúc Phần mềm & Phân hệ (CLO4)',
    'Multi-tier tập trung dữ liệu vào DB chung, dễ nhất quán nhưng khó mở rộng độc lập từng module. Microservices phân tách theo bounded context, mỗi dịch vụ có DB riêng và giao tiếp qua API/Message Broker, tối ưu Scalability và Fault Isolation. Phân tách subsystem cần dựa vào cohesion cao, loose coupling và các yêu cầu chất lượng (scalability, security, performance).'
),
(
    '20000000-0000-0000-0000-000000000003',
    '10000000-0000-0000-0000-000000000392',
    'Phân tích hai mẫu thiết kế Observer Pattern và Strategy Pattern trong bộ GoF Patterns (CLO6). Hãy nêu một tình huống thực tế trong đồ án kiến trúc phần mềm mà bạn bắt buộc phải áp dụng mẫu thiết kế này để tránh vi phạm nguyên lý Open/Closed (OCP) và Loose Coupling.',
    'MEDIUM',
    'GoF Design Patterns & Áp dụng thực tiễn (CLO6)',
    'Strategy Pattern đóng gói các thuật toán hoán đổi cho nhau (ví dụ: các phương thức thanh toán VNPay, MoMo, Stripe) giúp thêm phương thức mới mà không sửa code cũ (OCP). Observer Pattern định nghĩa quan hệ 1-nhiều, khi một đối tượng đổi trạng thái thì các observer tự động nhận thông báo (ví dụ: thông báo trạng thái đơn hàng tới Email, SMS, Push Notification) giúp loose coupling.'
),
(
    '20000000-0000-0000-0000-000000000004',
    '10000000-0000-0000-0000-000000000392',
    'Giải thích cách chuyển đổi từ Software Analysis Model (Class Diagram) sang Relational Database Schema (CLO5), bao gồm cách xử lý quan hệ 1-n, n-n và quan hệ kế thừa (Generalization/Inheritance). Đồng thời, bạn đã tận dụng các công cụ AI (ChatGPT, PlantUML, Copilot - CLO7) như thế nào để hỗ trợ kiểm tra và sinh biểu đồ thiết kế?',
    'HARD',
    'Thiết kế CSDL & Ứng dụng AI Tools trong Thiết kế (CLO5, CLO7)',
    'Chuyển đổi: Quan hệ 1-n dùng Foreign Key ở bảng n; quan hệ n-n tạo bảng trung gian (Junction Table); kế thừa xử lý bằng Single Table, Joined Table hoặc Table-per-Class. Về AI Tools (CLO7): Sử dụng prompt có cấu trúc để yêu cầu ChatGPT sinh PlantUML code, dùng Copilot sinh boilerplate code mapping Entity và kiểm tra tính nhất quán giữa Sequence Diagram với Database Schema.'
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
    600,  -- Thời gian trả lời câu hỏi chính: 600 giây (10 phút)
    300   -- Thời gian trả lời câu hỏi phụ (follow-up): 300 giây (5 phút)
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
    "status", "final_score", "lecturer_total_score", "lecturer_total_pending",
    "is_connected", "graded_by", "actual_start_time", "actual_end_time", "ai_report"
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
    NULL,
    false,
    false,
    NULL,
    NULL,
    NULL,
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
    NULL,
    false,
    false,
    NULL,
    NULL,
    NULL,
    NULL
),
-- Ca thi 3: Ca thi đã hoàn tất cho student@aives.edu.vn (có điểm & báo cáo để test Báo cáo / Bảng điểm)
(
    '40000000-0000-0000-0000-000000000003',
    '30000000-0000-0000-0000-000000000002',
    'c0000000-0000-0000-0000-000000000001',
    CURRENT_TIMESTAMP - INTERVAL '2 days',
    CURRENT_TIMESTAMP - INTERVAL '2 days' + INTERVAL '45 minutes',
    'COMPLETED',
    8.85,
    8.85,
    false,
    false,
    'b0000000-0000-0000-0000-000000000001',
    CURRENT_TIMESTAMP - INTERVAL '2 days',
    CURRENT_TIMESTAMP - INTERVAL '2 days' + INTERVAL '40 minutes',
    jsonb_build_object(
        'total_score', 8.85,
        'scale', 10,
        'summary', 'Thí sinh trả lời lưu loát, nắm chắc nguyên lý SOLID và phân tích tốt kiến trúc phần mềm.',
        'assessed_criteria', 3,
        'criteria', jsonb_build_array(
            jsonb_build_object('criterion_id', 'concept', 'name', 'Kiến thức cốt lõi', 'weight', 40, 'score', 9.0, 'assessed', true, 'rationale', 'Nắm vững nguyên lý SRP và thiết kế hướng đối tượng.', 'improvement', ''),
            jsonb_build_object('criterion_id', 'analysis', 'name', 'Phân tích kiến trúc', 'weight', 30, 'score', 8.5, 'assessed', true, 'rationale', 'So sánh rõ ràng giữa Monolith và Microservices.', 'improvement', ''),
            jsonb_build_object('criterion_id', 'communication', 'name', 'Phản xạ và diễn đạt', 'weight', 30, 'score', 9.0, 'assessed', true, 'rationale', 'Trả lời tự tin, mạch lạc.', 'improvement', '')
        )
    )
),
-- Ca thi 4: Ca thi đã hoàn tất cho hoangma.se200043@gmail.com (có điểm & báo cáo để test trực tiếp trên Mobile)
(
    '40000000-0000-0000-0000-000000000004',
    '30000000-0000-0000-0000-000000000002',
    'c0000000-0000-0000-0000-000000000002',
    CURRENT_TIMESTAMP - INTERVAL '2 days',
    CURRENT_TIMESTAMP - INTERVAL '2 days' + INTERVAL '45 minutes',
    'COMPLETED',
    8.50,
    8.50,
    false,
    false,
    'b0000000-0000-0000-0000-000000000001',
    CURRENT_TIMESTAMP - INTERVAL '2 days',
    CURRENT_TIMESTAMP - INTERVAL '2 days' + INTERVAL '42 minutes',
    jsonb_build_object(
        'total_score', 8.50,
        'scale', 10,
        'summary', 'Thí sinh nắm chắc kiến thức cơ bản, xử lý tốt câu hỏi phản biện của AI Examiner.',
        'assessed_criteria', 3,
        'criteria', jsonb_build_array(
            jsonb_build_object('criterion_id', 'concept', 'name', 'Kiến thức cốt lõi', 'weight', 40, 'score', 8.5, 'assessed', true, 'rationale', 'Nắm vững các nguyên lý thiết kế.', 'improvement', ''),
            jsonb_build_object('criterion_id', 'analysis', 'name', 'Phân tích kiến trúc', 'weight', 30, 'score', 8.5, 'assessed', true, 'rationale', 'Phân tích tốt các ca sử dụng.', 'improvement', ''),
            jsonb_build_object('criterion_id', 'communication', 'name', 'Phản xạ và diễn đạt', 'weight', 30, 'score', 8.5, 'assessed', true, 'rationale', 'Trình bày trôi chảy.', 'improvement', '')
        )
    )
);

-- ==============================================================================
-- 8. GÁN CÂU HỎI VÀO CA THI (ASSIGNED_QUESTIONS)
-- Bốc thăm sẵn các câu hỏi bám sát COMET/UML, Design Patterns, Kiến trúc phần mềm
-- ==============================================================================
-- Gán cho Ca thi 1 (student@aives.edu.vn)
INSERT INTO "assigned_questions" ("id", "exam_schedule_id", "question_id", "question_order", "content_snapshot") VALUES
(
    '50000000-0000-0000-0000-000000000001',
    '40000000-0000-0000-0000-000000000001',
    '20000000-0000-0000-0000-000000000001',
    1,
    'Trình bày quy trình phân tích và thiết kế theo phương pháp COMET/UML (CLO1, CLO2). Hãy giải thích cách phân loại các đối tượng theo mẫu BCE (Boundary - Control - Entity) khi thiết kế ca sử dụng và cách chuyển giao sang biểu đồ tuần tự (Sequence Diagram).'
),
(
    '50000000-0000-0000-0000-000000000002',
    '40000000-0000-0000-0000-000000000001',
    '20000000-0000-0000-0000-000000000002',
    2,
    'So sánh sự khác nhau giữa kiến trúc Client/Server nhiều tầng (Multi-tier) và Kiến trúc Hướng Dịch vụ / Microservices (CLO4). Khi hệ thống cần đáp ứng các thuộc tính chất lượng (Quality Attributes) như Khả năng mở rộng (Scalability) và Tính sẵn sàng (Availability), bạn sẽ đưa ra quyết định phân tách phân hệ (Subsystem Architectural Design) như thế nào?'
),
(
    '50000000-0000-0000-0000-000000000003',
    '40000000-0000-0000-0000-000000000001',
    '20000000-0000-0000-0000-000000000003',
    3,
    'Phân tích hai mẫu thiết kế Observer Pattern và Strategy Pattern trong bộ GoF Patterns (CLO6). Hãy nêu một tình huống thực tế trong đồ án kiến trúc phần mềm mà bạn bắt buộc phải áp dụng mẫu thiết kế này để tránh vi phạm nguyên lý Open/Closed (OCP) và Loose Coupling.'
);

-- Gán cho Ca thi 2 (hoangma.se200043@gmail.com - Đang diễn ra)
INSERT INTO "assigned_questions" ("id", "exam_schedule_id", "question_id", "question_order", "content_snapshot") VALUES
(
    '50000000-0000-0000-0000-000000000004',
    '40000000-0000-0000-0000-000000000002',
    '20000000-0000-0000-0000-000000000001',
    1,
    'Trình bày quy trình phân tích và thiết kế theo phương pháp COMET/UML (CLO1, CLO2). Hãy giải thích cách phân loại các đối tượng theo mẫu BCE (Boundary - Control - Entity) khi thiết kế ca sử dụng và cách chuyển giao sang biểu đồ tuần tự (Sequence Diagram).'
),
(
    '50000000-0000-0000-0000-000000000005',
    '40000000-0000-0000-0000-000000000002',
    '20000000-0000-0000-0000-000000000002',
    2,
    'So sánh sự khác nhau giữa kiến trúc Client/Server nhiều tầng (Multi-tier) và Kiến trúc Hướng Dịch vụ / Microservices (CLO4). Khi hệ thống cần đáp ứng các thuộc tính chất lượng (Quality Attributes) như Khả năng mở rộng (Scalability) và Tính sẵn sàng (Availability), bạn sẽ đưa ra quyết định phân tách phân hệ (Subsystem Architectural Design) như thế nào?'
),
(
    '50000000-0000-0000-0000-000000000006',
    '40000000-0000-0000-0000-000000000002',
    '20000000-0000-0000-0000-000000000003',
    3,
    'Phân tích hai mẫu thiết kế Observer Pattern và Strategy Pattern trong bộ GoF Patterns (CLO6). Hãy nêu một tình huống thực tế trong đồ án kiến trúc phần mềm mà bạn bắt buộc phải áp dụng mẫu thiết kế này để tránh vi phạm nguyên lý Open/Closed (OCP) và Loose Coupling.'
);

-- Gán cho Ca thi 3 (student@aives.edu.vn - Đã hoàn tất)
INSERT INTO "assigned_questions" ("id", "exam_schedule_id", "question_id", "question_order", "content_snapshot") VALUES
(
    '50000000-0000-0000-0000-000000000007',
    '40000000-0000-0000-0000-000000000003',
    '20000000-0000-0000-0000-000000000001',
    1,
    'Trình bày quy trình phân tích và thiết kế theo phương pháp COMET/UML (CLO1, CLO2). Hãy giải thích cách phân loại các đối tượng theo mẫu BCE (Boundary - Control - Entity) khi thiết kế ca sử dụng và cách chuyển giao sang biểu đồ tuần tự (Sequence Diagram).'
),
(
    '50000000-0000-0000-0000-000000000008',
    '40000000-0000-0000-0000-000000000003',
    '20000000-0000-0000-0000-000000000002',
    2,
    'So sánh sự khác nhau giữa kiến trúc Client/Server nhiều tầng (Multi-tier) và Kiến trúc Hướng Dịch vụ / Microservices (CLO4). Khi hệ thống cần đáp ứng các thuộc tính chất lượng (Quality Attributes) như Khả năng mở rộng (Scalability) và Tính sẵn sàng (Availability), bạn sẽ đưa ra quyết định phân tách phân hệ (Subsystem Architectural Design) như thế nào?'
),
(
    '50000000-0000-0000-0000-000000000009',
    '40000000-0000-0000-0000-000000000003',
    '20000000-0000-0000-0000-000000000003',
    3,
    'Phân tích hai mẫu thiết kế Observer Pattern và Strategy Pattern trong bộ GoF Patterns (CLO6). Hãy nêu một tình huống thực tế trong đồ án kiến trúc phần mềm mà bạn bắt buộc phải áp dụng mẫu thiết kế này để tránh vi phạm nguyên lý Open/Closed (OCP) và Loose Coupling.'
);

-- Gán cho Ca thi 4 (hoangma.se200043@gmail.com - Đã hoàn tất)
INSERT INTO "assigned_questions" ("id", "exam_schedule_id", "question_id", "question_order", "content_snapshot") VALUES
(
    '50000000-0000-0000-0000-000000000010',
    '40000000-0000-0000-0000-000000000004',
    '20000000-0000-0000-0000-000000000001',
    1,
    'Trình bày quy trình phân tích và thiết kế theo phương pháp COMET/UML (CLO1, CLO2). Hãy giải thích cách phân loại các đối tượng theo mẫu BCE (Boundary - Control - Entity) khi thiết kế ca sử dụng và cách chuyển giao sang biểu đồ tuần tự (Sequence Diagram).'
),
(
    '50000000-0000-0000-0000-000000000011',
    '40000000-0000-0000-0000-000000000004',
    '20000000-0000-0000-0000-000000000002',
    2,
    'So sánh sự khác nhau giữa kiến trúc Client/Server nhiều tầng (Multi-tier) và Kiến trúc Hướng Dịch vụ / Microservices (CLO4). Khi hệ thống cần đáp ứng các thuộc tính chất lượng (Quality Attributes) như Khả năng mở rộng (Scalability) và Tính sẵn sàng (Availability), bạn sẽ đưa ra quyết định phân tách phân hệ (Subsystem Architectural Design) như thế nào?'
),
(
    '50000000-0000-0000-0000-000000000012',
    '40000000-0000-0000-0000-000000000004',
    '20000000-0000-0000-0000-000000000003',
    3,
    'Phân tích hai mẫu thiết kế Observer Pattern và Strategy Pattern trong bộ GoF Patterns (CLO6). Hãy nêu một tình huống thực tế trong đồ án kiến trúc phần mềm mà bạn bắt buộc phải áp dụng mẫu thiết kế này để tránh vi phạm nguyên lý Open/Closed (OCP) và Loose Coupling.'
);

-- ==============================================================================
-- 9. DỮ LIỆU ĐÀM THOẠI & KẾT QUẢ MẪU (CHO CÁC CA THI ĐÃ HOÀN TẤT)
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
),
(
    '60000000-0000-0000-0000-000000000003',
    '40000000-0000-0000-0000-000000000004',
    '20000000-0000-0000-0000-000000000001',
    'AI',
    'Chào Hoàng, bạn hãy trình bày nguyên lý SRP và cách triển khai trong Clean Architecture nhé.',
    'MAIN'
),
(
    '60000000-0000-0000-0000-000000000004',
    '40000000-0000-0000-0000-000000000004',
    '20000000-0000-0000-0000-000000000001',
    'STUDENT',
    'Em chào Giám khảo AI, theo nguyên lý SRP, mỗi module hoặc class chỉ nên có một lý do duy nhất để thay đổi. Trong Clean Architecture, Use Case chỉ đảm nhận 1 nghiệp vụ duy nhất.',
    'MAIN'
);

-- Kết quả chấm điểm từng câu hỏi (Question Results)
INSERT INTO "question_results" (
    "id", "exam_schedule_id", "question_id", "ai_score", "ai_feedback", "lecturer_score", "lecturer_feedback"
) VALUES
(
    '70000000-0000-0000-0000-000000000001',
    '40000000-0000-0000-0000-000000000003',
    '20000000-0000-0000-0000-000000000001',
    9.00,
    'Thí sinh nắm rất vững nguyên lý SRP, lấy ví dụ thực tế mạch lạc và đúng trọng tâm chuyên môn.',
    8.85,
    'Đồng ý với đánh giá của AI Examiner. Thí sinh trả lời tự tin.'
),
(
    '70000000-0000-0000-0000-000000000002',
    '40000000-0000-0000-0000-000000000003',
    '20000000-0000-0000-0000-000000000002',
    8.70,
    'Phân tích tốt sự đánh đổi giữa Monolith và Microservices.',
    8.85,
    'Phân tích chặt chẽ.'
),
(
    '70000000-0000-0000-0000-000000000003',
    '40000000-0000-0000-0000-000000000003',
    '20000000-0000-0000-0000-000000000003',
    8.85,
    'Giải thích đúng định lý CAP và Saga Pattern.',
    8.85,
    'Hiểu đúng bản chất transaction phân tán.'
),
(
    '70000000-0000-0000-0000-000000000004',
    '40000000-0000-0000-0000-000000000004',
    '20000000-0000-0000-0000-000000000001',
    8.50,
    'Trình bày đúng trọng tâm nguyên lý SRP.',
    8.50,
    'Trả lời tốt.'
),
(
    '70000000-0000-0000-0000-000000000005',
    '40000000-0000-0000-0000-000000000004',
    '20000000-0000-0000-0000-000000000002',
    8.50,
    'Phân tích kiến trúc rõ ràng.',
    8.50,
    'Đạt yêu cầu môn học.'
),
(
    '70000000-0000-0000-0000-000000000006',
    '40000000-0000-0000-0000-000000000004',
    '20000000-0000-0000-0000-000000000003',
    8.50,
    'Hiểu cách áp dụng Saga pattern.',
    8.50,
    'Nắm chắc kiến thức.'
);

-- ==============================================================================
-- 10. ĐIỂM TIÊU CHÍ & LỊCH SỬ CHẤM ĐIỂM CỦA GIẢNG VIÊN (LECTURER GRADING)
-- ==============================================================================
INSERT INTO "lecturer_criterion_grades" ("exam_schedule_id", "criterion_id", "score", "graded_by") VALUES
('40000000-0000-0000-0000-000000000003', 'concept', 9.00, 'b0000000-0000-0000-0000-000000000001'),
('40000000-0000-0000-0000-000000000003', 'analysis', 8.50, 'b0000000-0000-0000-0000-000000000001'),
('40000000-0000-0000-0000-000000000003', 'communication', 9.00, 'b0000000-0000-0000-0000-000000000001'),
('40000000-0000-0000-0000-000000000004', 'concept', 8.50, 'b0000000-0000-0000-0000-000000000001'),
('40000000-0000-0000-0000-000000000004', 'analysis', 8.50, 'b0000000-0000-0000-0000-000000000001'),
('40000000-0000-0000-0000-000000000004', 'communication', 8.50, 'b0000000-0000-0000-0000-000000000001');

INSERT INTO "lecturer_grading_history" ("exam_schedule_id", "question_id", "lecturer_id", "lecturer_name", "old_score", "new_score", "old_feedback", "new_feedback") VALUES
('40000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'TS. Nguyễn Văn An', 9.00, 8.85, 'Điểm sơ bộ AI', 'Đồng ý với đánh giá của AI Examiner. Thí sinh trả lời tự tin.'),
('40000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'TS. Nguyễn Văn An', 8.50, 8.50, 'Điểm sơ bộ AI', 'Hoàn thành tốt phần thi vấn đáp.');
