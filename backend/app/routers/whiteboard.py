from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from pydantic import BaseModel
from typing import Dict, Any, Optional
import uuid
from datetime import datetime

from app.db.session import get_db
from app.db.models import Question, Submission, StudentProgress
from app.routers.auth import get_current_user, User
from app.services.whiteboard_agent import WhiteboardAgent

router = APIRouter(prefix="/whiteboard", tags=["whiteboard"])

class EvaluateWhiteboardIn(BaseModel):
    question_id: str
    whiteboard_canvas_json: str
    uploaded_image_b64: Optional[str] = None
    time_taken_seconds: int = 60

@router.post("/evaluate", response_model=Dict[str, Any])
async def evaluate_board(
    payload: EvaluateWhiteboardIn,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
        q_uuid = uuid.UUID(payload.question_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid question ID format")
        
    # Get question
    q_result = await db.execute(select(Question).filter(Question.id == q_uuid))
    question = q_result.scalars().first()
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")
        
    # Grade solution
    eval_result = await WhiteboardAgent.evaluate_solution(
        question_text=question.question_text,
        correct_answer=question.correct_answer,
        whiteboard_canvas_json=payload.whiteboard_canvas_json,
        uploaded_image_b64=payload.uploaded_image_b64
    )
    
    # Save submission
    sub = Submission(
        user_id=current_user.id,
        question_id=question.id,
        whiteboard_data=payload.whiteboard_canvas_json,
        is_correct=eval_result["is_correct"],
        eval_score=eval_result["eval_score"],
        eval_feedback=eval_result,
        time_taken=payload.time_taken_seconds
    )
    db.add(sub)
    
    # Update progress
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
    progress.learning_time += payload.time_taken_seconds / 60.0
    
    # Score formula
    score_change = int((eval_result["eval_score"] - 50) / 5) # Scale score delta
    progress.mastery_score = max(0.0, min(100.0, progress.mastery_score + score_change))
    progress.last_active = datetime.utcnow()
    
    await db.commit()
    
    return {
        "submission_id": str(sub.id),
        "is_correct": eval_result["is_correct"],
        "eval_score": eval_result["eval_score"],
        "missing_steps": eval_result.get("missing_steps", []),
        "calculation_mistakes": eval_result.get("calculation_mistakes", []),
        "alternative_solution": eval_result.get("alternative_solution", ""),
        "feedback": eval_result.get("feedback", ""),
        "new_mastery_score": progress.mastery_score
    }
