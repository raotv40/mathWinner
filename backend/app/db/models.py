from sqlalchemy import Column, String, Integer, Float, ForeignKey, Text, JSON, DateTime, Table
from sqlalchemy.orm import declarative_base, relationship
from sqlalchemy.dialects.postgresql import UUID, JSONB
import uuid
from datetime import datetime

Base = declarative_base()

# Many-to-many relationship for Concept Links (Mind Map Edges)
concept_connections = Table(
    'concept_connections',
    Base.metadata,
    Column('source_id', UUID(as_uuid=True), ForeignKey('concepts.id', on_delete='CASCADE'), primary_key=True),
    Column('target_id', UUID(as_uuid=True), ForeignKey('concepts.id', on_delete='CASCADE'), primary_key=True)
)

class User(Base):
    __tablename__ = "users"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255))
    role = Column(String(50), nullable=False) # 'student', 'parent', 'teacher', 'admin'
    class_level = Column(Integer) # 1 to 12
    created_at = Column(DateTime, default=datetime.utcnow)

class Chapter(Base):
    __tablename__ = "chapters"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    class_level = Column(Integer, nullable=False)
    subject = Column(String(100), default="Mathematics")
    title = Column(String(255), nullable=False)
    chapter_number = Column(Integer, nullable=False)
    pdf_url = Column(String(512))
    video_url = Column(String(512))
    summary = Column(Text)
    formulas = Column(JSONB) # list of formula objects
    mind_map = Column(JSONB) # nodes and links
    offline_package_url = Column(String(512))
    created_at = Column(DateTime, default=datetime.utcnow)
    
    concepts = relationship("Concept", back_populates="chapter", cascade="all, delete-orphan")
    questions = relationship("Question", back_populates="chapter", cascade="all, delete-orphan")
    embeddings = relationship("ChapterEmbedding", back_populates="chapter", cascade="all, delete-orphan")

class Concept(Base):
    __tablename__ = "concepts"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    chapter_id = Column(UUID(as_uuid=True), ForeignKey("chapters.id", on_delete="CASCADE"), nullable=False)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    parent_concept_id = Column(UUID(as_uuid=True), ForeignKey("concepts.id", on_delete="SET NULL"))
    created_at = Column(DateTime, default=datetime.utcnow)
    
    chapter = relationship("Chapter", back_populates="concepts")
    
    # Self-referential hierarchy
    parent_concept = relationship("Concept", remote_side=[id])
    
    # Graph connections
    related_concepts = relationship(
        "Concept",
        secondary=concept_connections,
        primaryjoin=id==concept_connections.c.source_id,
        secondaryjoin=id==concept_connections.c.target_id,
        backref="incoming_concepts"
    )

class ChapterEmbedding(Base):
    __tablename__ = "chapter_embeddings"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    chapter_id = Column(UUID(as_uuid=True), ForeignKey("chapters.id", on_delete="CASCADE"), nullable=False)
    concept_id = Column(UUID(as_uuid=True), ForeignKey("concepts.id", on_delete="SET NULL"), nullable=True)
    source_type = Column(String(50), nullable=False) # 'pdf' or 'video'
    content = Column(Text, nullable=False)
    timestamp_seconds = Column(Float)
    
    # We will store embedding as JSONB / array of floats to avoid hard dependency on local pgvector binary setup during direct runner startup
    embedding = Column(JSONB, nullable=False) 
    created_at = Column(DateTime, default=datetime.utcnow)
    
    chapter = relationship("Chapter", back_populates="embeddings")

class Question(Base):
    __tablename__ = "questions"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    chapter_id = Column(UUID(as_uuid=True), ForeignKey("chapters.id", on_delete="CASCADE"), nullable=False)
    concept_id = Column(UUID(as_uuid=True), ForeignKey("concepts.id", on_delete="SET NULL"), nullable=True)
    difficulty = Column(String(50), nullable=False) # 'easy', 'medium', 'hard'
    category = Column(String(100), nullable=False) # 'board', 'olympiad', 'hots', 'competency', 'case-study'
    question_text = Column(Text, nullable=False)
    question_type = Column(String(50), nullable=False) # 'mcq', 'assertion-reason', 'word-problem'
    options = Column(JSONB) # list of options
    correct_answer = Column(Text, nullable=False)
    hints = Column(JSONB, nullable=False) # list of hints
    step_by_step_solution = Column(JSONB, nullable=False) # list of step objects
    created_at = Column(DateTime, default=datetime.utcnow)
    
    chapter = relationship("Chapter", back_populates="questions")

class StudentProgress(Base):
    __tablename__ = "student_progress"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", on_delete="CASCADE"), nullable=False)
    chapter_id = Column(UUID(as_uuid=True), ForeignKey("chapters.id", on_delete="CASCADE"), nullable=False)
    mastery_score = Column(Float, default=0.0)
    video_progress = Column(JSONB, default=dict) # dict of {video_chunk_id: bool}
    completed_videos = Column(Integer, default=0)
    practice_completed = Column(Integer, default=0)
    assessment_scores = Column(JSONB, default=list) # list of scores
    daily_streak = Column(Integer, default=0)
    learning_time = Column(Float, default=0.0) # in minutes
    last_active = Column(DateTime, default=datetime.utcnow)

class Submission(Base):
    __tablename__ = "submissions"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", on_delete="CASCADE"), nullable=False)
    question_id = Column(UUID(as_uuid=True), ForeignKey("questions.id", on_delete="CASCADE"), nullable=False)
    whiteboard_data = Column(Text) # JSON or SVG data from canvas
    is_correct = Column(String(50)) # 'correct', 'incorrect', 'partial'
    eval_score = Column(Integer) # out of 100
    eval_feedback = Column(JSONB) # list of step evaluations & mistakes
    time_taken = Column(Integer) # seconds
    created_at = Column(DateTime, default=datetime.utcnow)
