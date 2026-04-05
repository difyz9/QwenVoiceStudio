from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.app.api.deps import get_current_user
from backend.app.core.config import get_settings
from backend.app.db.session import get_db
from backend.app.models.user import User
from backend.app.models.voice_preset import VoicePreset

router = APIRouter()
settings = get_settings()


@router.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "service": settings.app_name}


@router.get("/summary")
def summary(user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> dict:
    preset_count = db.query(VoicePreset).count()
    return {
        "appName": settings.app_name,
        "currentUser": user.username,
        "presetCount": preset_count,
        "runtime": settings.app_env,
        "defaultAdmin": settings.admin_username,
    }