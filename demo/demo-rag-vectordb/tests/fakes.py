"""Deterministic TEST DOUBLE. Never used by the application entrypoint."""

import asyncio
import json

from app.errors import AppError
from app.schemas import GradeDraft


class FakeGateway:
    def __init__(self):
        self.fail_next = False
        self.delay = 0
        self.calls = []

    async def close(self):
        pass

    async def embed(self, texts, **kwargs):
        # Equal vectors intentionally force retrieval isolation to rely on SQL scope.
        return [[1.0] + [0.0] * 767 for _ in texts]

    async def stream_text(self, system, data, **kwargs):
        payload = json.loads(data)
        self.calls.append(payload)
        if self.fail_next:
            self.fail_next = False
            yield "ĐOẠN CHƯA HOÀN THÀNH"
            raise AppError("Lỗi mạng giả lập trong test.", 502, "test_failure")
        users = [m["text"] for m in payload["transcript"] if m["role"] == "user"]
        question = (
            f"Bạn vừa nói «{users[-1][:100]}». Bạn giải thích cơ chế và một trường hợp giới hạn?"
            if users
            else "Bạn giải thích cache-aside hoạt động như thế nào?"
        )
        for offset in range(0, len(question), 12):
            if self.delay:
                await asyncio.sleep(self.delay)
            yield question[offset : offset + 12]

    async def structured(self, schema, system, data, **kwargs):
        payload = json.loads(data)
        if schema is GradeDraft:
            user = next(m for m in payload["transcript"] if m["role"] == "user")
            return GradeDraft.model_validate(
                {
                    "criteria": [
                        {
                            "criterion_id": c["id"],
                            "score": 8,
                            "rationale": "Nhận xét giả lập chỉ dùng cho kiểm thử.",
                            "evidence": [{"message_id": user["id"], "quote": user["text"][:200]}],
                            "improvement": "Bổ sung trường hợp biên.",
                        }
                        for c in payload["rubric_snapshot"]["criteria"]
                    ],
                    "summary": "Kết quả giả lập của bộ kiểm thử, không phải đánh giá Gemini.",
                }
            )
        raise AssertionError("Unexpected structured call in test")
