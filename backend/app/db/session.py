from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from app.core.config import settings

db_url = settings.DATABASE_URL
connect_args = {}
if "neon.tech" in db_url:
    connect_args = {"ssl": "require"}
    if "?" in db_url:
        db_url = db_url.split("?")[0]

engine = create_async_engine(
    db_url,
    echo=False,
    future=True,
    pool_pre_ping=True,
    connect_args=connect_args
)

SessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False
)

async def get_db():
    async with SessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
