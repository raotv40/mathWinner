from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    PROJECT_NAME: str = "MathWinner AI"
    API_V1_STR: str = "/api/v1"
    SECRET_KEY: str = "supersecretkeychangeinproduction1234567890"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    
    # Database Config
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/mathwinner"
    
    # Redis Config
    REDIS_URL: str = "redis://localhost:6379/0"
    
    # OpenAI & AI Config
    OPENAI_API_KEY: Optional[str] = None
    OLLAMA_BASE_URL: str = "http://localhost:11434"
    
    # Video & PDF Processing Storage
    UPLOAD_DIR: str = "uploads"
    OFFLINE_PACKAGES_DIR: str = "offline_packages"
    
    class Config:
        env_file = ".env"
        case_sensitive = True

settings = Settings()
