"""Opt-in real API smoke test. It sends sample text and consumes API quota."""
import asyncio

from app.config import get_settings
from app.errors import AppError
from app.gemini import GeminiGateway
from app.schemas import RubricData


async def main():
    settings = get_settings()
    gateway = GeminiGateway(settings)
    try:
        print("Kiểm tra embedding (có gọi Gemini thật)…")
        vectors = await gateway.embed(["Cache lưu bản sao dữ liệu để tăng tốc truy cập."])
        query = await gateway.embed(["Cache hoạt động thế nào?"], query=True)
        print(f"Embedding: OK, document={len(vectors[0])} chiều, query={len(query[0])} chiều")
        print(f"Kiểm tra streaming với {settings.gemini_model}…")
        chunks = 0
        async for delta in gateway.stream_text(
            "Bạn là giám khảo. Chỉ đặt một câu hỏi ngắn bằng tiếng Việt.",
            "Đặt câu hỏi về cache-aside.", model=settings.gemini_model,
        ):
            print(delta, end="", flush=True)
            chunks += 1
        print(f"\nStreaming: OK ({chunks} phần văn bản)")
        result = await gateway.structured(
            RubricData, "Trả rubric JSON theo schema, tổng trọng số 100.",
            "Một tiêu chí id=accuracy, tên=Độ chính xác, trọng số=100; mô tả=Giải thích đúng khái niệm cache.",
        )
        print(f"Structured output: OK ({len(result.criteria)} tiêu chí)")
    except AppError as exc:
        print(f"CHƯA THÀNH CÔNG [{exc.code}]: {exc.message}")
        raise SystemExit(1) from None
    finally:
        await gateway.close()


if __name__ == "__main__":
    asyncio.run(main())
