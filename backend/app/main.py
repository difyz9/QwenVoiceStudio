from contextlib import asynccontextmanager
from threading import Thread

from sqlalchemy import text
from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from backend.app.api.routes import auth, presets, synthesis, system, tasks
from backend.app.core.config import get_settings
from backend.app.db.session import SessionLocal, engine
from backend.app.db_models import Base
from backend.app.schemas.common import ApiErrorResponse
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

    # Preload TTS model in background so first synthesis doesn't timeout
    def _preload_tts_model() -> None:
        try:
            from backend.app.services.synthesis import get_tts_model
            get_tts_model()
        except Exception:
            pass  # Model loading errors handled on first actual use

    Thread(target=_preload_tts_model, daemon=True).start()

    # Mark stale running jobs as failed (from previous container crash/timeout)
    with SessionLocal() as session:
        from backend.app.db_models.synthesis_job import SynthesisJob
        stale_jobs = session.query(SynthesisJob).filter(SynthesisJob.status == "running").all()
        for job in stale_jobs:
            job.status = "failed"
            job.error_message = "Container restarted, job was interrupted."
        if stale_jobs:
            session.commit()

    yield


app = FastAPI(
    title=settings.app_name,
    version="0.1.0",
    description="Voice design, preset management, synthesis jobs, system health, and task orchestration APIs.",
    openapi_url="/api/openapi.json",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    lifespan=lifespan,
)

app.mount("/outputs", StaticFiles(directory="outputs"), name="outputs")


@app.exception_handler(HTTPException)
async def http_exception_handler(_: Request, exc: HTTPException) -> JSONResponse:
    return JSONResponse(
        status_code=exc.status_code,
        content=ApiErrorResponse(code=exc.status_code, message=str(exc.detail), data=None).model_dump(),
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(_: Request, exc: RequestValidationError) -> JSONResponse:
    return JSONResponse(
        status_code=422,
        content=ApiErrorResponse(code=422, message="Validation failed", data={"errors": exc.errors()}).model_dump(),
    )


@app.exception_handler(Exception)
async def unhandled_exception_handler(_: Request, __: Exception) -> JSONResponse:
    return JSONResponse(
        status_code=500,
        content=ApiErrorResponse(code=500, message="Internal server error", data=None).model_dump(),
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