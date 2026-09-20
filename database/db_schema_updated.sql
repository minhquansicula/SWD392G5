-- ==========================================
-- TẠO BẢNG & RÀNG BUỘC (TABLES & CONSTRAINTS)
-- Phiên bản cập nhật theo review: bổ sung exam_questions,
-- giới hạn hỏi xoáy/thời gian, thang điểm, NOT NULL cho FK bắt buộc.
-- ==========================================

CREATE EXTENSION IF NOT EXISTS pgcrypto; -- cần cho gen_random_uuid(), bỏ dòng này nếu đã bật sẵn

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('ADMIN', 'LECTURER', 'STUDENT')),

    -- Mới: mã sinh viên, cần cho việc xuất bảng điểm theo mẫu trường.
    student_code VARCHAR(50) UNIQUE
);

CREATE TABLE courses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_code VARCHAR(50) UNIQUE NOT NULL,
    course_name VARCHAR(255) NOT NULL
);

CREATE TABLE questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    -- NOT NULL: một câu hỏi bắt buộc phải thuộc một môn học.
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    difficulty_level VARCHAR(50)
);

CREATE TABLE exams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    start_date TIMESTAMPTZ NOT NULL,
    end_date TIMESTAMPTZ NOT NULL,

    max_main_questions INT NOT NULL DEFAULT 0
        CHECK (max_main_questions >= 0),
    max_followup_questions INT NOT NULL DEFAULT 0
        CHECK (max_followup_questions >= 0),

    -- Mới: giới hạn hỏi xoáy cho TỪNG câu chính (khác với tổng cả lượt thi ở trên).
    max_followups_per_main INT NOT NULL DEFAULT 2
        CHECK (max_followups_per_main >= 0),

    -- Mới: thời gian trả lời mặc định cho câu chính / câu đào sâu.
    main_answer_time_limit_seconds INT NOT NULL DEFAULT 120
        CHECK (main_answer_time_limit_seconds > 0),
    followup_answer_time_limit_seconds INT NOT NULL DEFAULT 60
        CHECK (followup_answer_time_limit_seconds > 0),

    created_by UUID REFERENCES users(id) ON DELETE SET NULL,

    CHECK (end_date > start_date)
);

CREATE TABLE exam_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exam_id UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    scheduled_start_time TIMESTAMPTZ NOT NULL,
    scheduled_end_time TIMESTAMPTZ NOT NULL,

    -- Mới: thời gian thi thực tế, tách biệt với giờ dự kiến.
    actual_start_time TIMESTAMPTZ,
    actual_end_time TIMESTAMPTZ,

    status VARCHAR(50) NOT NULL DEFAULT 'PENDING'
        CHECK (status IN ('PENDING', 'IN_PROGRESS', 'COMPLETED')),

    -- Ràng buộc thang điểm 0-10 (đổi lại nếu hệ thống dùng thang khác).
    final_score DECIMAL(5, 2)
        CHECK (final_score IS NULL OR final_score BETWEEN 0 AND 10),

    -- Chống xếp trùng lịch: mỗi sinh viên chỉ 1 lượt thi / kỳ thi.
    -- Nếu cho thi lại: thêm cột attempt_no và đổi thành UNIQUE(exam_id, student_id, attempt_no).
    UNIQUE (exam_id, student_id),

    CHECK (scheduled_end_time > scheduled_start_time),
    CHECK (
        actual_end_time IS NULL
        OR (actual_start_time IS NOT NULL AND actual_end_time >= actual_start_time)
    )
);

