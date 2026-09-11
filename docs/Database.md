Chi tiết các bảng (PostgreSQL) phục vụ Nhóm 2, 3, 6
1. users

id (UUID, Primary Key)

username (VARCHAR, Unique)

password_hash (VARCHAR)

full_name (VARCHAR)

role (VARCHAR) - Enum: ADMIN, LECTURER, STUDENT

2. courses

id (UUID, Primary Key)

course_code (VARCHAR, Unique)

course_name (VARCHAR)

3. questions (Ngân hàng câu hỏi cơ bản, loại bỏ các bảng RAG/Document phức tạp của Nhóm 1)

id (UUID, Primary Key)

course_id (UUID, Foreign Key)

content (TEXT)

difficulty_level (VARCHAR)

4. exams (Nhóm 2 - Quản lý kỳ thi)

id (UUID, Primary Key)

course_id (UUID, Foreign Key)

title (VARCHAR)

start_date (TIMESTAMP)

end_date (TIMESTAMP)

max_main_questions (INT) - Số câu hỏi chính tối đa cho mỗi sinh viên

max_followup_questions (INT) - Số câu hỏi xoáy (đào sâu) tối đa

created_by (UUID, Foreign Key)

5. exam_schedules (Nhóm 2 - Quản lý lịch thi sinh viên)

id (UUID, Primary Key)

exam_id (UUID, Foreign Key)

student_id (UUID, Foreign Key)

scheduled_start_time (TIMESTAMP) - Khung thời gian bắt đầu của từng thí sinh

scheduled_end_time (TIMESTAMP) - Khung thời gian kết thúc

status (VARCHAR) - Enum: PENDING, IN_PROGRESS, COMPLETED

final_score (DECIMAL)

6. transcripts (Nhóm 3 - Lõi phỏng vấn AI)

id (UUID, Primary Key)

exam_schedule_id (UUID, Foreign Key)

question_id (UUID, Foreign Key, Nullable) - Trống nếu AI đang tự sinh câu hỏi xoáy

parent_transcript_id (UUID, Foreign Key, Nullable) - Liên kết với câu hỏi gốc để tạo chuỗi ngữ cảnh

role (VARCHAR) - Enum: AI, STUDENT

text_content (TEXT) - Nội dung TTS của AI hoặc STT của sinh viên

audio_url (VARCHAR) - Link file ghi âm lưu trữ

created_at (TIMESTAMP)

7. question_results (Nhóm 6 - Phản hồi & báo cáo)

id (UUID, Primary Key)

exam_schedule_id (UUID, Foreign Key)

question_id (UUID, Foreign Key)

ai_score (DECIMAL) - Điểm AI chấm cho từng câu hỏi

ai_feedback (TEXT) - Nhận xét chi tiết của AI để sinh viên xem lại sau khi thi (phục vụ báo cáo)