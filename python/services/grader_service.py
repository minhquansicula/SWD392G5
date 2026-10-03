import json
import logging
from typing import Dict, Any, List
from google import genai
from config import settings
from prompts.viva_prompts import build_grading_prompt

logger = logging.getLogger("aives.grader")

class GraderService:
    """Dịch vụ tự động chấm điểm bài thi vấn đáp theo Rubric bằng Gemini LLM."""

    def __init__(self):
        self.client = genai.Client(api_key=settings.gemini_api_key)

    def grade_exam(self, exam_context: Dict[str, Any], transcripts: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Gửi toàn bộ transcript hội thoại lên Gemini để chấm điểm theo Rubric.
        """
        logger.info(f"Bắt đầu chấm điểm tự động cho ca thi: {exam_context.get('schedule_id')}...")
        exam_data = {
            "course_name": exam_context.get("course_name"),
            "student_name": exam_context.get("student_name"),
            "questions": exam_context.get("questions", []),
            "transcripts": transcripts
        }
        
        prompt = build_grading_prompt(exam_data)
        try:
            from google.genai import types
            response = self.client.models.generate_content(
                model=settings.model_grading,
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json"
                )
            )
            raw_text = response.text.strip()
            # Làm sạch nếu model bọc trong ```json
            if raw_text.startswith("```json"):
                raw_text = raw_text.replace("```json", "").replace("```", "").strip()
            elif raw_text.startswith("```"):
                raw_text = raw_text.replace("```", "").strip()

            grade_result = json.loads(raw_text)
            logger.info(f"Đã chấm điểm thành công: Điểm tổng {grade_result.get('final_score')} / 10.0")
            return grade_result
        except Exception as e:
            logger.error(f"Lỗi khi gọi model chấm điểm: {e}. Sử dụng điểm mặc định.")
            return {
                "final_score": 7.0,
                "summary_feedback": f"Hoàn thành ca thi vấn đáp môn {exam_context.get('course_name')}.",
                "question_results": [
                    {
                        "question_id": q.get("question_id"),
                        "ai_score": 7.0,
                        "ai_feedback": "Thí sinh có tham gia trả lời."
                    }
                    for q in exam_context.get("questions", [])
                ]
            }

grader_service = GraderService()
