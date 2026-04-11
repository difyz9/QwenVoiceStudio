from __future__ import annotations

import json
import re
from functools import lru_cache
from pathlib import Path

import soundfile as sf
from sqlalchemy.orm import Session

from backend.app.core.config import get_settings
from backend.app.db.session import SessionLocal
from backend.app.db_models.voice_preset import VoicePreset
from backend.app.services.model_loader import resolve_model_source
from backend.app.schemas.preset import DesignedPresetCreateRequest

settings = get_settings()


@lru_cache(maxsize=1)
def get_voice_design_model():
    try:
        import torch
        from qwen_tts import Qwen3TTSModel
    except ImportError as exc:
        raise RuntimeError(
            "Qwen TTS runtime is not installed. Install backend dependencies before running voice design."
        ) from exc

    use_cuda = torch.cuda.is_available()
    load_kwargs = {
        "device_map": "cuda:0" if use_cuda else "cpu",
        "dtype": torch.bfloat16 if use_cuda else torch.float16,
        "low_cpu_mem_usage": not use_cuda,
    }
    if use_cuda:
        load_kwargs["attn_implementation"] = "flash_attention_2"
    model_source = resolve_model_source(
        settings.qwen_tts_voice_design_model,
        config_env_name="QWEN_TTS_VOICE_DESIGN_MODEL",
    )
    return Qwen3TTSModel.from_pretrained(model_source, **load_kwargs)


def create_designed_preset(db: Session, payload: DesignedPresetCreateRequest) -> VoicePreset:
    preset_code = slugify(payload.preset_code)
    existing = db.query(VoicePreset).filter(VoicePreset.preset_code == preset_code).first()
    if existing:
        raise ValueError(f"Preset '{preset_code}' already exists.")

    preset_dir = settings.preset_library_dir / preset_code
    if preset_dir.exists():
        raise ValueError(f"Preset asset directory already exists: {preset_dir}")

    preset_dir.mkdir(parents=True, exist_ok=False)

    try:
        model = get_voice_design_model()
        wavs, sample_rate = model.generate_voice_design(
            text=payload.ref_text,
            language=payload.language,
            instruct=payload.instruct,
        )

        reference_audio_path = preset_dir / "ref.wav"
        reference_text_path = preset_dir / "ref.txt"
        metadata_path = preset_dir / "metadata.json"

        sf.write(reference_audio_path, wavs[0], sample_rate)
        reference_text_path.write_text(payload.ref_text, encoding="utf-8")

        metadata = {
            "id": preset_code,
            "name": payload.name,
            "language": payload.language,
            "ref_text": payload.ref_text,
            "instruct": payload.instruct,
            "reference_audio": str(reference_audio_path.resolve()),
            "sample_rate": sample_rate,
        }
        metadata_path.write_text(json.dumps(metadata, ensure_ascii=False, indent=2), encoding="utf-8")

        preset = VoicePreset(
            preset_code=preset_code,
            name=payload.name,
            language=payload.language,
            instruct=payload.instruct,
            ref_text=payload.ref_text,
            reference_audio_path=str(reference_audio_path.resolve()),
            reference_audio_status="ready",
            reference_audio_error=None,
            source_type="designed",
        )
        db.add(preset)
        db.commit()
        db.refresh(preset)

        rebuild_manifest(db)
        return preset
    except Exception:
        cleanup_preset_dir(preset_dir)
        raise


def materialize_preset_reference_audio(db: Session, preset: VoicePreset) -> VoicePreset:
    if not preset.instruct.strip():
        raise ValueError(f"Preset '{preset.preset_code}' has no voice design instruction.")
    if not preset.ref_text.strip():
        raise ValueError(f"Preset '{preset.preset_code}' has no reference text.")

    preset_dir = settings.preset_library_dir / preset.preset_code
    preset_dir.mkdir(parents=True, exist_ok=True)

    reference_audio_path = preset_dir / "ref.wav"
    reference_text_path = preset_dir / "ref.txt"
    metadata_path = preset_dir / "metadata.json"

    model = get_voice_design_model()
    wavs, sample_rate = model.generate_voice_design(
        text=preset.ref_text,
        language=preset.language,
        instruct=preset.instruct,
    )

    sf.write(reference_audio_path, wavs[0], sample_rate)
    reference_text_path.write_text(preset.ref_text, encoding="utf-8")

    metadata = {
        "id": preset.preset_code,
        "name": preset.name,
        "language": preset.language,
        "ref_text": preset.ref_text,
        "instruct": preset.instruct,
        "reference_audio": str(reference_audio_path.resolve()),
        "sample_rate": sample_rate,
    }
    metadata_path.write_text(json.dumps(metadata, ensure_ascii=False, indent=2), encoding="utf-8")

    preset.reference_audio_path = str(reference_audio_path.resolve())
    preset.reference_audio_status = "ready"
    preset.reference_audio_error = None
    db.add(preset)
    db.commit()
    db.refresh(preset)

    rebuild_manifest(db)
    return preset


def queue_preset_reference_audio_generation(db: Session, preset: VoicePreset) -> VoicePreset:
    preset.reference_audio_status = "generating"
    preset.reference_audio_error = None
    db.add(preset)
    db.commit()
    db.refresh(preset)
    return preset


def run_preset_reference_audio_generation(preset_code: str) -> None:
    with SessionLocal() as db:
        preset = db.query(VoicePreset).filter(VoicePreset.preset_code == preset_code).first()
        if not preset:
            return

        try:
            materialize_preset_reference_audio(db, preset)
        except Exception as exc:
            db.rollback()
            failed_preset = db.query(VoicePreset).filter(VoicePreset.preset_code == preset_code).first()
            if not failed_preset:
                return
            failed_preset.reference_audio_status = "failed"
            failed_preset.reference_audio_error = str(exc)
            db.add(failed_preset)
            db.commit()


def list_presets(db: Session) -> list[VoicePreset]:
    return db.query(VoicePreset).order_by(VoicePreset.created_at.desc()).all()


def rebuild_manifest(db: Session) -> None:
    presets = list_presets(db)
    settings.preset_library_dir.mkdir(parents=True, exist_ok=True)
    manifest = []
    for preset in presets:
        metadata_path = settings.preset_library_dir / preset.preset_code / "metadata.json"
        if metadata_path.exists():
            with metadata_path.open("r", encoding="utf-8") as file:
                manifest.append(json.load(file))
            continue

        manifest.append(
            {
                "id": preset.preset_code,
                "name": preset.name,
                "language": preset.language,
                "ref_text": preset.ref_text,
                "instruct": preset.instruct,
                "reference_audio": preset.reference_audio_path,
                "sample_rate": None,
            }
        )

    manifest_path = settings.preset_library_dir / "index.json"
    manifest_path.write_text(json.dumps({"presets": manifest}, ensure_ascii=False, indent=2), encoding="utf-8")


def cleanup_preset_dir(preset_dir: Path) -> None:
    if not preset_dir.exists():
        return
    for child in preset_dir.iterdir():
        if child.is_file():
            child.unlink()
    preset_dir.rmdir()


def slugify(value: str) -> str:
    value = value.strip().lower()
    value = re.sub(r"[^a-z0-9_-]+", "_", value)
    value = re.sub(r"_+", "_", value).strip("_")
    return value or "voice_preset"