-- ==========================================
-- BẢNG MỚI: câu hỏi thực tế của từng lượt thi
-- (bảng trung gian giữa ngân hàng câu hỏi và transcript)
-- ==========================================
CREATE TABLE exam_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    exam_schedule_id UUID NOT NULL
        REFERENCES exam_schedules(id) ON DELETE CASCADE,

    -- Câu chính thường lấy từ ngân hàng; câu do AI sinh có thể NULL.
    source_question_id UUID
        REFERENCES questions(id) ON DELETE SET NULL,

    -- Câu đào sâu trỏ về câu chính tương ứng (cùng lượt thi).
    parent_exam_question_id UUID,

    question_type VARCHAR(20) NOT NULL
        CHECK (question_type IN ('MAIN', 'FOLLOW_UP')),

    -- Chụp lại nội dung tại thời điểm thi, không phụ thuộc việc sửa ngân hàng sau này.
    content_snapshot TEXT NOT NULL,

    -- Thứ tự câu hỏi trong toàn bộ lượt thi.
    question_order INT NOT NULL CHECK (question_order > 0),

    answer_time_limit_seconds INT NOT NULL
        CHECK (answer_time_limit_seconds > 0),

    selected_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    asked_at TIMESTAMPTZ,
    answer_deadline_at TIMESTAMPTZ,
    answered_at TIMESTAMPTZ,

    status VARCHAR(20) NOT NULL DEFAULT 'SELECTED'
        CHECK (status IN ('SELECTED', 'ASKED', 'ANSWERED', 'TIMED_OUT', 'SKIPPED')),

    UNIQUE (exam_schedule_id, question_order),
    UNIQUE (id, exam_schedule_id), -- cần để FK ghép bên dưới tham chiếu tới

    -- Bảo đảm câu cha thuộc cùng lượt thi.
    FOREIGN KEY (parent_exam_question_id, exam_schedule_id)
        REFERENCES exam_questions(id, exam_schedule_id),

    CHECK (
        (question_type = 'MAIN' AND parent_exam_question_id IS NULL)
        OR
        (question_type = 'FOLLOW_UP' AND parent_exam_question_id IS NOT NULL)
    ),

    CHECK (
        answer_deadline_at IS NULL
        OR (asked_at IS NOT NULL AND answer_deadline_at >= asked_at)
    )
);

-- Không phân cùng 1 câu trong ngân hàng làm 2 câu MAIN cho cùng 1 lượt thi.
CREATE UNIQUE INDEX uq_exam_main_source_question
    ON exam_questions (exam_schedule_id, source_question_id)
    WHERE question_type = 'MAIN' AND source_question_id IS NOT NULL;

-- ==========================================
-- TRANSCRIPTS: gắn thêm vào câu hỏi thực tế (exam_questions)
-- ==========================================
CREATE TABLE transcripts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    exam_schedule_id UUID NOT NULL
        REFERENCES exam_schedules(id) ON DELETE CASCADE,

    -- Mới: lượt nói này thuộc câu hỏi (chính/đào sâu) nào.
    exam_question_id UUID
        REFERENCES exam_questions(id),

    -- Giữ lại chỉ để threading hội thoại — KHÔNG dùng để suy ra câu đào sâu.
    parent_transcript_id UUID REFERENCES transcripts(id) ON DELETE CASCADE,

    -- Mới: thứ tự hội thoại rõ ràng, và cờ đánh dấu bản STT đã chốt.
    turn_order INT,
    is_final BOOLEAN NOT NULL DEFAULT TRUE,

    role VARCHAR(50) NOT NULL CHECK (role IN ('AI', 'STUDENT')),
    text_content TEXT NOT NULL,
    audio_url VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Sau khi dọn dữ liệu cũ (nếu có), nên chạy thêm:
-- ALTER TABLE transcripts ALTER COLUMN turn_order SET NOT NULL;
-- ALTER TABLE transcripts ADD CONSTRAINT uq_transcript_turn UNIQUE (exam_schedule_id, turn_order);

-- ==========================================
-- QUESTION_RESULTS: trỏ về exam_questions thay vì questions trực tiếp
-- (tránh mất lịch sử chấm điểm khi câu hỏi trong ngân hàng bị xóa)
-- ==========================================
CREATE TABLE question_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- 1 kết quả / 1 exam_question (mặc định: chỉ chấm ở câu MAIN,
    -- câu đào sâu là bằng chứng bổ sung chứ không tự cộng điểm riêng).
    exam_question_id UUID NOT NULL UNIQUE
        REFERENCES exam_questions(id),

    ai_score DECIMAL(5, 2) NOT NULL,
    max_score DECIMAL(5, 2) NOT NULL CHECK (max_score > 0),
    ai_feedback TEXT,
    graded_at TIMESTAMPTZ,

    CHECK (ai_score >= 0 AND ai_score <= max_score)
);

-- ==========================================
-- TÙY CHỌN: chỉ thêm nếu "lớp học" nghĩa là lớp học phần
-- quản lý xuyên suốt nhiều kỳ thi (không phải chỉ là ds sv của 1 kỳ thi)
-- ==========================================
-- CREATE TABLE classes (
--     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
--     class_code VARCHAR(50) UNIQUE NOT NULL,
--     class_name VARCHAR(255) NOT NULL,
--     course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
--     semester VARCHAR(50) NOT NULL
-- );
--
-- CREATE TABLE class_students (
--     class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
--     student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
--     PRIMARY KEY (class_id, student_id)
-- );
--
-- Nếu 1 kỳ thi có thể thuộc nhiều lớp, thêm bảng nối exam_classes tương tự.
