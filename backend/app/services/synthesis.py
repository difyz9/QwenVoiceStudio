from __future__ import annotations

from functools import lru_cache
from pathlib import Path
from uuid import uuid4

import numpy as np
import soundfile as sf
from sqlalchemy.orm import Session

from backend.app.core.config import get_settings
from backend.app.db_models.synthesis_job import SynthesisJob
from backend.app.db_models.voice_preset import VoicePreset

settings = get_settings()


@lru_cache(maxsize=1)
def get_tts_model():
    try:
        import torch
        from qwen_tts import Qwen3TTSModel
    except ImportError as exc:
        raise RuntimeError(
            "Qwen TTS runtime is not installed. Install backend dependencies before running synthesis."
        ) from exc

    use_cuda = torch.cuda.is_available()
    load_kwargs = {
        "device_map": "cuda:0" if use_cuda else "cpu",
        "dtype": torch.bfloat16 if use_cuda else torch.float16,
        "low_cpu_mem_usage": not use_cuda,
    }
    if use_cuda:
        load_kwargs["attn_implementation"] = "flash_attention_2"
    return Qwen3TTSModel.from_pretrained(settings.qwen_tts_model, **load_kwargs)


def create_synthesis_job(
    db: Session,
    *,
    preset: VoicePreset,
    texts: list[str],
    language: str | None,
    merge_output: bool,
    pause_ms: int,
) -> SynthesisJob:
    cleaned_texts = [text.strip() for text in texts if text.strip()]
    if not cleaned_texts:
        raise ValueError("At least one synthesis text is required.")
    if not preset.reference_audio_path:
        raise ValueError(f"Preset '{preset.preset_code}' has no reference audio yet. Build preset assets first.")

    reference_audio = Path(preset.reference_audio_path)
    if not reference_audio.exists():
        raise ValueError(
            f"Reference audio for preset '{preset.preset_code}' is missing: {reference_audio}"
        )

    job_code = f"syn_{uuid4().hex[:12]}"
    output_dir = (settings.synthesis_output_dir / job_code).resolve()
    output_dir.mkdir(parents=True, exist_ok=True)

    job = SynthesisJob(
        job_code=job_code,
        preset_code=preset.preset_code,
        job_type="batch",
        status="running",
        input_payload={
            "texts": cleaned_texts,
            "language": language or preset.language,
            "merge_output": merge_output,
            "pause_ms": pause_ms,
            "output_dir": str(output_dir),
        },
    )
    db.add(job)
    db.commit()
    db.refresh(job)

    try:
        model = get_tts_model()
        voice_clone_prompt = model.create_voice_clone_prompt(
            ref_audio=str(reference_audio),
            ref_text=preset.ref_text,
        )
        wavs, sample_rate = model.generate_voice_clone(
            text=cleaned_texts,
            language=[language or preset.language] * len(cleaned_texts),
            voice_clone_prompt=voice_clone_prompt,
        )

        output_files: list[str] = []
        for index, wav in enumerate(wavs, start=1):
            output_path = output_dir / f"line_{index:02d}.wav"
            sf.write(output_path, wav, sample_rate)
            output_files.append(str(output_path))

        merged_audio_path: str | None = None
        if merge_output and wavs:
            merged_output_path = output_dir / "final.wav"
            merge_audio(wavs, sample_rate, merged_output_path, pause_ms)
            merged_audio_path = str(merged_output_path)

        job.status = "completed"
        job.merged_audio_path = merged_audio_path
        job.input_payload = {
            **job.input_payload,
            "output_files": output_files,
            "sample_rate": sample_rate,
        }
        db.add(job)
        db.commit()
        db.refresh(job)
        return job
    except Exception as exc:
        job.status = "failed"
        job.error_message = str(exc)
        db.add(job)
        db.commit()
        db.refresh(job)
        raise


def list_recent_jobs(db: Session, limit: int = 10) -> list[SynthesisJob]:
    return db.query(SynthesisJob).order_by(SynthesisJob.created_at.desc()).limit(limit).all()


def merge_audio(wavs: list, sample_rate: int, merged_output: Path, pause_ms: int) -> None:
    merged_output.parent.mkdir(parents=True, exist_ok=True)
    pause_samples = int(sample_rate * pause_ms / 1000)
    pause_audio = np.zeros(pause_samples, dtype=wavs[0].dtype)
    merged_audio = []
    for index, wav in enumerate(wavs):
        merged_audio.append(wav)
        if index < len(wavs) - 1 and pause_samples > 0:
            merged_audio.append(pause_audio)
    sf.write(merged_output, np.concatenate(merged_audio), sample_rate)