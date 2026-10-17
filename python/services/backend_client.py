import logging
import requests
from typing import Optional, Dict, Any
from config import settings

logger = logging.getLogger("aives.backend_client")

class BackendClient:
    """Client kết nối an toàn với Java Spring Boot Backend qua REST API nội bộ."""

    def __init__(self):
        self.base_url = settings.backend_internal_url.rstrip("/")
        self.headers = {
            "Content-Type": "application/json",
            "X-Internal-Secret": settings.internal_api_key
        }

    def get_exam_context(self, schedule_id: str) -> Dict[str, Any]:
        """
        Lấy thông tin đề thi và câu hỏi bốc thăm cho ca thi.
        Nếu schedule_id == 'test-session' hoặc Backend Java offline, tự động trả về Mock Context để test độc lập.
        """
        if schedule_id == "test-session":
            logger.info("Chế độ test độc lập (test-session): Sử dụng ngay Dữ liệu Giả lập (Mock Exam Context).")
            return self.get_mock_exam_context(schedule_id)

        url = f"{self.base_url}/viva/{schedule_id}/context"
        try:
            logger.info(f"Đang lấy context ca thi từ Backend: {url}")
            response = requests.get(url, headers=self.headers, timeout=3)
            if response.status_code == 200:
                data = response.json()
                logger.info(f"Đã nhận context ca thi {schedule_id}: {len(data.get('questions', []))} câu hỏi.")
                return data
            else:
                logger.error(f"Lỗi HTTP {response.status_code} khi lấy context ca thi: {response.text}")
                return self.get_mock_exam_context(schedule_id)
        except Exception as e:
            logger.warning(f"Không kết nối được tới Java Backend ({e}). Kích hoạt Mock Exam Context để test tiếp!")
            return self.get_mock_exam_context(schedule_id)

    def submit_exam_results(self, schedule_id: str, payload: Dict[str, Any]) -> bool:
        """
        Nộp kết quả ca thi (điểm, nhận xét, cây transcripts) về Java Backend để lưu PostgreSQL.
        """
        if schedule_id == "test-session":
            logger.info(f"Chế độ test-session: Đã hoàn tất chấm điểm giả lập (Điểm: {payload.get('final_score')}). Không lưu vào CSDL.")
            return True

        url = f"{self.base_url}/viva/{schedule_id}/results"
        try:
            logger.info(f"Đang nộp kết quả ca thi {schedule_id} về Backend: {url}")
            response = requests.post(url, headers=self.headers, json=payload, timeout=10)
            if response.status_code in (200, 201):
                logger.info(f"Nộp kết quả ca thi {schedule_id} thành công!")
                return True
            else:
                logger.error(f"Lỗi HTTP {response.status_code} khi nộp kết quả: {response.text}")
                return False
        except Exception as e:
            logger.error(f"Lỗi kết nối khi nộp kết quả ca thi {schedule_id} tới Java Backend: {e}")
            return False

    def get_mock_exam_context(self, schedule_id: str) -> Dict[str, Any]:
        """Tạo dữ liệu ca thi mẫu giả lập môn SWD392 để test độc lập."""
        return {
            "schedule_id": schedule_id,
            "course_name": "Kiến trúc Phần mềm (SWD392)",
            "course_code": "SWD392",
            "student_name": "Nguyễn Hoàng Nam (Thí sinh Test)",
            "language": "vi",
            "max_main_questions": 2,
            "max_followups_per_main": 2,
            "questions": [
                {
                    "question_id": "mock-q1-di",
                    "question_order": 1,
                    "question_content": "Trình bày nguyên lý Dependency Injection (DI) và phân biệt 3 loại DI phổ biến trong Spring Boot.",
                    "expected_answer": "Dependency Injection là kỹ thuật đảo ngược điều khiển (IoC) giúp tách việc tạo phụ thuộc ra khỏi class sử dụng nó, giảm độ phụ thuộc (loose coupling). Có 3 loại: Constructor Injection (khuyên dùng vì immutability và dễ test), Setter Injection (phù hợp optional dependencies), và Field Injection (dùng @Autowired trực tiếp, không khuyên dùng vì khó test)."
                },
                {
                    "question_id": "mock-q2-patterns",
                    "question_order": 2,
                    "question_content": "Phân biệt Singleton Scope và Prototype Scope trong Spring Bean Lifecycle.",
                    "expected_answer": "Singleton Scope: Spring IoC Container chỉ tạo duy nhất 1 instance của bean cho toàn bộ ứng dụng, mặc định trong Spring. Prototype Scope: Mỗi lần container nhận yêu cầu (getBean) sẽ tạo ra một instance mới hoàn toàn."
                }
            ]
        }

backend_client = BackendClient()
