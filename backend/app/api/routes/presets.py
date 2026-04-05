import mimetypes
from pathlib import Path

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from backend.app.core.config import get_settings
from backend.app.api.deps import get_current_user
from backend.app.db.session import get_db
from backend.app.models.user import User
from backend.app.models.voice_preset import VoicePreset
from backend.app.schemas.preset import DesignedPresetCreateRequest, VoicePresetResponse
from backend.app.services.voice_design import (
    create_designed_preset,
    list_presets as list_voice_presets,
    materialize_preset_reference_audio,
    queue_preset_reference_audio_generation,
    run_preset_reference_audio_generation,
)

router = APIRouter()
settings = get_settings()


@router.get("", response_model=list[VoicePresetResponse])
def list_presets_route(_: User = Depends(get_current_user), db: Session = Depends(get_db)) -> list[VoicePresetResponse]:
    presets = list_voice_presets(db)
    return [VoicePresetResponse.model_validate(preset) for preset in presets]


@router.get("/{preset_code}/reference-audio")
def get_reference_audio(
    preset_code: str,
    _: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> FileResponse:
    preset = db.query(VoicePreset).filter(VoicePreset.preset_code == preset_code).first()
    if not preset:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Preset not found")

    if not preset.reference_audio_path:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Reference audio not available")

    audio_path = Path(preset.reference_audio_path).expanduser().resolve()
    library_root = settings.preset_library_dir.resolve()

    if library_root not in audio_path.parents:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Reference audio path is not allowed")

    if not audio_path.is_file():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Reference audio file not found")

    media_type, _ = mimetypes.guess_type(audio_path.name)
    return FileResponse(audio_path, media_type=media_type or "audio/wav", filename=audio_path.name)


@router.post("/{preset_code}/materialize", response_model=VoicePresetResponse)
def materialize_preset_route(
    preset_code: str,
    background_tasks: BackgroundTasks,
    _: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> VoicePresetResponse:
    preset = db.query(VoicePreset).filter(VoicePreset.preset_code == preset_code).first()
    if not preset:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Preset not found")

    if preset.reference_audio_status == "generating":
        return VoicePresetResponse.model_validate(preset)

    if preset.reference_audio_path and preset.reference_audio_status == "ready":
        return VoicePresetResponse.model_validate(preset)

    try:
        queued = queue_preset_reference_audio_generation(db, preset)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(exc)) from exc

    background_tasks.add_task(run_preset_reference_audio_generation, preset_code)
    return VoicePresetResponse.model_validate(queued)


@router.post("/design", response_model=VoicePresetResponse, status_code=status.HTTP_201_CREATED)
def design_preset(
    payload: DesignedPresetCreateRequest,
    _: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> VoicePresetResponse:
    try:
        preset = create_designed_preset(db, payload)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(exc)) from exc

    return VoicePresetResponse.model_validate(preset)