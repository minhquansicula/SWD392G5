from uuid import UUID

from sqlalchemy import select

from app.models import Chunk, Document


class RetrievalService:
    def __init__(self, database, gateway, top_k: int):
        self.db, self.gateway, self.top_k = database, gateway, top_k

    async def retrieve(self, interview, query: str) -> list[dict]:
        vector = (
            await self.gateway.embed([query[:1800]], query=True, model=interview.embedding_model)
        )[0]
        distance = Chunk.embedding.cosine_distance(vector)
        # Filter BEFORE ranking. A session cannot retrieve another course's chunks.
        statement = (
            select(Chunk, Document.filename, distance.label("distance"))
            .join(Document, Chunk.document_id == Document.id)
            .where(
                Chunk.course_id == interview.course_id,
                Chunk.document_id.in_([UUID(v) for v in interview.document_ids]),
                Document.embedding_model == interview.embedding_model,
            )
            .order_by(distance)
            .limit(self.top_k)
        )
        async with self.db.sessions() as db:
            rows = (await db.execute(statement)).all()
        return [
            {
                "chunk_id": str(chunk.id),
                "document_id": str(chunk.document_id),
                "filename": filename,
                "page": chunk.page,
                "position": chunk.position,
                "text": chunk.text,
                "similarity": round(1 - float(dist), 4),
            }
            for chunk, filename, dist in rows
        ]
