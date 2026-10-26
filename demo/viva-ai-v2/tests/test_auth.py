"""Authorization regressions: real HTTP/WS routes, fake authority/DB/AI only.

No PostgreSQL, external API, email or exam mutation is used by this module.
"""

from contextlib import asynccontextmanager
from types import SimpleNamespace
from unittest.mock import AsyncMock
from uuid import uuid4

import httpx
import pytest
from fastapi.testclient import TestClient
from starlette.websockets import WebSocketDisconnect

from app.config import Settings
from app.models import Exam, ExamSchedule
from tests.fakes import FakeGateway

STUDENT, OTHER, OWNER, READER, ADMIN, COURSE, EXAM, SCHEDULE = [uuid4() for _ in range(8)]
USERS = {
    "student": (STUDENT, "STUDENT"),
    "other": (OTHER, "STUDENT"),
    "owner": (OWNER, "LECTURER"),
    "reader": (READER, "LECTURER"),
    "admin": (ADMIN, "ADMIN"),
}


class FakeDatabase:
    def __init__(self):
        self.rows = {
            (ExamSchedule, SCHEDULE): SimpleNamespace(
                student_id=STUDENT, exam_id=EXAM, status="IN_PROGRESS"
            ),
            (Exam, EXAM): SimpleNamespace(created_by=OWNER),
        }

    @asynccontextmanager
    async def sessions(self):
        yield self

    async def get(self, model, key):
        return self.rows.get((model, key))


@pytest.fixture
async def lab(monkeypatch):
    from app import main

    database = FakeDatabase()
    monkeypatch.setattr(main, "Database", lambda settings: database)
    requests = []
    authority_status = [200]

    def authority(request):
        requests.append(request)
        token = request.headers.get("authorization", "").removeprefix("Bearer ")
        if authority_status[0] != 200:
            return httpx.Response(authority_status[0], json={"success": False})
        if token not in USERS:
            return httpx.Response(401, json={"success": False})
        if request.url.path == "/api/auth/me":
            uid, role = USERS[token]
            return httpx.Response(200, json={"success": True, "data": {"id": str(uid), "role": role}})
        if request.url.path == "/api/lecturer/my-courses":
            return httpx.Response(200, json={"success": True, "data": [{"id": str(COURSE), "courseCode": "C1", "courseName": "Course"}]})
        if request.url.path == f"/api/exams/{EXAM}" and token in {"owner", "reader"}:
            return httpx.Response(200, json={"success": True, "data": {"exam": {"id": str(EXAM)}}})
        return httpx.Response(403, json={"success": False})

    application = main.create_app(
        Settings(_env_file=None), FakeGateway(), auth_transport=httpx.MockTransport(authority)
    )
    interviews = application.state.interviews
    interviews.detail = AsyncMock(return_value={"schedule_id": str(SCHEDULE)})
    interviews.finish = AsyncMock(return_value={"total_score": 7, "scale": 10})
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=application), base_url="http://test") as client:
        yield SimpleNamespace(
            app=application, client=client, database=database, interviews=interviews,
            requests=requests, authority_status=authority_status,
        )
    await application.state.authorizer.client.aclose()


def bearer(token):
    return {"Authorization": f"Bearer {token}"}


@pytest.mark.parametrize("method,path", [
    ("GET", "/api/v1/courses"),
    ("GET", f"/api/v1/courses/{COURSE}/documents"),
    ("DELETE", f"/api/v1/courses/{COURSE}/documents/{uuid4()}"),
    ("GET", f"/api/v1/courses/{COURSE}/rubrics"),
    ("DELETE", f"/api/v1/courses/{COURSE}/rubrics/{uuid4()}"),
    ("GET", f"/api/v1/sessions/{SCHEDULE}"),
    ("GET", f"/api/v1/sessions/{SCHEDULE}/export"),
    ("POST", f"/api/v1/sessions/{SCHEDULE}/finish"),
])
async def test_anonymous_requests_are_rejected_before_data_or_ai(lab, method, path):
    response = await lab.client.request(method, path)
    assert response.status_code == 401
    assert not lab.requests
    lab.interviews.detail.assert_not_awaited()
    lab.interviews.finish.assert_not_awaited()


@pytest.mark.parametrize("path", [
    f"/api/v1/courses/{COURSE}/documents",
    "/api/v1/rubrics/preview",
])
async def test_uploads_require_authentication(lab, path):
    response = await lab.client.post(path, files={"file": ("notes.txt", b"content")})
    assert response.status_code == 401


@pytest.mark.parametrize("path,body", [
    (f"/api/v1/courses/{COURSE}/generate-questions", {"count": 2}),
    (f"/api/v1/courses/{COURSE}/rubrics", {"title": "Rubric", "criteria": [{"id": "c", "name": "Criterion", "weight": 100, "description": "Description"}]}),
])
async def test_ai_generation_and_rubric_save_require_authentication(lab, path, body):
    response = await lab.client.post(path, json=body)
    assert response.status_code == 401


