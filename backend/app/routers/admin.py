from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import Dict, Any
import uuid

from app.db.session import get_db
from app.db.models import Chapter, Concept, Question, ChapterEmbedding
from app.services.pdf_agent import PDFAgent
from app.services.question_agent import QuestionAgent

router = APIRouter(prefix="/admin", tags=["admin"])

@router.post("/seed", response_model=Dict[str, Any])
async def seed_data(db: AsyncSession = Depends(get_db)):
    """
    Seeds initial official CBSE class 10 chapters and questions 
    into the database so the frontend has immediate content.
    """
    # Check if chapters already exist
    check = await db.execute(select(Chapter).limit(1))
    if check.scalars().first():
        return {"status": "skipped", "message": "Database already has chapters seeded."}
        
    chapters_to_seed = [
        {"num": 4, "title": "Quadratic Equations", "class": 10},
        {"num": 8, "title": "Introduction to Trigonometry", "class": 10}
    ]
    
    seeded_chapters = []
    for info in chapters_to_seed:
        chapter_id = uuid.uuid4()
        
        # Parse simulated PDF details
        pdf_data = await PDFAgent._process_with_simulation("", info["title"])
        
        ch = Chapter(
            id=chapter_id,
            class_level=info["class"],
            chapter_number=info["num"],
            title=info["title"],
            summary=pdf_data["summary"],
            formulas=pdf_data["formulas"],
            mind_map=pdf_data["mind_map"],
            pdf_url=f"/uploads/mock_chapter_{info['num']}.pdf",
            video_url=f"/uploads/mock_chapter_{info['num']}.mp4"
        )
        db.add(ch)
        await db.flush()
        
        # Add Concepts
        concept_mapping = {}
        for c_data in pdf_data["concepts"]:
            concept = Concept(
                chapter_id=chapter_id,
                title=c_data["title"],
                description=c_data["description"]
            )
            db.add(concept)
            await db.flush()
            concept_mapping[c_data["title"]] = concept.id
            
        # Add Embeddings
        for chunk in pdf_data["chunks"]:
            concept_id = concept_mapping.get(chunk["concept_title"])
            emb = ChapterEmbedding(
                chapter_id=chapter_id,
                concept_id=concept_id,
                source_type="pdf",
                content=chunk["content"],
                embedding=chunk["embedding"]
            )
            db.add(emb)
            
        # Add practice questions
        questions = QuestionAgent.generate_questions(info["title"], count=5)
        for q in questions:
            concept_title = q.get("concept_title")
            concept_id = concept_mapping.get(concept_title) if concept_title else None
            
            db_q = Question(
                chapter_id=chapter_id,
                concept_id=concept_id,
                difficulty=q["difficulty"],
                category=q["category"],
                question_text=q["question_text"],
                question_type=q["question_type"],
                options=q.get("options"),
                correct_answer=q["correct_answer"],
                hints=q["hints"],
                step_by_step_solution=q["step_by_step_solution"]
            )
            db.add(db_q)
            
        seeded_chapters.append(info["title"])
        
    await db.commit()
    return {
        "status": "success",
        "message": f"Successfully seeded chapters: {', '.join(seeded_chapters)}."
    }
