"""One application-scoped SDK client; no shared in-memory chat between students."""

import asyncio
import math
from collections.abc import AsyncIterator
from contextlib import aclosing
from typing import TypeVar

import httpx
from google import genai
from google.genai import errors, types
from pydantic import BaseModel, ValidationError

from app.config import EMBEDDING_DIMENSIONS, Settings
from app.errors import AppError

T = TypeVar("T", bound=BaseModel)


def normalized_vector(values: list[float]) -> list[float]:
    if len(values) != EMBEDDING_DIMENSIONS or not all(math.isfinite(x) for x in values):
        raise AppError(
            "Embedding trả về sai kích thước hoặc không hợp lệ.", 502, "embedding_invalid"
        )
    norm = math.sqrt(sum(x * x for x in values))
    if norm == 0:
        raise AppError("Embedding rỗng; hãy kiểm tra nội dung tài liệu.", 502, "embedding_invalid")
    return [x / norm for x in values]


def provider_error(exc: Exception) -> AppError:
    code = getattr(exc, "code", None)
    if code == 429:
        return AppError(
            "Gemini đang giới hạn quota. Chờ một lúc rồi thử lại lượt này.", 429, "quota"
        )
    if code in (401, 403):
        return AppError(
            "Gemini từ chối truy cập. Kiểm tra API key và quyền dùng model trong .env.",
            502,
            "provider_auth",
        )
    if code == 404:
        return AppError(
            "Không tìm thấy model Gemini. Kiểm tra tên model và quyền truy cập.",
            502,
            "model_not_found",
        )
    if isinstance(exc, (TimeoutError, httpx.TimeoutException)):
        return AppError(
            "Gemini phản hồi quá lâu. Câu trả lời đã lưu; bạn có thể thử lại.", 504, "timeout"
        )
    return AppError(
        "Không nhận được phản hồi hợp lệ từ Gemini. Hãy thử lại lượt này.", 502, "provider_error"
    )


class GeminiGateway:
    def __init__(self, settings: Settings):
        self.settings = settings
        key = settings.gemini_api_key.get_secret_value()
        self.client = (
            genai.Client(
                api_key=key,
                http_options=types.HttpOptions(
                    timeout=settings.model_timeout_seconds * 1000,
                    retry_options=types.HttpRetryOptions(attempts=1),
                    async_client_args={
                        "limits": httpx.Limits(
                            max_connections=20,
                            max_keepalive_connections=10,
                            keepalive_expiry=60,
                        )
                    },
                ),
            )
            if key
            else None
        )

    def require_key(self):
        if self.client is None:
            raise AppError(
                "Điền GEMINI_API_KEY trong .env rồi khởi động lại server.", 503, "missing_key"
            )

    async def close(self):
        if self.client:
            await self.client.aio.aclose()
            self.client.close()

    async def embed(self, texts: list[str], *, query=False, model=None) -> list[list[float]]:
        self.require_key()
        embedding_model = model or self.settings.gemini_embedding_model
        if embedding_model != "gemini-embedding-001":
            raise AppError(
                "Bản demo dùng gemini-embedding-001, 768 chiều. Xem hướng dẫn migration trước khi đổi model."
            )
        try:
            async with asyncio.timeout(self.settings.model_timeout_seconds):
                response = await self.client.aio.models.embed_content(
                    model=embedding_model,
                    contents=texts,
                    config=types.EmbedContentConfig(
                        task_type="RETRIEVAL_QUERY" if query else "RETRIEVAL_DOCUMENT",
                        output_dimensionality=EMBEDDING_DIMENSIONS,
                    ),
                )
            embeddings = response.embeddings or []
            if len(embeddings) != len(texts):
                raise AppError(
                    "Số embedding không khớp số đoạn tài liệu.", 502, "embedding_invalid"
                )
            return [normalized_vector(e.values or []) for e in embeddings]
        except (errors.APIError, httpx.HTTPError, TimeoutError) as exc:
            raise provider_error(exc) from exc

    async def stream_text(self, system: str, data: str, *, model: str) -> AsyncIterator[str]:
        self.require_key()
        try:
            async with asyncio.timeout(self.settings.model_timeout_seconds):
                stream = await self.client.aio.models.generate_content_stream(
                    model=model,
                    contents=data,
                    config=types.GenerateContentConfig(
                        system_instruction=system,
                        temperature=0.5,
                        max_output_tokens=4096,
                    ),
                )
                found, finished = False, False
                async with aclosing(stream):
                    async for chunk in stream:
                        for candidate in chunk.candidates or []:
                            if candidate.finish_reason:
                                if candidate.finish_reason != types.FinishReason.STOP:
                                    raise AppError(
                                        "Gemini dừng trước khi hoàn thành câu hỏi. Hãy thử lại lượt này.",
                                        502, "incomplete_output",
                                    )
                                finished = True
                            if candidate.content:
                                for part in candidate.content.parts or []:
                                    if part.text and not part.thought:
                                        found = True
                                        yield part.text
                if not found:
                    raise AppError("Gemini không trả về câu hỏi. Hãy thử lại.", 502, "empty_output")
                if not finished:
                    raise AppError("Luồng Gemini kết thúc giữa chừng. Hãy thử lại.", 502, "incomplete_output")
        except (errors.APIError, httpx.HTTPError, TimeoutError) as exc:
            raise provider_error(exc) from exc

    async def structured(self, schema: type[T], system: str, data: str, *, model=None) -> T:
        self.require_key()
        try:
            async with asyncio.timeout(self.settings.model_timeout_seconds):
                response = await self.client.aio.models.generate_content(
                    model=model or self.settings.gemini_model,
                    contents=data,
                    config=types.GenerateContentConfig(
                        system_instruction=system,
                        temperature=0.1,
                        max_output_tokens=12000,
                        response_mime_type="application/json",
                        response_json_schema=schema.model_json_schema(),
                    ),
                )
            if (
                not response.candidates
                or response.candidates[0].finish_reason != types.FinishReason.STOP
            ):
                raise AppError(
                    "Gemini chưa hoàn thành dữ liệu có cấu trúc. Hãy thử lại.",
                    502,
                    "incomplete_output",
                )
            return schema.model_validate_json(response.text or "")
        except ValidationError as exc:
            raise AppError(
                "Gemini trả về dữ liệu chưa đúng cấu trúc. Hãy thử lại.", 502, "invalid_model_json"
            ) from exc
        except (errors.APIError, httpx.HTTPError, TimeoutError) as exc:
            raise provider_error(exc) from exc
