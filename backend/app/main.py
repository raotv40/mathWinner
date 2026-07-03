from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os

from app.core.config import settings
from app.routers import auth, chapters, practice, tutor, whiteboard, analytics, admin
from app.db.models import Base
from app.db.session import engine

# FastAPI App Lifespan
async def lifespan(app: FastAPI):
    # Ensure local upload directories exist
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    os.makedirs(settings.OFFLINE_PACKAGES_DIR, exist_ok=True)
    
    # In development, try to auto-create base database tables if pgvector/db connection is active
    try:
        async with engine.begin() as conn:
            # We skip creating all tables automatically if we are running in strict production environments
            # where Alembic is managing schemas, but for direct setup, this ensures tables are ready.
            await conn.run_sync(Base.metadata.create_all)
        print("Database tables initialized successfully.")
    except Exception as e:
        print(f"Database auto-migration skipped or failed: {e}")
        
    yield
    # Cleanup on shutdown
    pass

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    lifespan=lifespan
)

# CORS middleware configurations
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, restrict this to the frontend domains
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serves processed uploads (PDF & Video files)
app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")

# Include Routers
app.include_router(auth.router, prefix=settings.API_V1_STR)
app.include_router(chapters.router, prefix=settings.API_V1_STR)
app.include_router(practice.router, prefix=settings.API_V1_STR)
app.include_router(tutor.router, prefix=settings.API_V1_STR)
app.include_router(whiteboard.router, prefix=settings.API_V1_STR)
app.include_router(analytics.router, prefix=settings.API_V1_STR)
app.include_router(admin.router, prefix=settings.API_V1_STR)

@app.get("/")
def read_root():
    return {"message": "Welcome to MathWinner AI Learning Platform API", "docs": "/docs"}
