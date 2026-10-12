from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest
from google.genai import types

from app.config import Settings
from app.errors import AppError
from app.gemini import GeminiGateway


def fake_gateway(chunks):
    async def stream():
        for chunk in chunks:
            yield chunk
    gateway = GeminiGateway(Settings(gemini_api_key="", _env_file=None))
    gateway.client = SimpleNamespace(aio=SimpleNamespace(models=SimpleNamespace(
        generate_content_stream=AsyncMock(return_value=stream()),
    )))
    return gateway


def chunk(text="", *, thought=False, finish=None):
    return types.GenerateContentResponse(candidates=[types.Candidate(
        content=types.Content(parts=[types.Part(text=text, thought=thought)]),
        finish_reason=finish,
    )])


async def test_gateway_streams_text_and_omits_thought_parts():
    gateway = fake_gateway([chunk("private thought", thought=True), chunk("Câu "),
                            chunk("hỏi?", finish=types.FinishReason.STOP)])
    result = [part async for part in gateway.stream_text("system", "data", model="test")]
    assert result == ["Câu ", "hỏi?"]


async def test_gateway_detects_silent_incomplete_stream():
    gateway = fake_gateway([chunk("partial")])
    with pytest.raises(AppError) as error:
        _ = [part async for part in gateway.stream_text("system", "data", model="test")]
    assert error.value.code == "incomplete_output"


async def test_gateway_rejects_truncated_generation():
    gateway = fake_gateway([chunk("partial", finish=types.FinishReason.MAX_TOKENS)])
    with pytest.raises(AppError) as error:
        _ = [part async for part in gateway.stream_text("system", "data", model="test")]
    assert error.value.code == "incomplete_output"
