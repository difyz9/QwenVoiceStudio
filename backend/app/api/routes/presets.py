import mimetypes
from pathlib import Path

from fastapi import APIRouter, BackgroundTasks, Depends, File, Form, HTTPException, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from backend.app.core.config import get_settings
from backend.app.api.deps import get_current_user
from backend.app.db.session import get_db
from backend.app.db_models.user import User
from backend.app.db_models.voice_preset import VoicePreset
from backend.app.schemas.common import ApiResponse, success_response
from backend.app.schemas.preset import DesignedPresetCreateRequest, VoicePresetResponse
from backend.app.services.voice_design import (
    create_cloned_preset,
    create_designed_preset,
    list_presets as list_voice_presets,
    materialize_preset_reference_audio,
    queue_preset_reference_audio_generation,
    run_preset_reference_audio_generation,
)

router = APIRouter()
settings = get_settings()


@router.get(
    "",
    response_model=ApiResponse[list[VoicePresetResponse]],
    summary="List presets",
    description="Return all available voice presets with their reference-audio readiness state.",
)
def list_presets_route(_: User = Depends(get_current_user), db: Session = Depends(get_db)) -> ApiResponse[list[VoicePresetResponse]]:
    presets = list_voice_presets(db)
    return success_response([VoicePresetResponse.model_validate(preset) for preset in presets])


@router.get(
    "/{preset_code}/reference-audio",
    summary="Stream preset reference audio",
    description="Return the generated reference-audio file for a preset as a binary audio response.",
)
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


@router.post(
    "/{preset_code}/materialize",
    response_model=ApiResponse[VoicePresetResponse],
    summary="Generate preset reference audio",
    description="Queue or return the reference-audio generation state for an existing preset built from stored design text.",
)
def materialize_preset_route(
    preset_code: str,
    background_tasks: BackgroundTasks,
    _: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ApiResponse[VoicePresetResponse]:
    preset = db.query(VoicePreset).filter(VoicePreset.preset_code == preset_code).first()
    if not preset:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Preset not found")

    if preset.reference_audio_status == "generating":
        return success_response(VoicePresetResponse.model_validate(preset), "Preset generation is already running")

    if preset.reference_audio_path and preset.reference_audio_status == "ready":
        return success_response(VoicePresetResponse.model_validate(preset), "Reference audio is already ready")

    try:
        queued = queue_preset_reference_audio_generation(db, preset)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(exc)) from exc

    background_tasks.add_task(run_preset_reference_audio_generation, preset_code)
    return success_response(VoicePresetResponse.model_validate(queued), "Preset reference audio queued")


@router.post(
    "/design",
    response_model=ApiResponse[VoicePresetResponse],
    status_code=status.HTTP_201_CREATED,
    summary="Create designed preset",
    description="Create a new preset directly from design instructions and a reference script, then persist its generated assets.",
)
def design_preset(
    payload: DesignedPresetCreateRequest,
    _: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ApiResponse[VoicePresetResponse]:
    try:
        preset = create_designed_preset(db, payload)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(exc)) from exc

    return success_response(VoicePresetResponse.model_validate(preset), "Preset created successfully")


@router.post(
    "/clone",
    response_model=ApiResponse[VoicePresetResponse],
    status_code=status.HTTP_201_CREATED,
    summary="Create cloned preset",
    description="Upload a reference audio file with its transcript to create a voice clone preset.",
)
async def clone_preset(
    file: UploadFile = File(..., description="Audio file (WAV/MP3/FLAC/OGG)"),
    preset_code: str = Form(..., min_length=1, max_length=64),
    name: str = Form(..., min_length=1, max_length=120),
    language: str = Form(default="Chinese", max_length=32),
    ref_text: str = Form(..., min_length=1, max_length=500),
    _: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ApiResponse[VoicePresetResponse]:
    if not file.content_type or not file.content_type.startswith("audio/"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="请上传有效的音频文件（WAV/MP3/FLAC/OGG）。",
        )

    audio_data = await file.read()

    if not audio_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="上传的音频文件为空。",
        )

    max_size = 100 * 1024 * 1024
    if len(audio_data) > max_size:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="音频文件过大，请上传不超过 100MB 的文件。",
        )

    try:
        preset = create_cloned_preset(
            db,
            audio_data=audio_data,
            preset_code=preset_code,
            name=name,
            language=language,
            ref_text=ref_text,
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(exc)) from exc

    return success_response(VoicePresetResponse.model_validate(preset), "克隆音色创建成功")