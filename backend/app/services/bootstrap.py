import json
from pathlib import Path

from sqlalchemy.orm import Session

from backend.app.core.config import get_settings
from backend.app.core.security import hash_password
from backend.app.db_models.user import User
from backend.app.db_models.voice_preset import VoicePreset

settings = get_settings()


def bootstrap_system(db: Session) -> None:
    seed_admin(db)
    seed_presets(db)


def seed_admin(db: Session) -> None:
    existing_user = db.query(User).filter(User.username == settings.admin_username).first()
    if existing_user:
        return

    db.add(
        User(
            username=settings.admin_username,
            password_hash=hash_password(settings.admin_password),
            role="admin",
            status="active",
        )
    )
    db.commit()


def seed_presets(db: Session) -> None:
    seed_path = Path(settings.preset_seed_file)
    if not seed_path.exists():
        return

    with seed_path.open("r", encoding="utf-8") as file:
        config = json.load(file)

    presets = config if isinstance(config, list) else config.get("presets", [])
    for preset in presets:
        preset_code = preset.get("id")
        if not preset_code:
            continue
        metadata = load_preset_metadata(preset_code)
        reference_audio_path = metadata.get("reference_audio") if metadata else None
        reference_text = metadata.get("ref_text") if metadata else None
        existing = db.query(VoicePreset).filter(VoicePreset.preset_code == preset_code).first()
        if existing:
            changed = False
            if reference_audio_path and existing.reference_audio_path != reference_audio_path:
                existing.reference_audio_path = reference_audio_path
                changed = True
            desired_status = "ready" if reference_audio_path else "missing"
            if existing.reference_audio_status != desired_status:
                existing.reference_audio_status = desired_status
                changed = True
            if existing.reference_audio_error is not None:
                existing.reference_audio_error = None
                changed = True
            if reference_text and existing.ref_text != reference_text:
                existing.ref_text = reference_text
                changed = True
            if changed:
                db.add(existing)
            continue

        db.add(
            VoicePreset(
                preset_code=preset_code,
                name=preset.get("name", preset_code),
                language=preset.get("language", "Chinese"),
                instruct=preset.get("instruct", ""),
                ref_text=reference_text or preset.get("ref_text", ""),
                reference_audio_path=reference_audio_path,
                reference_audio_status="ready" if reference_audio_path else "missing",
                reference_audio_error=None,
                source_type="builtin",
            )
        )
    db.commit()


def load_preset_metadata(preset_code: str) -> dict | None:
    metadata_path = settings.preset_library_dir / preset_code / "metadata.json"
    if not metadata_path.exists():
        return None

    with metadata_path.open("r", encoding="utf-8") as file:
        metadata = json.load(file)

    reference_audio = metadata.get("reference_audio")
    if reference_audio:
        metadata["reference_audio"] = str(Path(reference_audio).resolve())
    return metadata