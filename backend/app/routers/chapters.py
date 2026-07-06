from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List, Dict, Any, Optional
import os
import shutil
import uuid
import json

from app.db.session import get_db
from app.db.models import Chapter, Concept, ChapterEmbedding, Question
from app.routers.auth import get_current_user
from app.services.pdf_agent import PDFAgent
from app.services.video_agent import VideoAgent
from app.services.question_agent import QuestionAgent
from app.core.config import settings

router = APIRouter(prefix="/chapters", tags=["chapters"])

@router.get("", response_model=List[Dict[str, Any]])
async def list_chapters(class_level: Optional[int] = None, db: AsyncSession = Depends(get_db)):
    query = select(Chapter)
    if class_level is not None:
        query = query.filter(Chapter.class_level == class_level)
    result = await db.execute(query)
    chapters = result.scalars().all()
    return [
        {
            "id": str(ch.id),
            "class_level": ch.class_level,
            "subject": ch.subject,
            "title": ch.title,
            "chapter_number": ch.chapter_number,
            "pdf_url": ch.pdf_url,
            "video_url": ch.video_url,
            "summary": ch.summary,
            "formulas": ch.formulas,
            "mind_map": ch.mind_map,
            "offline_package_url": f"/api/v1/chapters/{ch.id}/offline-package" if ch.pdf_url else None
        } for ch in chapters
    ]

