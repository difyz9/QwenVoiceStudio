from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from backend.app.api.deps import get_current_user
from backend.app.db.session import get_db
from backend.app.models.synthesis_job import SynthesisJob
from backend.app.models.user import User
from backend.app.models.voice_preset import VoicePreset
from backend.app.schemas.common import ApiResponse, success_response
from backend.app.schemas.task import TaskDetailResponse, TaskSummaryResponse
from backend.app.services.synthesis import create_synthesis_job
from backend.app.services.voice_design import queue_preset_reference_audio_generation, run_preset_reference_audio_generation

router = APIRouter()


def _build_preset_task(preset: VoicePreset) -> TaskSummaryResponse:
    return TaskSummaryResponse(
        task_code=f"preset:{preset.preset_code}",
        task_type="preset_reference_audio",
        title="参考音频生成",
        detail=f"{preset.name} ({preset.preset_code})",
        status=preset.reference_audio_status,
        error_message=preset.reference_audio_error,
        created_at=preset.created_at,
        output_path=preset.reference_audio_path,
        action_path=f"/presets?preset={preset.preset_code}",
    )


def _build_synthesis_task(job: SynthesisJob) -> TaskSummaryResponse:
    text_count = len(job.input_payload.get("texts", [])) if isinstance(job.input_payload, dict) else 0
    return TaskSummaryResponse(
        task_code=job.job_code,
        task_type="synthesis",
        title="批量语音合成",
        detail=f"{job.preset_code} · {text_count} 条文本",
        status=job.status,
        error_message=job.error_message,
        created_at=job.created_at,
        output_path=job.merged_audio_path,
        action_path=f"/synthesis?preset={job.preset_code}",
    )


def _build_preset_task_detail(preset: VoicePreset) -> TaskDetailResponse:
    summary = _build_preset_task(preset)
    return TaskDetailResponse(
        **summary.model_dump(),
        source_code=preset.preset_code,
        source_name=preset.name,
        instruct=preset.instruct,
        reference_text=preset.ref_text,
        input_payload={
            "language": preset.language,
            "source_type": preset.source_type,
        },
    )


def _build_synthesis_task_detail(job: SynthesisJob) -> TaskDetailResponse:
    summary = _build_synthesis_task(job)
    return TaskDetailResponse(
        **summary.model_dump(),
        source_code=job.preset_code,
        source_name=job.preset_code,
        input_payload=job.input_payload if isinstance(job.input_payload, dict) else None,
    )


@router.get(
    "",
    response_model=ApiResponse[list[TaskSummaryResponse]],
    summary="List unified tasks",
    description="Return a unified task feed composed of preset reference-audio generation and synthesis jobs.",
)
def list_tasks(
    _: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    limit: int = Query(default=50, ge=1, le=200),
) -> ApiResponse[list[TaskSummaryResponse]]:
    presets = db.query(VoicePreset).order_by(VoicePreset.created_at.desc()).all()
    synthesis_jobs = db.query(SynthesisJob).order_by(SynthesisJob.created_at.desc()).limit(limit).all()

    tasks: list[TaskSummaryResponse] = []

    for preset in presets:
        if preset.reference_audio_status == "missing":
            continue

        tasks.append(_build_preset_task(preset))

    for job in synthesis_jobs:
        tasks.append(_build_synthesis_task(job))

    tasks.sort(key=lambda item: item.created_at, reverse=True)
    return success_response(tasks[:limit])


@router.get(
    "/{task_code:path}",
    response_model=ApiResponse[TaskDetailResponse],
    summary="Get task detail",
    description="Return detailed task information including input payload, outputs, source object, and optional design content.",
)
def get_task_detail(
    task_code: str,
    _: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ApiResponse[TaskDetailResponse]:
    if task_code.startswith("preset:"):
        preset_code = task_code.split(":", 1)[1]
        preset = db.query(VoicePreset).filter(VoicePreset.preset_code == preset_code).first()
        if not preset or preset.reference_audio_status == "missing":
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")

        return success_response(_build_preset_task_detail(preset))

    job = db.query(SynthesisJob).filter(SynthesisJob.job_code == task_code).first()
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")

    return success_response(_build_synthesis_task_detail(job))


@router.post(
    "/{task_code:path}/retry",
    response_model=ApiResponse[TaskDetailResponse],
    summary="Retry task",
    description="Retry a failed or completed task. Preset tasks are re-queued, synthesis tasks are recreated from stored input payload.",
)
def retry_task(
    task_code: str,
    background_tasks: BackgroundTasks,
    _: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ApiResponse[TaskDetailResponse]:
    if task_code.startswith("preset:"):
        preset_code = task_code.split(":", 1)[1]
        preset = db.query(VoicePreset).filter(VoicePreset.preset_code == preset_code).first()
        if not preset:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
        if preset.reference_audio_status == "generating":
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Task is already running")

        queued = queue_preset_reference_audio_generation(db, preset)
        background_tasks.add_task(run_preset_reference_audio_generation, preset_code)
        return success_response(_build_preset_task_detail(queued), "Task retry queued")

    job = db.query(SynthesisJob).filter(SynthesisJob.job_code == task_code).first()
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
    if job.status not in {"failed", "completed"}:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Only finished tasks can be retried")

    preset = db.query(VoicePreset).filter(VoicePreset.preset_code == job.preset_code).first()
    if not preset:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Preset not found")

    payload = job.input_payload if isinstance(job.input_payload, dict) else {}
    texts = payload.get("texts") if isinstance(payload.get("texts"), list) else []
    language = payload.get("language") if isinstance(payload.get("language"), str) else None
    merge_output = bool(payload.get("merge_output", True))
    pause_ms = int(payload.get("pause_ms", 300))

    try:
        retried_job = create_synthesis_job(
            db,
            preset=preset,
            texts=[text for text in texts if isinstance(text, str)],
            language=language,
            merge_output=merge_output,
            pause_ms=pause_ms,
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(exc)) from exc

    return success_response(_build_synthesis_task_detail(retried_job), "Task retried successfully")