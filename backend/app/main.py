from contextlib import asynccontextmanager

from sqlalchemy import text
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.app.api.routes import auth, presets, synthesis, system, tasks
from backend.app.core.config import get_settings
from backend.app.db.session import SessionLocal, engine
from backend.app.models import Base
from backend.app.services.bootstrap import bootstrap_system

settings = get_settings()


def ensure_runtime_schema() -> None:
    statements = [
        "ALTER TABLE voice_presets ADD COLUMN IF NOT EXISTS reference_audio_status VARCHAR(32) NOT NULL DEFAULT 'missing'",
        "ALTER TABLE voice_presets ADD COLUMN IF NOT EXISTS reference_audio_error TEXT NULL",
        "UPDATE voice_presets SET reference_audio_status = CASE WHEN reference_audio_path IS NULL OR reference_audio_path = '' THEN 'missing' ELSE 'ready' END WHERE reference_audio_status IS NULL OR reference_audio_status = ''",
        "UPDATE voice_presets SET reference_audio_status = 'failed', reference_audio_error = 'Generation was interrupted by service restart. Please retry.' WHERE reference_audio_status = 'generating' AND (reference_audio_path IS NULL OR reference_audio_path = '')",
    ]

    with engine.begin() as connection:
        for statement in statements:
            connection.execute(text(statement))


@asynccontextmanager
async def lifespan(_: FastAPI):
    Base.metadata.create_all(bind=engine)
    ensure_runtime_schema()
    with SessionLocal() as session:
        bootstrap_system(session)
    yield


app = FastAPI(
    title=settings.app_name,
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(system.router, prefix="/api/v1/system", tags=["system"])
app.include_router(auth.router, prefix="/api/v1/auth", tags=["auth"])
app.include_router(tasks.router, prefix="/api/v1/tasks", tags=["tasks"])
app.include_router(presets.router, prefix="/api/v1/presets", tags=["presets"])
app.include_router(synthesis.router, prefix="/api/v1/synthesis", tags=["synthesis"])