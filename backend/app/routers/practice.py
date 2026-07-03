from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import uuid
from datetime import datetime

from app.db.session import get_db
from app.db.models import Question, StudentProgress, Chapter
from app.routers.auth import get_current_user, User

router = APIRouter(prefix="/practice", tags=["practice"])

class SubmitAnswerIn(BaseModel):
    question_id: str
    user_answer: str
    time_taken_seconds: int

@router.get("/{chapter_id}", response_model=List[Dict[str, Any]])
async def get_practice_questions(
    chapter_id: str,
    difficulty: Optional[str] = None,
    category: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    try:
        chap_uuid = uuid.UUID(chapter_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid chapter ID format")
        
    query = select(Question).filter(Question.chapter_id == chap_uuid)
    if difficulty:
        query = query.filter(Question.difficulty == difficulty)
    if category:
        query = query.filter(Question.category == category)
        
    result = await db.execute(query)
    questions = result.scalars().all()
    
    return [
        {
            "id": str(q.id),
            "difficulty": q.difficulty,
            "category": q.category,
            "question_text": q.question_text,
            "question_type": q.question_type,
            "options": q.options,
            "hints": q.hints,
            "correct_answer": q.correct_answer,
            "step_by_step_solution": q.step_by_step_solution
        } for q in questions
    ]

@router.post("/submit", response_model=Dict[str, Any])
async def submit_answer(
    submission: SubmitAnswerIn,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
        q_uuid = uuid.UUID(submission.question_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid question ID format")
        
    # Get question
    q_result = await db.execute(select(Question).filter(Question.id == q_uuid))
    question = q_result.scalars().first()
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")
        
    is_correct = submission.user_answer.strip().lower() == question.correct_answer.strip().lower()
    score_change = 15 if is_correct else -5
    
    # Get or create progress
    prog_result = await db.execute(
        select(StudentProgress).filter(
            StudentProgress.user_id == current_user.id,
            StudentProgress.chapter_id == question.chapter_id
        )
    )
    progress = prog_result.scalars().first()
    if not progress:
        progress = StudentProgress(
            user_id=current_user.id,
            chapter_id=question.chapter_id,
            mastery_score=0.0,
            practice_completed=0,
            learning_time=0.0,
            daily_streak=1
        )
        db.add(progress)
        
    progress.practice_completed += 1
    progress.learning_time += submission.time_taken_seconds / 60.0
    progress.mastery_score = max(0.0, min(100.0, progress.mastery_score + score_change))
    progress.last_active = datetime.utcnow()
    
    # Simple streak logic
    progress.daily_streak = (progress.daily_streak or 1) + (1 if is_correct else 0)
    
    await db.commit()
    
    return {
        "is_correct": is_correct,
        "correct_answer": question.correct_answer,
        "score_change": score_change,
        "new_mastery_score": progress.mastery_score,
        "daily_streak": progress.daily_streak,
        "step_by_step_solution": question.step_by_step_solution
    }
