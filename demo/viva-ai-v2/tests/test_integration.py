import json
import os
from pathlib import Path
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.engine import make_url

from app.config import Settings
from app.main import create_app
from tests.fakes import FakeGateway

TEST_URL = os.getenv("VIVA_TEST_DATABASE_URL")
pytestmark = pytest.mark.skipif(
    not TEST_URL, reason="Set VIVA_TEST_DATABASE_URL to a dedicated *_test PostgreSQL database."
)


@pytest.fixture
def lab():
    assert make_url(TEST_URL).database.endswith("_test"), "Use a dedicated database ending in _test"
    gateway = FakeGateway()
    settings = Settings(database_url=TEST_URL, gemini_api_key="fake-for-tests", _env_file=None)
    application = create_app(settings, gateway)
    with TestClient(application) as client:
        assert client.get("/health").json()["database"], "Test PostgreSQL unavailable"
        yield client, gateway


def prepare(client, questions=4, followups=1):
    course = client.post("/api/v1/courses", json={"name": f"Kiểm thử {uuid4()}"}).json()
    upload = client.post(
        f"/api/v1/courses/{course['id']}/documents",
        files={
            "file": (
                "notes.txt",
                "Cache-aside kiểm tra cache trước database. TTL có thể gây dữ liệu cũ.".encode(),
            )
        },
    )
    assert upload.status_code == 201, upload.text
    rubric = {
        "title": "Rubric test",
        "criteria": [
            {
                "id": "concept",
                "name": "Khái niệm",
                "weight": 40,
                "description": "Giải thích đúng khái niệm và cơ chế.",
            },
            {
                "id": "tradeoff",
                "name": "Đánh đổi",
                "weight": 60,
                "description": "Phân tích đúng ưu điểm và giới hạn.",
            },
        ],
    }
    saved = client.post(f"/api/v1/courses/{course['id']}/rubrics", json=rubric)
    assert saved.status_code == 201
    session = client.post(
        "/api/v1/sessions",
        json={
            "course_id": course["id"],
            "rubric_id": saved.json()["id"],
            "student_name": "Sinh viên test",
            "max_questions": questions,
            "max_followups": followups,
        },
    )
    assert session.status_code == 201, session.text
    return course, session.json()


def terminal(ws):
    events = []
    for _ in range(100):
        event = ws.receive_json()
        events.append(event)
        if event["type"] in ("done", "error", "report"):
            return events
    raise AssertionError("No terminal event")


def turn(action, text="", request_id=None):
    return {
        "type": "turn",
        "request_id": request_id or str(uuid4()),
        "action": action,
        "text": text,
    }


def test_full_streaming_interview_idempotency_memory_and_grading(lab):
    client, gateway = lab
    course, session = prepare(client)
    # An unrelated course has identical fake vectors: SQL filtering must protect its content.
    other = client.post("/api/v1/courses", json={"name": "Môn khác"}).json()
    client.post(
        f"/api/v1/courses/{other['id']}/documents",
        files={"file": ("private.txt", b"DO_NOT_RETRIEVE_OTHER_COURSE")},
    )
    with client.websocket_connect(f"/ws/sessions/{session['id']}") as ws:
        assert ws.receive_json()["type"] == "snapshot"
        start = turn("start")
        ws.send_json(start)
        events = terminal(ws)
        assert events[-1]["type"] == "done"
        assert len([e for e in events if e["type"] == "delta"]) > 1
        assert all(s["filename"] != "private.txt" for s in events[-1]["message"]["sources"])
        ws.send_json(start)
        assert terminal(ws)[-1]["replayed"] is True
        for i in range(4):
            ws.send_json(
                turn(
                    "answer",
                    f"Câu trả lời {i}: Redis nhanh nhưng phải cân nhắc tính nhất quán và lỗi.",
                )
            )
            result = terminal(ws)[-1]
            assert result["type"] == "done", result
        assert result["session"]["status"] == "awaiting_finish"
        ws.send_json({"type": "finish"})
        report = terminal(ws)[-1]
        assert report["type"] == "report", report
        assert report["report"]["total_score"] == 8
    detail = client.get(f"/api/v1/sessions/{session['id']}").json()
    assert len(detail["messages"]) == 8 and detail["pending"] is None
    assert all(m["sequence"] == i + 1 for i, m in enumerate(detail["messages"]))
    assert "Câu trả lời 0" in json.dumps(gateway.calls[-1], ensure_ascii=False)
    assert "Câu trả lời 2" in json.dumps(gateway.calls[-1], ensure_ascii=False)
    assert client.post(f"/api/v1/sessions/{session['id']}/finish").json() == report["report"]
    assert (
        "attachment"
        in client.get(f"/api/v1/sessions/{session['id']}/export").headers["content-disposition"]
    )


