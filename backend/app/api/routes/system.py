from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.app.api.deps import get_current_user
from backend.app.core.config import get_settings
from backend.app.db.session import get_db
from backend.app.models.user import User
from backend.app.models.voice_preset import VoicePreset
from backend.app.schemas.common import ApiResponse, success_response
from backend.app.schemas.system import HealthResponse, SummaryResponse

router = APIRouter()
settings = get_settings()


@router.get("/health", response_model=ApiResponse[HealthResponse])
def health() -> ApiResponse[HealthResponse]:
    return success_response(HealthResponse(status="ok", service=settings.app_name))


@router.get("/summary", response_model=ApiResponse[SummaryResponse])
def summary(user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> ApiResponse[SummaryResponse]:
    preset_count = db.query(VoicePreset).count()
    return success_response(
        SummaryResponse(
            appName=settings.app_name,
            currentUser=user.username,
            presetCount=preset_count,
            runtime=settings.app_env,
            defaultAdmin=settings.admin_username,
        )
    )