"""List models visible to the API key; never print the key itself."""
import asyncio

from google import genai
from google.genai import errors

from app.config import get_settings


async def main():
    settings = get_settings()
    key = settings.gemini_api_key.get_secret_value()
    if not key:
        raise SystemExit("Thiếu GEMINI_API_KEY trong .env")
    async with genai.Client(api_key=key).aio as client:
        try:
            async for model in await client.models.list():
                print(model.name, "|", ", ".join(model.supported_actions or []))
        except errors.APIError as exc:
            raise SystemExit(f"Không liệt kê được model (HTTP {exc.code}). Kiểm tra API key/quota.") from None


if __name__ == "__main__":
    asyncio.run(main())
