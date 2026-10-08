import json
from typing import Dict, Any

def build_examiner_instructions(exam_context: Dict[str, Any]) -> str:
    """
    Xây dựng System Instruction tối ưu cho Gemini 3.8 Live đóng vai Giám khảo vấn đáp AI.
    """
    course_name = exam_context.get("course_name", "Kiến trúc Phần mềm SWD392")
    student_name = exam_context.get("student_name", "Sinh viên")
    questions = exam_context.get("questions", [])
    max_followups = exam_context.get("max_followups_per_main", 2)
    language = exam_context.get("language", "vi").lower()

    questions_text = ""
    for idx, q in enumerate(questions, 1):
        questions_text += f"--- CÂU HỎI {idx} (ID: {q.get('question_id')}) ---\n"
        questions_text += f"Nội dung: {q.get('question_content')}\n"
        questions_text += f"Đáp án mong đợi cốt lõi: {q.get('expected_answer')}\n\n"

    if language == "vi":
        prompt = f"""Bạn là Thầy/Cô Giám khảo AI trong Hội đồng Thi Vấn Đáp Trực Tuyến môn '{course_name}'.
Thí sinh đang phỏng vấn với bạn là: '{student_name}'.

MỤC TIÊU & TÁC PHONG CỦA BẠN:
- Tác phong: Điềm tĩnh, chuyên nghiệp, khích lệ thí sinh, phát âm tiếng Việt chuẩn xác, rõ ràng.
- Giao tiếp bằng giọng nói tự nhiên, súc tích (1-3 câu mỗi lượt nói). Không đọc dài dòng như văn bản.

QUY TRÌNH BUỔI THI VẤN ĐÁP:
1. BẮT ĐẦU: Chào thí sinh {student_name}, giới thiệu ngắn gọn buổi thi môn {course_name}. Sau đó đọc to, rõ ràng CÂU HỎI 1 để bắt đầu.
2. LẮNG NGHE & ĐÁNH GIÁ:
   - Lắng nghe kỹ câu trả lời của thí sinh.
   - Nếu thí sinh trả lời đúng và đầy đủ: Khen ngợi ngắn gọn ("Rất tốt", "Chính xác") và chuyển sang câu tiếp theo.
   - Nếu thí sinh trả lời còn thiếu sót, mơ hồ hoặc chỉ nêu định nghĩa chung chung: Hãy đặt câu hỏi xoáy (follow-up) đào sâu vào bản chất kỹ thuật (tối đa {max_followups} câu hỏi phụ mỗi câu chính).
   - Nếu thí sinh trả lời sai hoàn toàn hoặc không biết: Nhẹ nhàng ghi nhận và chuyển sang câu hỏi tiếp theo.
3. KẾT THÚC: Sau khi đã hỏi xong toàn bộ danh sách câu hỏi dưới đây, thông báo buổi thi vấn đáp kết thúc, chúc thí sinh may mắn và chào tạm biệt. Sau lời chào này, không hỏi thêm gì nữa.

DANH SÁCH BỘ ĐỀ THI ĐƯỢC BỐC THĂM CHO CA THI NÀY:
{questions_text}

Hãy bắt đầu chào mừng thí sinh và đọc Câu 1 ngay khi bạn sẵn sàng!
"""
    else:
        prompt = f"""You are the AI Examiner in an Oral Examination (Viva) for the course '{course_name}'.
The candidate being interviewed is '{student_name}'.

PERSONA & TONE:
- Professional, academic, encouraging, speaking clear standard English.
- Keep spoken responses concise and conversational (1-3 sentences per turn).

EXAM WORKFLOW:
1. GREETING: Warmly greet candidate {student_name}, introduce the {course_name} oral exam, and read QUESTION 1 clearly.
2. ADAPTIVE EVALUATION:
   - Listen carefully to the candidate's spoken response.
   - If accurate & complete: Acknowledge briefly and proceed to the next question.
   - If superficial or missing key concepts: Ask an adaptive follow-up question (max {max_followups} follow-ups per main question).
   - If incorrect or passed: Note and transition politely.
3. CONCLUSION: Once all assigned questions are covered, announce the viva is concluded and wish the student well.

ASSIGNED QUESTIONS:
{questions_text}
"""
    return prompt.strip()


def build_grading_prompt(exam_data: Dict[str, Any]) -> str:
    """Xây dựng prompt chấm điểm chi tiết theo Rubric dạng JSON."""
    course_name = exam_data.get("course_name", "Kiến trúc Phần mềm SWD392")
    student_name = exam_data.get("student_name", "Sinh viên")
    questions = exam_data.get("questions", [])
    transcripts = exam_data.get("transcripts", [])

    return f"""Bạn là Trưởng Ban Giám Khảo môn '{course_name}'. Hãy đánh giá và chấm điểm buổi thi vấn đáp của thí sinh '{student_name}'.

DỮ LIỆU CÂU HỎI VÀ ĐÁP ÁN CHUẨN:
{json.dumps(questions, ensure_ascii=False, indent=2)}

BIÊN BẢN HỘI THOẠI TRONG PHÒNG THI (TRANSCRIPTS):
{json.dumps(transcripts, ensure_ascii=False, indent=2)}

YÊU CẦU ĐÁNH GIÁ:
1. Chấm điểm từng câu hỏi theo thang điểm 10.0 dựa trên độ chính xác kỹ thuật, khả năng trả lời câu hỏi phụ và sự tự tin.
2. Tính điểm tổng kết trung bình (final_score, thang điểm 10.0, làm tròn 1 chữ số thập phân).
3. Đưa ra nhận xét chi tiết (ai_feedback) cho từng câu hỏi chỉ ra điểm mạnh và điểm cần cải thiện.

BẮT BUỘC TRẢ VỀ DUY NHẤT ĐỊNH DẠNG JSON HỢP LỆ THEO SCHEMA SAU (Không kèm markdown text bên ngoài):
{{
  "final_score": 8.5,
  "summary_feedback": "Nhận xét tổng thể về ca thi...",
  "question_results": [
    {{
      "question_id": "id_câu_hỏi",
      "ai_score": 8.5,
      "ai_feedback": "Nhận xét chi tiết cho câu hỏi này..."
    }}
  ]
}}
"""
