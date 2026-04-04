import argparse
import json
from pathlib import Path

import numpy as np
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


def load_preset(library_dir: Path, preset_id: str) -> dict:
    metadata_path = library_dir / preset_id / "metadata.json"
    if not metadata_path.exists():
        raise FileNotFoundError(f"Preset metadata not found: {metadata_path}")
    with metadata_path.open("r", encoding="utf-8") as file:
        return json.load(file)


def main() -> None:
    parser = argparse.ArgumentParser(description="Batch synthesize audio by reusable preset name.")
    parser.add_argument(
        "--model",
        default="Qwen/Qwen3-TTS-12Hz-1.7B-Base",
        help="Base model id or local directory.",
    )
    parser.add_argument(
        "--library-dir",
        default="assets/voice_presets",
        help="Directory where preset assets and metadata are stored.",
    )
    parser.add_argument("--preset", default="", help="Preset id, for example brand_female_01.")
    parser.add_argument(
        "--language",
        default="",
        help="Optional override language. Defaults to the preset language.",
    )
    parser.add_argument(
        "--text",
        action="append",
        help="One target sentence. Repeat this argument for batch synthesis.",
    )
    parser.add_argument(
        "--output-dir",
        default="outputs/use_voice_preset_batch",
        help="Directory for generated wav files.",
    )
    parser.add_argument(
        "--merged-output",
        default="",
        help="Optional path to save all generated lines as one merged wav file.",
    )
    parser.add_argument(
        "--pause-ms",
        type=int,
        default=300,
        help="Silence duration inserted between merged lines in milliseconds.",
    )
    parser.add_argument(
        "--list",
        action="store_true",
        help="List available presets in the library and exit.",
    )
    args = parser.parse_args()

    library_dir = Path(args.library_dir)
    manifest_path = library_dir / "index.json"
    if args.list:
        if not manifest_path.exists():
            raise FileNotFoundError(f"Preset manifest not found: {manifest_path}")
        with manifest_path.open("r", encoding="utf-8") as file:
            manifest = json.load(file)
        for preset in manifest.get("presets", []):
            print(f"{preset['id']}\t{preset['name']}\t{preset['language']}")
        return

    if not args.preset:
        raise ValueError("--preset is required unless you use --list.")
    if not args.text:
        raise ValueError("At least one --text is required unless you use --list.")

    preset = load_preset(library_dir, args.preset)
    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    model = build_model(args.model)
    voice_clone_prompt = model.create_voice_clone_prompt(
        ref_audio=preset["reference_audio"],
        ref_text=preset["ref_text"],
    )

    language = args.language or preset["language"]
    wavs, sample_rate = model.generate_voice_clone(
        text=args.text,
        language=[language] * len(args.text),
        voice_clone_prompt=voice_clone_prompt,
    )

    for index, wav in enumerate(wavs, start=1):
        output_path = output_dir / f"line_{index:02d}.wav"
        sf.write(output_path, wav, sample_rate)
        print(f"Saved audio to {output_path}")

    if args.merged_output:
        merged_output_path = Path(args.merged_output)
        merged_output_path.parent.mkdir(parents=True, exist_ok=True)
        pause_samples = int(sample_rate * args.pause_ms / 1000)
        pause_audio = np.zeros(pause_samples, dtype=wavs[0].dtype)
        merged_audio = []
        for index, wav in enumerate(wavs):
            merged_audio.append(wav)
            if index < len(wavs) - 1 and pause_samples > 0:
                merged_audio.append(pause_audio)
        sf.write(merged_output_path, np.concatenate(merged_audio), sample_rate)
        print(f"Saved merged audio to {merged_output_path}")


if __name__ == "__main__":
    main()