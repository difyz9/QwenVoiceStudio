from datetime import datetime

from sqlalchemy import DateTime, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from backend.app.db_models import Base


class VoicePreset(Base):
    __tablename__ = "voice_presets"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    preset_code: Mapped[str] = mapped_column(String(64), unique=True, nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    language: Mapped[str] = mapped_column(String(32), nullable=False)
    instruct: Mapped[str] = mapped_column(Text, nullable=False)
    ref_text: Mapped[str] = mapped_column(Text, nullable=False)
    reference_audio_path: Mapped[str | None] = mapped_column(Text, nullable=True)
    reference_audio_status: Mapped[str] = mapped_column(String(32), default="missing", nullable=False)
    reference_audio_error: Mapped[str | None] = mapped_column(Text, nullable=True)
    source_type: Mapped[str] = mapped_column(String(32), default="builtin", nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)