@pytest.mark.parametrize("token", ["student", "owner", "reader", "admin"])
async def test_authorized_users_can_read_session(lab, token):
    response = await lab.client.get(f"/api/v1/sessions/{SCHEDULE}", headers=bearer(token))
    assert response.status_code == 200
    assert lab.requests[0].url.path == "/api/auth/me"
    assert lab.requests[0].headers["authorization"] == f"Bearer {token}"
    lab.interviews.detail.assert_awaited_once_with(SCHEDULE)


async def test_another_student_cannot_read_export_or_finish(lab):
    for suffix, method in [("", "GET"), ("/export", "GET"), ("/finish", "POST")]:
        response = await lab.client.request(method, f"/api/v1/sessions/{SCHEDULE}{suffix}", headers=bearer("other"))
        assert response.status_code == 403
    lab.interviews.detail.assert_not_awaited()
    lab.interviews.finish.assert_not_awaited()


@pytest.mark.parametrize("token", ["student", "owner", "admin"])
async def test_owner_student_exam_creator_and_admin_can_finish(lab, token):
    response = await lab.client.post(f"/api/v1/sessions/{SCHEDULE}/finish", headers=bearer(token))
    assert response.status_code == 200
    lab.interviews.finish.assert_awaited_once_with(SCHEDULE)


async def test_assigned_read_only_lecturer_cannot_finish(lab):
    response = await lab.client.post(f"/api/v1/sessions/{SCHEDULE}/finish", headers=bearer("reader"))
    assert response.status_code == 403
    lab.interviews.finish.assert_not_awaited()


async def test_pending_schedule_cannot_skip_spring_start_validation(lab):
    lab.database.rows[(ExamSchedule, SCHEDULE)].status = "PENDING"
    response = await lab.client.post(f"/api/v1/sessions/{SCHEDULE}/finish", headers=bearer("student"))
    assert response.status_code == 409
    lab.interviews.finish.assert_not_awaited()


async def test_students_cannot_manage_materials(lab):
    response = await lab.client.get("/api/v1/courses", headers=bearer("student"))
    assert response.status_code == 403
    response = await lab.client.post("/api/v1/rubrics/preview", headers=bearer("student"), files={"file": ("rubric.txt", b"content")})
    assert response.status_code == 403


async def test_course_list_is_scoped_by_authority_and_cross_course_is_denied(lab):
    response = await lab.client.get("/api/v1/courses", headers=bearer("owner"))
    assert response.json() == [{"id": str(COURSE), "courseCode": "C1", "courseName": "Course"}]
    response = await lab.client.get(f"/api/v1/courses/{uuid4()}/documents", headers=bearer("owner"))
    assert response.status_code == 403


@pytest.mark.parametrize("status,expected", [(401, 401), (403, 403), (500, 503)])
async def test_invalid_or_unverifiable_identity_fails_closed(lab, status, expected):
    lab.authority_status[0] = status
    response = await lab.client.post(f"/api/v1/sessions/{SCHEDULE}/finish", headers=bearer("student"))
    assert response.status_code == expected
    lab.interviews.finish.assert_not_awaited()


async def test_authority_outage_never_grants_anonymous_fallback(lab):
    async def offline(*args, **kwargs):
        raise httpx.ConnectError("offline")
    lab.app.state.authorizer.client.get = offline
    response = await lab.client.get(f"/api/v1/sessions/{SCHEDULE}", headers=bearer("student"))
    assert response.status_code == 503
    lab.interviews.detail.assert_not_awaited()


@pytest.mark.parametrize("credentials,code", [
    ({"type": "finish"}, 4401),
    ({"type": "authenticate", "token": "expired"}, 4401),
    ({"type": "authenticate", "token": "other"}, 4403),
])
async def test_socket_rejects_invalid_credentials_before_opening_room(lab, credentials, code):
    client = TestClient(lab.app)
    with client.websocket_connect(f"/ws/live/sessions/{SCHEDULE}") as ws:
        ws.send_json(credentials)
        with pytest.raises(WebSocketDisconnect) as exc:
            ws.receive_json()
    assert exc.value.code == code
    lab.interviews.detail.assert_not_awaited()
    lab.interviews.finish.assert_not_awaited()


@pytest.mark.parametrize("token", ["student", "owner", "admin"])
async def test_socket_authenticates_before_room_start(lab, monkeypatch, token):
    from app import main

    class FakeRoom:
        def __init__(self, service, websocket, schedule_id):
            self.websocket = websocket
        async def run(self):
            await self.websocket.send_json({"type": "ready"})

    monkeypatch.setattr(main, "VoiceRoom", FakeRoom)
    lab.app.state.db_ready = True
    client = TestClient(lab.app)
    with client.websocket_connect(f"/ws/live/sessions/{SCHEDULE}") as ws:
        ws.send_json({"type": "authenticate", "token": token})
        assert ws.receive_json() == {"type": "ready"}


async def test_socket_rejects_untrusted_browser_origin(lab):
    client = TestClient(lab.app)
    with pytest.raises(WebSocketDisconnect) as exc:
        with client.websocket_connect(f"/ws/live/sessions/{SCHEDULE}", headers={"origin": "https://untrusted.example"}):
            pass
    assert exc.value.code == 1008
