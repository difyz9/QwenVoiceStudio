import argparse
import json
import re
from pathlib import Path

import soundfile as sf
import torch
from qwen_tts import Qwen3TTSModel


def build_model(model_name: str) -> Qwen3TTSModel:
    use_cuda = torch.cuda.is_available()
    load_kwargs = {
        "device_map": "cuda:0" if use_cuda else "cpu",
        "dtype": torch.bfloat16 if use_cuda else torch.float32,
    }
    if use_cuda:
        load_kwargs["attn_implementation"] = "flash_attention_2"
    return Qwen3TTSModel.from_pretrained(model_name, **load_kwargs)


def slugify(value: str) -> str:
    value = value.strip().lower()
    value = re.sub(r"[^a-z0-9_-]+", "_", value)
    value = re.sub(r"_+", "_", value).strip("_")
    return value or "voice_preset"


def load_presets(config_path: str, config_json: str) -> list[dict]:
    if config_json:
        config = json.loads(config_json)
    else:
        path = Path(config_path)
        with path.open("r", encoding="utf-8") as file:
            config = json.load(file)

    if isinstance(config, list):
        presets = config
    elif isinstance(config, dict):
        presets = config.get("presets", [])
    else:
        raise ValueError("Config must be a JSON array or a JSON object with a 'presets' array.")

    if not presets:
        raise ValueError("No presets found in config. Expected a JSON array or an object with a 'presets' array.")

    return presets


def main() -> None:
    parser = argparse.ArgumentParser(description="Batch build reusable voice presets from a JSON config.")
    parser.add_argument(
        "--model",
        default="Qwen/Qwen3-TTS-12Hz-1.7B-VoiceDesign",
        help="VoiceDesign model id or local directory.",
    )
    parser.add_argument(
        "--config",
        default="configs/voice_presets.example.json",
        help="Preset config JSON path.",
    )
    parser.add_argument(
        "--config-json",
        default="",
        help="Inline JSON text. Supports either a top-level array or an object with a 'presets' array.",
    )
    parser.add_argument(
        "--library-dir",
        default="assets/voice_presets",
        help="Directory where preset assets and metadata will be saved.",
    )
    parser.add_argument(
        "--overwrite",
        action="store_true",
        help="Overwrite existing preset folders if they already exist.",
    )
    args = parser.parse_args()

    library_dir = Path(args.library_dir)
    library_dir.mkdir(parents=True, exist_ok=True)
    presets = load_presets(args.config, args.config_json)

    model = build_model(args.model)
    manifest = []

    for preset in presets:
        name = preset["name"]
        preset_id = preset.get("id") or slugify(name)
        language = preset["language"]
        ref_text = preset["ref_text"]
        instruct = preset["instruct"]

        preset_dir = library_dir / preset_id
        if preset_dir.exists() and not args.overwrite:
            metadata_path = preset_dir / "metadata.json"
            if metadata_path.exists():
                with metadata_path.open("r", encoding="utf-8") as file:
                    existing_metadata = json.load(file)
                manifest.append(existing_metadata)
                print(f"Skipped existing preset {preset_id}")
                continue
            raise FileExistsError(f"Preset directory already exists: {preset_dir}. Use --overwrite to replace it.")

        preset_dir.mkdir(parents=True, exist_ok=True)
        wavs, sample_rate = model.generate_voice_design(
            text=ref_text,
            language=language,
            instruct=instruct,
        )

        reference_audio_path = preset_dir / "ref.wav"
        reference_text_path = preset_dir / "ref.txt"
        metadata_path = preset_dir / "metadata.json"

        sf.write(reference_audio_path, wavs[0], sample_rate)
        reference_text_path.write_text(ref_text, encoding="utf-8")

        metadata = {
            "id": preset_id,
            "name": name,
            "language": language,
            "ref_text": ref_text,
            "instruct": instruct,
            "reference_audio": str(reference_audio_path.resolve()),
            "sample_rate": sample_rate,
        }
        metadata_path.write_text(json.dumps(metadata, ensure_ascii=False, indent=2), encoding="utf-8")
        manifest.append(metadata)
        print(f"Built preset {preset_id} -> {reference_audio_path}")

    manifest_path = library_dir / "index.json"
    manifest_path.write_text(json.dumps({"presets": manifest}, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Saved preset manifest to {manifest_path}")


if __name__ == "__main__":
    main()