"""Use Spring Boot as the authority for current identities and course/exam access.

No local JWT decoding, cached roles, anonymous fallback, or shared service-account token.
"""

from dataclasses import dataclass, field
from uuid import UUID

import httpx
from fastapi import Request

from app.errors import AppError
from app.models import Exam, ExamSchedule


@dataclass(frozen=True)
class Principal:
    id: UUID
    role: str
    token: str = field(repr=False)


class BackendAuthorization:
    def __init__(self, base_url, database, transport=None):
        self.database = database
        self.client = httpx.AsyncClient(
            base_url=base_url.rstrip("/") + "/",
            timeout=10,
            follow_redirects=False,
            transport=transport,
        )

    async def data(self, path: str, token: str):
        try:
            response = await self.client.get(path, headers={"Authorization": f"Bearer {token}"})
        except httpx.RequestError as exc:
            raise AppError("Chưa thể xác minh quyền truy cập. Vui lòng thử lại.", 503, "auth_unavailable") from exc
        if response.status_code in (401, 403, 404):
            messages = {
                401: "Phiên đăng nhập đã hết hạn.",
                403: "Bạn không có quyền truy cập.",
                404: "Không tìm thấy dữ liệu được yêu cầu.",
            }
            raise AppError(messages[response.status_code], response.status_code, "access_denied")
        try:
            body = response.json()
            if response.status_code != 200 or body.get("success") is not True or "data" not in body:
                raise ValueError("Invalid authority response")
            return body["data"]
        except (ValueError, AttributeError, TypeError) as exc:
            raise AppError("Chưa thể xác minh quyền truy cập. Vui lòng thử lại.", 503, "auth_unavailable") from exc

    async def authenticate(self, authorization: str | None) -> Principal:
        parts = (authorization or "").split()
        if len(parts) != 2 or parts[0].lower() != "bearer" or len(parts[1]) > 8192:
            raise AppError("Bạn cần đăng nhập để sử dụng dịch vụ AI.", 401, "unauthorized")
        user = await self.data("auth/me", parts[1])
        try:
            principal = Principal(UUID(user["id"]), user["role"], parts[1])
            if principal.role not in {"ADMIN", "LECTURER", "STUDENT"}:
                raise ValueError("Unknown role")
            return principal
        except (ValueError, KeyError, TypeError, AttributeError) as exc:
            raise AppError("Không xác minh được tài khoản hiện tại.", 403, "access_denied") from exc

    @staticmethod
    def require_manager(principal: Principal):
        if principal.role not in {"ADMIN", "LECTURER"}:
            raise AppError("Chỉ giảng viên hoặc quản trị viên được dùng chức năng này.", 403, "access_denied")

    async def courses(self, principal: Principal):
        self.require_manager(principal)
        courses = await self.data("lecturer/my-courses", principal.token)
        if not isinstance(courses, list) or any(not isinstance(c, dict) or not c.get("id") for c in courses):
            raise AppError("Không xác minh được danh sách môn học.", 503, "auth_unavailable")
        return courses

    async def require_course(self, principal: Principal, course_id: UUID):
        courses = await self.courses(principal)
        if not any(str(c["id"]).lower() == str(course_id) for c in courses):
            raise AppError("Bạn không được phân công môn học này.", 403, "access_denied")

    async def require_schedule(self, principal: Principal, schedule_id: UUID, *, write=False):
        async with self.database.sessions() as db:
            schedule = await db.get(ExamSchedule, schedule_id)
            if not schedule:
                raise AppError("Không tìm thấy ca thi.", 404)
            if principal.role == "STUDENT":
                if schedule.student_id != principal.id:
                    raise AppError("Bạn không có quyền truy cập ca thi này.", 403, "access_denied")
            elif principal.role == "LECTURER":
                # The backend checks creator OR assigned-course access for reads.
                if not write:
                    await self.data(f"exams/{schedule.exam_id}", principal.token)
                else:
                    exam = await db.get(Exam, schedule.exam_id)
                    if not exam or exam.created_by != principal.id:
                        raise AppError("Chỉ giảng viên tạo kỳ thi được thay đổi ca thi.", 403, "access_denied")
            elif principal.role != "ADMIN":
                raise AppError("Bạn không có quyền truy cập.", 403, "access_denied")
            # Cho phép trạng thái IN_PROGRESS, COMPLETED và PENDING (VoiceRoom.load sẽ tự chuyển PENDING sang IN_PROGRESS)
            if write and schedule.status not in {"IN_PROGRESS", "COMPLETED", "PENDING"}:
                raise AppError("Ca thi chưa được bắt đầu qua hệ thống lịch thi.", 409, "schedule_not_started")


async def current_principal(request: Request) -> Principal:
    return await request.app.state.authorizer.authenticate(request.headers.get("authorization"))
