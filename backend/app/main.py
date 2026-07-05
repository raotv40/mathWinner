from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os

from app.core.config import settings
from app.routers import auth, chapters, practice, tutor, whiteboard, analytics, admin
from app.db.models import Base
from app.db.session import engine

# Ensure local upload directories exist immediately at module load time
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
os.makedirs(settings.OFFLINE_PACKAGES_DIR, exist_ok=True)

# FastAPI App Lifespan
async def lifespan(app: FastAPI):
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

from fastapi.responses import FileResponse, StreamingResponse
from fastapi import Header, HTTPException
from typing import Optional

# Serves processed uploads (PDF & Video files) with HTTP Range support for Safari / Chrome streaming
@app.get("/uploads/{filename}")
async def get_uploaded_file(filename: str, range: Optional[str] = Header(None)):
    file_path = os.path.join(settings.UPLOAD_DIR, filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found")
        
    # Serve PDFs or non-mp4 files normally
    if not filename.lower().endswith(".mp4"):
        return FileResponse(file_path)
        
    # Serve MP4 videos with HTTP Range support
    file_size = os.path.getsize(file_path)
    if range:
        try:
            range_str = range.replace("bytes=", "")
            range_parts = range_str.split("-")
            start = int(range_parts[0]) if range_parts[0] else 0
            end = int(range_parts[1]) if len(range_parts) > 1 and range_parts[1] else file_size - 1
            
            if start >= file_size or end >= file_size:
                raise HTTPException(status_code=416, detail="Requested range not satisfiable")
                
            chunk_size = end - start + 1
            
            def file_iterator():
                with open(file_path, "rb") as f:
                    f.seek(start)
                    remaining = chunk_size
                    while remaining > 0:
                        to_read = min(remaining, 1024 * 64)
                        data = f.read(to_read)
                        if not data:
                            break
                        remaining -= len(data)
                        yield data
                        
            headers = {
                "Content-Range": f"bytes {start}-{end}/{file_size}",
                "Accept-Ranges": "bytes",
                "Content-Length": str(chunk_size),
                "Content-Type": "video/mp4",
            }
            return StreamingResponse(file_iterator(), status_code=206, headers=headers)
        except Exception:
            # Fallback to standard FileResponse if range parsing fails
            pass
            
    return FileResponse(file_path, media_type="video/mp4")

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
