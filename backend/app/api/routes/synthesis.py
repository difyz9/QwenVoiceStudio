from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.app.api.deps import get_current_user
from backend.app.db.session import get_db
from backend.app.models.user import User
from backend.app.models.voice_preset import VoicePreset
from backend.app.schemas.common import ApiResponse, success_response
from backend.app.schemas.synthesis import SynthesisJobCreateRequest, SynthesisJobResponse
from backend.app.services.synthesis import create_synthesis_job, list_recent_jobs

router = APIRouter()


@router.get(
    "/jobs",
    response_model=ApiResponse[list[SynthesisJobResponse]],
    summary="List synthesis jobs",
    description="Return recent synthesis jobs with output metadata and failure information when available.",
)
def get_jobs(_: User = Depends(get_current_user), db: Session = Depends(get_db)) -> ApiResponse[list[SynthesisJobResponse]]:
    jobs = list_recent_jobs(db)
    return success_response([SynthesisJobResponse.model_validate(job) for job in jobs])


@router.post(
    "/jobs",
    response_model=ApiResponse[SynthesisJobResponse],
    status_code=status.HTTP_201_CREATED,
    summary="Create synthesis job",
    description="Submit a batch synthesis request for an existing preset and return the created job record.",
)
def create_job(
    payload: SynthesisJobCreateRequest,
    _: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ApiResponse[SynthesisJobResponse]:
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

    return success_response(SynthesisJobResponse.model_validate(job), "Synthesis job created successfully")