-- ==============================================================================
-- RESET & TẠO CA THI TINH GỌN ĐỂ DEMO NHANH TRÊN MOBILE (AIVES)
-- Sinh viên: student@aives.edu.vn (SE180001 - Sinh Viên Trần Thị Bình)
-- Môn: HSF (Spring) | Kỳ thi: Kiểm tra kiến thức spring boot
-- 
-- CẤU HÌNH TINH GỌN CHO DEMO:
-- - Số câu hỏi chính: 2 câu
-- - Câu hỏi phụ (follow-up): tối đa 1 câu cho mỗi câu chính (tổng tối đa 2 câu phụ)
-- - Giúp buổi phỏng vấn diễn ra ngắn gọn, súc tích, dễ demo trọn vẹn từ lúc thi đến lúc có kết quả
-- ==============================================================================

DO $$
DECLARE
    v_new_schedule_id UUID := gen_random_uuid(); -- Luôn tạo ID mới tinh cho mỗi lần chạy
    v_exam_id         UUID := 'cff32bc1-fc40-4ad2-974c-020174b44311';
    v_student_id      UUID := '1a694a91-0eea-4a0a-a7e1-9596536f1952'; -- student@aives.edu.vn
    v_deleted_count   INT := 0;
BEGIN
    -- ==========================================================================
    -- BƯỚC 1: XÓA SẠCH DỮ LIỆU CŨ CỦA SINH VIÊN TRONG KỲ THI NÀY
    -- ==========================================================================
    DELETE FROM "lecturer_grading_history" 
    WHERE "exam_schedule_id" IN (
        SELECT "id" FROM "exam_schedules" WHERE "student_id" = v_student_id AND "exam_id" = v_exam_id
    );

    DELETE FROM "lecturer_criterion_grades" 
    WHERE "exam_schedule_id" IN (
        SELECT "id" FROM "exam_schedules" WHERE "student_id" = v_student_id AND "exam_id" = v_exam_id
    );

    DELETE FROM "transcripts" 
    WHERE "exam_schedule_id" IN (
        SELECT "id" FROM "exam_schedules" WHERE "student_id" = v_student_id AND "exam_id" = v_exam_id
    );

    DELETE FROM "question_results" 
    WHERE "exam_schedule_id" IN (
        SELECT "id" FROM "exam_schedules" WHERE "student_id" = v_student_id AND "exam_id" = v_exam_id
    );

    DELETE FROM "ai_voice_sessions" 
    WHERE "schedule_id" IN (
        SELECT "id" FROM "exam_schedules" WHERE "student_id" = v_student_id AND "exam_id" = v_exam_id
    );

    DELETE FROM "assigned_questions" 
    WHERE "exam_schedule_id" IN (
        SELECT "id" FROM "exam_schedules" WHERE "student_id" = v_student_id AND "exam_id" = v_exam_id
    );

    WITH deleted AS (
        DELETE FROM "exam_schedules" 
        WHERE "student_id" = v_student_id AND "exam_id" = v_exam_id
        RETURNING *
    )
    SELECT count(*) INTO v_deleted_count FROM deleted;

    -- ==========================================================================
    -- BƯỚC 2: CẬP NHẬT KỲ THI CHỈ 2 CÂU CHÍNH & TỐI ĐA 1 CÂU PHỤ MỖI CÂU
    -- ==========================================================================
    UPDATE "exams"
    SET "start_date"               = CURRENT_TIMESTAMP - INTERVAL '1 day',
        "end_date"                 = CURRENT_TIMESTAMP + INTERVAL '7 days',
        "max_main_questions"       = 2, -- Chỉ thi 2 câu hỏi chính
        "max_followups_per_main"   = 1, -- Mỗi câu chính chỉ hỏi đào sâu tối đa 1 câu phụ
        "max_followup_questions"   = 2  -- Tổng số câu phụ toàn ca thi tối đa là 2
    WHERE "id" = v_exam_id;

    -- ==========================================================================
    -- BƯỚC 3: TẠO CA THI MỚI TINH (TRẠNG THÁI PENDING, ĐANG DIỄN RA)
    -- ==========================================================================
    INSERT INTO "exam_schedules" (
        "id",
        "exam_id",
        "student_id",
        "scheduled_start_time",
        "scheduled_end_time",
        "status",
        "final_score",
        "lecturer_total_score",
        "lecturer_total_pending",
        "is_connected",
        "graded_by",
        "actual_start_time",
        "actual_end_time",
        "ai_report"
    ) VALUES (
        v_new_schedule_id,
        v_exam_id,
        v_student_id,
        CURRENT_TIMESTAMP - INTERVAL '5 minutes',  -- Đang diễn ra để vào thi ngay
        CURRENT_TIMESTAMP + INTERVAL '55 minutes',  -- Thời lượng ca thi 60 phút
        'PENDING',
        NULL,
        NULL,
        false,
        false,
        NULL,
        NULL,
        NULL,
        NULL
    );

    -- ==========================================================================
    -- BƯỚC 4: BỐC THĂM ĐÚNG 2 CÂU HỎI CHÍNH TRỌNG TÂM
    -- ==========================================================================
    INSERT INTO "assigned_questions" (
        "id", "exam_schedule_id", "question_id", "question_order", "content_snapshot", "assigned_at"
    ) VALUES 
    (
        gen_random_uuid(),
        v_new_schedule_id,
        '488a82eb-2350-4cca-a3e8-97d2953bceb8',
        1,
        'Phân biệt ngắn gọn ba khái niệm JPA, Hibernate và Spring Data JPA.',
        CURRENT_TIMESTAMP
    ),
    (
        gen_random_uuid(),
        v_new_schedule_id,
        '8dac1d77-fa16-48c5-bb47-e660500ee992',
        2,
        'Vì sao constructor injection được khuyến khích sử dụng thay vì field injection trong Spring?',
        CURRENT_TIMESTAMP
    );

    RAISE NOTICE '---------------------------------------------------------';
    RAISE NOTICE 'Đã dọn sạch % ca thi cũ!', v_deleted_count;
    RAISE NOTICE 'ĐÃ TẠO CA THI MỚI! ID: %', v_new_schedule_id;
    RAISE NOTICE 'Cấu hình: 2 câu hỏi chính + tối đa 1 câu phụ/câu (Demo siêu nhanh)!';
    RAISE NOTICE '---------------------------------------------------------';
END $$;
