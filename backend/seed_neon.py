import asyncio
import os
import sys
import uuid
import numpy as np

# Adjust system path to import app package
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.future import select
from app.db.models import Base, Chapter, Concept, ChapterEmbedding, Question
from app.services.pdf_agent import PDFAgent
from app.services.question_agent import QuestionAgent

from dotenv import load_dotenv
load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise ValueError("DATABASE_URL environment variable is not set in .env file")

async def main():
    print("Connecting to Neon remote database...")
    engine = create_async_engine(
        DATABASE_URL,
        connect_args={"ssl": "require"},
        echo=False
    )
    
    print("Step 1: Creating database tables...")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("Tables created successfully.")
    
    print("Step 2: Seeding initial math chapters and questions...")
    SessionMaker = async_sessionmaker(
        bind=engine,
        class_=AsyncSession,
        expire_on_commit=False
    )
    
    async with SessionMaker() as db:
        # Check if already seeded
        check = await db.execute(select(Chapter).limit(1))
        if check.scalars().first():
            print("Database already contains chapter data. Skipping seed.")
            return
            
        chapters_to_seed = [
            {"num": 4, "title": "Quadratic Equations", "class": 10},
            {"num": 8, "title": "Introduction to Trigonometry", "class": 10}
        ]
        
        for info in chapters_to_seed:
            chapter_id = uuid.uuid4()
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
                
            print(f"Seeded: {info['title']}")
            
        await db.commit()
        print("Neon database tables seeded successfully!")

if __name__ == "__main__":
    asyncio.run(main())