@router.get("/{chapter_id}", response_model=Dict[str, Any])
async def get_chapter(chapter_id: str, db: AsyncSession = Depends(get_db)):
    try:
        chap_uuid = uuid.UUID(chapter_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid chapter ID format")
        
    result = await db.execute(select(Chapter).filter(Chapter.id == chap_uuid))
    ch = result.scalars().first()
    if not ch:
        raise HTTPException(status_code=404, detail="Chapter not found")
        
    # Get concepts list
    conc_result = await db.execute(select(Concept).filter(Concept.chapter_id == chap_uuid))
    concepts = conc_result.scalars().all()
    
    # Get video transcript segments and join with Concept
    video_segments_result = await db.execute(
        select(ChapterEmbedding, Concept)
        .outerjoin(Concept, ChapterEmbedding.concept_id == Concept.id)
        .filter(ChapterEmbedding.chapter_id == chap_uuid, ChapterEmbedding.source_type == "video")
        .order_by(ChapterEmbedding.timestamp_seconds.asc())
    )
    video_data = video_segments_result.all()
    
    transcript = []
    for emb, concept in video_data:
        concept_title = concept.title if concept else "Lesson Segment"
        transcript.append({
            "concept_title": concept_title,
            "start_time": int(emb.timestamp_seconds) if emb.timestamp_seconds is not None else 0,
            "end_time": int(emb.timestamp_seconds + 180) if emb.timestamp_seconds is not None else 180,
            "text": emb.content
        })
        
    return {
        "id": str(ch.id),
        "class_level": ch.class_level,
        "subject": ch.subject,
        "title": ch.title,
        "chapter_number": ch.chapter_number,
        "pdf_url": ch.pdf_url,
        "video_url": ch.video_url,
        "summary": ch.summary,
        "formulas": ch.formulas,
        "mind_map": ch.mind_map,
        "concepts": [{"title": c.title, "description": c.description} for c in concepts],
        "transcript": transcript
    }

async def process_chapter_files_bg(
    chapter_id: uuid.UUID, 
    pdf_path: str, 
    video_path: str, 
    chapter_title: str,
    db_session_factory
):
    async for db in db_session_factory():
        # Get chapter
        result = await db.execute(select(Chapter).filter(Chapter.id == chapter_id))
        chapter = result.scalars().first()
        if not chapter:
            return
            
        # 1. Process PDF using PDFAgent
        pdf_data = await PDFAgent.process_pdf(pdf_path, chapter_title)
        chapter.summary = pdf_data["summary"]
        chapter.formulas = pdf_data["formulas"]
        chapter.mind_map = pdf_data["mind_map"]
        
        # Save concepts
        concept_mapping = {}
        for c_data in pdf_data["concepts"]:
            concept = Concept(
                chapter_id=chapter.id,
                title=c_data["title"],
                description=c_data["description"]
            )
            db.add(concept)
            await db.flush()
            concept_mapping[c_data["title"]] = concept.id
            
        # Save PDF embeddings
        for chunk in pdf_data["chunks"]:
            concept_id = concept_mapping.get(chunk["concept_title"])
            emb = ChapterEmbedding(
                chapter_id=chapter.id,
                concept_id=concept_id,
                source_type="pdf",
                content=chunk["content"],
                embedding=chunk["embedding"]
            )
            db.add(emb)
            
        # 2. Process Video using VideoAgent (aligning with extracted concepts)
        video_data = await VideoAgent.process_video(video_path, pdf_data["concepts"])
        
        # Save Video segments / embeddings
        for idx, seg in enumerate(video_data["segments"]):
            concept_id = concept_mapping.get(seg["concept_title"])
            emb = ChapterEmbedding(
                chapter_id=chapter.id,
                concept_id=concept_id,
                source_type="video",
                content=seg["text"],
                timestamp_seconds=seg["start_time"],
                embedding=seg["embedding"]
            )
            db.add(emb)
            
        # 3. Generate initial Practice Questions using QuestionAgent
        questions = await QuestionAgent.generate_questions(
            chapter_title, 
            count=6, 
            concepts=pdf_data.get("concepts"), 
            video_segments=video_data.get("segments")
        )
        for q in questions:
            concept_title_guess = q.get("concept_title")
            concept_id = concept_mapping.get(concept_title_guess) if concept_title_guess else None
            
            db_q = Question(
                chapter_id=chapter.id,
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
            
        await db.commit()
        break

@router.post("/upload", response_model=Dict[str, Any])
async def upload_chapter(
    background_tasks: BackgroundTasks,
    class_level: int = Form(...),
    chapter_number: int = Form(...),
    title: str = Form(...),
    pdf: UploadFile = File(...),
    video: UploadFile = File(...),
    db: AsyncSession = Depends(get_db)
):
    # Ensure directories exist
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    
    chapter_id = uuid.uuid4()
    pdf_ext = os.path.splitext(pdf.filename)[1] or ".pdf"
    video_ext = os.path.splitext(video.filename)[1] or ".mp4"
    
    pdf_filename = f"chapter_{chapter_id}{pdf_ext}"
    video_filename = f"chapter_{chapter_id}{video_ext}"
    
    pdf_path = os.path.join(settings.UPLOAD_DIR, pdf_filename)
    video_path = os.path.join(settings.UPLOAD_DIR, video_filename)
    
    # Write files
    with open(pdf_path, "wb") as buffer:
        shutil.copyfileobj(pdf.file, buffer)
        
    with open(video_path, "wb") as buffer:
        shutil.copyfileobj(video.file, buffer)
        
    # Create DB entry (status: processing)
    new_chapter = Chapter(
        id=chapter_id,
        class_level=class_level,
        chapter_number=chapter_number,
        title=title,
        pdf_url=f"/uploads/{pdf_filename}",
        video_url=f"/uploads/{video_filename}",
        summary="Processing files...",
        formulas=[],
        mind_map={"nodes": [], "links": []}
    )
    db.add(new_chapter)
    await db.commit()
    
    # Process files in background
    background_tasks.add_task(
        process_chapter_files_bg,
        chapter_id,
        pdf_path,
        video_path,
        title,
        get_db
    )
    
    return {
        "chapter_id": str(chapter_id),
        "status": "processing",
        "message": "PDF and Video files uploaded successfully. Processing started in the background."
    }

@router.get("/{chapter_id}/offline-package", response_model=Dict[str, Any])
async def get_offline_package(chapter_id: str, db: AsyncSession = Depends(get_db)):
    """
    Returns a unified JSON package structure containing the full offline package:
    - Chapter metadata
    - Mind maps & Formulas
    - Transcripts & Video timestamps
    - Generated assessment & practice questions
    - Pre-computed embeddings for client-side search
    """
    try:
        chap_uuid = uuid.UUID(chapter_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid chapter ID format")
        
    # Get chapter metadata
    result = await db.execute(select(Chapter).filter(Chapter.id == chap_uuid))
    ch = result.scalars().first()
    if not ch:
        raise HTTPException(status_code=404, detail="Chapter not found")
        
    # Get concepts
    conc_result = await db.execute(select(Concept).filter(Concept.chapter_id == chap_uuid))
    concepts = conc_result.scalars().all()
    
    # Get questions
    q_result = await db.execute(select(Question).filter(Question.chapter_id == chap_uuid))
    questions = q_result.scalars().all()
    
    # Get embeddings
    emb_result = await db.execute(select(ChapterEmbedding).filter(ChapterEmbedding.chapter_id == chap_uuid))
    embeddings = emb_result.scalars().all()
    
    return {
        "chapter": {
            "id": str(ch.id),
            "class_level": ch.class_level,
            "subject": ch.subject,
            "title": ch.title,
            "chapter_number": ch.chapter_number,
            "summary": ch.summary,
            "formulas": ch.formulas,
            "mind_map": ch.mind_map,
            "pdf_url": ch.pdf_url,
            "video_url": ch.video_url
        },
        "concepts": [
            {
                "id": str(c.id),
                "title": c.title,
                "description": c.description,
                "parent_concept_id": str(c.parent_concept_id) if c.parent_concept_id else None
            } for c in concepts
        ],
        "questions": [
            {
                "id": str(q.id),
                "difficulty": q.difficulty,
                "category": q.category,
                "question_text": q.question_text,
                "question_type": q.question_type,
                "options": q.options,
                "correct_answer": q.correct_answer,
                "hints": q.hints,
                "step_by_step_solution": q.step_by_step_solution
            } for q in questions
        ],
        "embeddings": [
            {
                "source_type": e.source_type,
                "content": e.content,
                "timestamp_seconds": e.timestamp_seconds,
                "embedding": e.embedding
            } for e in embeddings
        ]
    }

@router.delete("/{chapter_id}", response_model=Dict[str, Any])
async def delete_chapter(chapter_id: str, db: AsyncSession = Depends(get_db)):
    from sqlalchemy import delete
    try:
        chap_uuid = uuid.UUID(chapter_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid chapter ID format")
        
    result = await db.execute(select(Chapter).filter(Chapter.id == chap_uuid))
    chapter = result.scalars().first()
    if not chapter:
        raise HTTPException(status_code=404, detail="Chapter not found")
        
    # Delete physical uploaded files
    if chapter.pdf_url:
        pdf_path = os.path.join(settings.UPLOAD_DIR, os.path.basename(chapter.pdf_url))
        if os.path.exists(pdf_path):
            try:
                os.remove(pdf_path)
            except Exception as e:
                print(f"Error removing PDF file: {e}")
                
    if chapter.video_url:
        video_path = os.path.join(settings.UPLOAD_DIR, os.path.basename(chapter.video_url))
        if os.path.exists(video_path):
            try:
                os.remove(video_path)
            except Exception as e:
                print(f"Error removing video file: {e}")
                
    # Delete database records
    await db.execute(delete(ChapterEmbedding).filter(ChapterEmbedding.chapter_id == chap_uuid))
    await db.execute(delete(Question).filter(Question.chapter_id == chap_uuid))
    await db.execute(delete(Concept).filter(Concept.chapter_id == chap_uuid))
    await db.delete(chapter)
    await db.commit()
    
    return {"status": "success", "message": "Chapter and associated files deleted successfully."}
