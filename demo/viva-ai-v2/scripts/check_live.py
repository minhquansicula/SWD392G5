"""Paid smoke check: connects to configured Live model and receives native audio."""

import asyncio
import wave
from pathlib import Path

from google.genai import types

from app.config import get_settings
from app.gemini import GeminiGateway


async def main():
    settings = get_settings()
    gateway = GeminiGateway(settings)
    gateway.require_key()
    target = Path("live-check.wav")
    try:
        async with asyncio.timeout(30):
            async with gateway.client.aio.live.connect(
                model=settings.gemini_live_model,
                config=types.LiveConnectConfig(
                    response_modalities=["AUDIO"], output_audio_transcription={}
                ),
            ) as session:
                await session.send_client_content(
                    turns=types.Content(
                        role="user",
                        parts=[
                            types.Part(
                                text="Hãy nói bằng tiếng Việt: Xin chào, hệ thống phỏng vấn đã sẵn sàng."
                            )
                        ],
                    ),
                    turn_complete=True,
                )
                data = bytearray()
                async for event in session.receive():
                    if event.server_content:
                        c = event.server_content
                        if c.output_transcription:
                            print(c.output_transcription.text or "", end="", flush=True)
                        if c.model_turn:
                            for part in c.model_turn.parts or []:
                                if part.inline_data and part.inline_data.data:
                                    data.extend(part.inline_data.data)
                if not data:
                    raise RuntimeError(
                        "Model không trả audio. Kiểm tra GEMINI_LIVE_MODEL và quyền truy cập."
                    )
                with wave.open(str(target), "wb") as f:
                    f.setnchannels(1)
                    f.setsampwidth(2)
                    f.setframerate(24000)
                    f.writeframes(data)
                print(f"\nOK: {len(data)} bytes PCM; nghe thử {target}.")
    finally:
        await gateway.close()


if __name__ == "__main__":
    asyncio.run(main())
