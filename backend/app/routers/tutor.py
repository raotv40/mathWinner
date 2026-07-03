from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from pydantic import BaseModel
from typing import Dict, Any, Optional
import uuid

from app.db.session import get_db
from app.db.models import Chapter, ChapterEmbedding, Concept
from app.routers.auth import get_current_user
from app.services.tutor_agent import TutorAgent

router = APIRouter(prefix="/tutor", tags=["tutor"])

class TutorQueryIn(BaseModel):
    chapter_id: str
    query: str
    mode: str = "simple" # 'simple', 'visual', 'step-by-step', 'example'
    language: str = "English"

@router.post("/ask", response_model=Dict[str, Any])
async def ask_tutor(
    payload: TutorQueryIn,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    try:
        chap_uuid = uuid.UUID(payload.chapter_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid chapter ID format")
        
    # Get chapter details to provide context
    result = await db.execute(select(Chapter).filter(Chapter.id == chap_uuid))
    chapter = result.scalars().first()
    if not chapter:
        raise HTTPException(status_code=404, detail="Chapter not found")
        
    # Retrieve all chunks for RAG search
    emb_result = await db.execute(
        select(ChapterEmbedding).filter(ChapterEmbedding.chapter_id == chap_uuid)
    )
    embeddings = emb_result.scalars().all()
    
    chapter_data = {
        "title": chapter.title,
        "summary": chapter.summary,
        "chunks": [
            {
                "concept_title": e.concept_id, # Placeholder or title
                "content": e.content,
                "embedding": e.embedding
            } for e in embeddings
        ]
    }
    
    # Get response from TutorAgent
    response = await TutorAgent.get_tutor_response(
        query=payload.query,
        mode=payload.mode,
        language=payload.language,
        chapter_data=chapter_data
    )
    
    return response
