from uuid import UUID

from sqlalchemy import select

from app.models import AiDocument, AiDocumentChunk


class RetrievalService:
    def __init__(self, database, gateway, top_k: int):
        self.db, self.gateway, self.top_k = database, gateway, top_k

    async def retrieve(
        self,
        course_id: UUID,
        query: str,
        document_ids: list[str | UUID] | None = None,
        embedding_model: str = "gemini-embedding-001",
    ) -> list[dict]:
        vector = (
            await self.gateway.embed([query[:1800]], query=True, model=embedding_model)
        )[0]
        distance = AiDocumentChunk.embedding.cosine_distance(vector)
        
        conditions = [
            AiDocumentChunk.course_id == course_id,
            AiDocument.embedding_model == embedding_model,
        ]
        if document_ids:
            conditions.append(AiDocumentChunk.document_id.in_([UUID(str(v)) for v in document_ids]))

        statement = (
            select(AiDocumentChunk, AiDocument.filename, distance.label("distance"))
            .join(AiDocument, AiDocumentChunk.document_id == AiDocument.id)
            .where(*conditions)
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
