from datetime import datetime

from sqlalchemy import JSON, DateTime, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from backend.app.db_models import Base


class SynthesisJob(Base):
    __tablename__ = "synthesis_jobs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    job_code: Mapped[str] = mapped_column(String(64), unique=True, nullable=False, index=True)
    preset_code: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    job_type: Mapped[str] = mapped_column(String(32), default="batch", nullable=False)
    status: Mapped[str] = mapped_column(String(32), default="pending", nullable=False)
    input_payload: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)
    merged_audio_path: Mapped[str | None] = mapped_column(Text, nullable=True)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)