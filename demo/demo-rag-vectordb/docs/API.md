# API contract

Base URL: `http://127.0.0.1:8000`. All IDs are UUID strings. Error JSON has at least `detail`; application errors also have a stable `code`.

## Health

`GET /health`

```json
{
  "database": true,
  "gemini_configured": true,
  "model": "gemini-3.8-flash",
  "embedding_model": "gemini-embedding-001",
  "embedding_dimensions": 768
}
```

## Courses and documents

`GET /api/v1/courses` returns `{id,name}[]`.

`POST /api/v1/courses`

```json
{"name":"Kiến trúc hệ thống"}
```

`GET /api/v1/courses/{course_id}/documents` returns document metadata. It does not return original file bytes.

`POST /api/v1/courses/{course_id}/documents` is `multipart/form-data` with field `file`. Accepted suffixes are `.pdf`, `.docx`, `.txt`, `.md`; max 10 MB. The response contains `id`, `filename`, `chunk_count`, `embedding_model`, `duplicate`.

## Rubric

`POST /api/v1/rubrics/preview` accepts multipart field `file`. JSON files are validated directly; other supported formats are extracted and converted by Gemini. The response is an editable `RubricData` object.

`POST /api/v1/courses/{course_id}/rubrics`

```json
{
  "title":"Rubric vấn đáp",
  "criteria":[
    {"id":"concepts","name":"Hiểu khái niệm","weight":50,"description":"Mô tả các mức đạt từ 0 đến 10."},
    {"id":"application","name":"Vận dụng","weight":50,"description":"Áp dụng đúng kiến thức vào tình huống."}
  ]
}
```

The weights must sum to 100 and IDs must be unique.

`GET /api/v1/courses/{course_id}/rubrics` returns saved rubrics.

## Sessions

`POST /api/v1/sessions`

```json
{
  "course_id":"UUID",
  "rubric_id":"UUID",
  "student_name":"Anh",
  "max_questions":8,
  "max_followups":2
}
```

The rubric must belong to the course and at least one indexed document must exist. A rubric and document ID snapshot is stored in the new session.

`GET /api/v1/sessions/{interview_id}` returns session metadata, `messages[]` and a possible `pending` operation. `GET /api/v1/sessions?course_id=UUID` lists the latest 100 sessions for a course.

`POST /api/v1/sessions/{interview_id}/finish` returns the report. Calling it again after completion returns the same saved report.

`GET /api/v1/sessions/{interview_id}/export` returns JSON with `Content-Disposition: attachment`.

## WebSocket

Connect to `/ws/sessions/{interview_id}`. The first server event is:

```json
{"type":"snapshot","session":{}}
```

Send a start event:

```json
{"type":"turn","request_id":"UUID","action":"start","text":""}
```

Send an answer:

```json
{"type":"turn","request_id":"UUID","action":"answer","text":"Câu trả lời…"}
```

Server events during a turn:

| Event | Meaning |
|---|---|
| `accepted` | Request is persisted/accepted. |
| `status` | Retrieval or generation status for UI. |
| `delta` | A text fragment of the next AI question. Append in order. |
| `done` | Question fully persisted; includes `session` and `message`. |
| `error` | The turn did not complete; `code` tells UI whether retry is safe. |

`request_id` is an idempotency key. Retrying the same action/text after a pending or failed generation does not insert another user answer. A different body with the same ID returns `idempotency_conflict`.

Control events:

```json
{"type":"ping"}
{"type":"cancel"}
{"type":"finish"}
```

`ping` receives `pong`. `cancel` cancels generation and keeps a retryable operation. `finish` receives `status`, then `report` or `error`.

## HTTP SSE

`POST /api/v1/sessions/{interview_id}/turns` has the same JSON body as a WebSocket `turn` without the `type` field and returns `text/event-stream`. Each frame is:

```text
event: delta
data: {"type":"delta","text":"..."}

```

The same event types are used. Heartbeat comments (`: heartbeat`) may appear every 15 seconds. Spring WebClient can consume this endpoint without holding a WebSocket to the Python service.

## HTTP client example

```python
import httpx

with httpx.Client(base_url="http://127.0.0.1:8000") as client:
    course = client.post("/api/v1/courses", json={"name": "Demo"}).json()
    with open("notes.txt", "rb") as source:
        client.post(f"/api/v1/courses/{course['id']}/documents", files={"file": source})
```

## Security boundary in this local demo

There is no login or user authorization. The service binds to loopback in the README command, validates same-origin mutating requests and WebSocket origins, limits uploads and message sizes, uses parameterized SQL and escapes user/model text in the UI with `textContent`. Add authentication, per-user ownership checks, rate limiting and HTTPS before exposing it beyond the local machine.
