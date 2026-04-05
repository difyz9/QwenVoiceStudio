from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.app.api.deps import get_current_user
from backend.app.db.session import get_db
from backend.app.models.user import User
from backend.app.models.voice_preset import VoicePreset
from backend.app.schemas.synthesis import SynthesisJobCreateRequest, SynthesisJobResponse
from backend.app.services.synthesis import create_synthesis_job, list_recent_jobs

router = APIRouter()


@router.get("/jobs", response_model=list[SynthesisJobResponse])
def get_jobs(_: User = Depends(get_current_user), db: Session = Depends(get_db)) -> list[SynthesisJobResponse]:
    jobs = list_recent_jobs(db)
    return [SynthesisJobResponse.model_validate(job) for job in jobs]


@router.post("/jobs", response_model=SynthesisJobResponse, status_code=status.HTTP_201_CREATED)
def create_job(
    payload: SynthesisJobCreateRequest,
    _: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> SynthesisJobResponse:
    preset = db.query(VoicePreset).filter(VoicePreset.preset_code == payload.preset_code).first()
    if not preset:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Preset not found")

    try:
        job = create_synthesis_job(
            db,
            preset=preset,
            texts=payload.texts,
            language=payload.language,
            merge_output=payload.merge_output,
            pause_ms=payload.pause_ms,
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(exc)) from exc

    return SynthesisJobResponse.model_validate(job)