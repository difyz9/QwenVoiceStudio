from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    pass


from backend.app.db_models.synthesis_job import SynthesisJob  # noqa: E402,F401
from backend.app.db_models.user import User  # noqa: E402,F401
from backend.app.db_models.voice_preset import VoicePreset  # noqa: E402,F401