def test_failed_stream_recovers_without_duplicate_answer(lab):
    client, gateway = lab
    _, session = prepare(client)
    path = f"/api/v1/sessions/{session['id']}"
    with client.websocket_connect(f"/ws/sessions/{session['id']}") as ws:
        ws.receive_json()
        ws.send_json(turn("start"))
        terminal(ws)
        gateway.fail_next = True
        answer = turn("answer", "Cache có thể chứa dữ liệu cũ.")
        ws.send_json(answer)
        assert terminal(ws)[-1]["code"] == "test_failure"
    detail = client.get(path).json()
    assert detail["answers_count"] == 1
    assert detail["pending"]["request_id"] == answer["request_id"]
    assert "ĐOẠN CHƯA HOÀN THÀNH" not in json.dumps(detail, ensure_ascii=False)
    with client.websocket_connect(f"/ws/sessions/{session['id']}") as ws:
        assert ws.receive_json()["session"]["pending"] is not None
        ws.send_json(answer)
        assert terminal(ws)[-1]["type"] == "done"
        ws.send_json(answer | {"text": "Đổi nội dung"})
        assert terminal(ws)[-1]["code"] == "idempotency_conflict"
    detail = client.get(path).json()
    assert detail["answers_count"] == 1 and len(detail["messages"]) == 3


def test_cancellation_releases_lock_and_keeps_retryable_operation(lab):
    client, gateway = lab
    _, session = prepare(client)
    gateway.delay = 0.01
    start = turn("start")
    with client.websocket_connect(f"/ws/sessions/{session['id']}") as ws:
        ws.receive_json()
        ws.send_json(start)
        while ws.receive_json()["type"] != "delta":
            pass
        ws.send_json({"type": "cancel"})
        assert terminal(ws)[-1]["code"] == "cancelled"
        gateway.delay = 0
        ws.send_json(start)
        assert terminal(ws)[-1]["type"] == "done"
    detail = client.get(f"/api/v1/sessions/{session['id']}").json()
    assert len(detail["messages"]) == 1


def test_http_sse_rubric_preview_and_cross_course_validation(lab):
    client, _ = lab
    course, session = prepare(client)
    body = turn("start")
    body.pop("type")
    response = client.post(f"/api/v1/sessions/{session['id']}/turns", json=body)
    assert response.status_code == 200 and "text/event-stream" in response.headers["content-type"]
    events = [
        json.loads(line[6:]) for line in response.text.splitlines() if line.startswith("data: ")
    ]
    assert events[-1]["type"] == "done" and any(e["type"] == "delta" for e in events)
    example = (Path(__file__).parents[1] / "app/examples/rubric.json").read_bytes()
    preview = client.post("/api/v1/rubrics/preview", files={"file": ("rubric.json", example)})
    assert sum(c["weight"] for c in preview.json()["criteria"]) == 100
    other = client.post("/api/v1/courses", json={"name": "Môn không khớp"}).json()
    rubric_id = client.get(f"/api/v1/courses/{course['id']}/rubrics").json()[0]["id"]
    wrong = client.post("/api/v1/sessions", json={"course_id": other["id"], "rubric_id": rubric_id})
    assert wrong.status_code == 400
    hostile = client.post(
        "/api/v1/courses", json={"name": "Blocked"}, headers={"origin": "https://example.com"}
    )
    assert hostile.status_code == 403
