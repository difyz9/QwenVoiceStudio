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


def load_tasks(config_path: str, config_json: str) -> list[dict]:
    if config_json:
        config = json.loads(config_json)
    else:
        path = Path(config_path)
        with path.open("r", encoding="utf-8") as file:
            config = json.load(file)

    if isinstance(config, list):
        tasks = config
    elif isinstance(config, dict):
        tasks = config.get("tasks", [])
    else:
        raise ValueError("Task config must be a JSON array or a JSON object with a 'tasks' array.")

    if not tasks:
        raise ValueError("No tasks found in config. Expected a JSON array or an object with a 'tasks' array.")
    return tasks


def load_preset(library_dir: Path, preset_id: str) -> dict:
    metadata_path = library_dir / preset_id / "metadata.json"
    if not metadata_path.exists():
        raise FileNotFoundError(f"Preset metadata not found: {metadata_path}")
    with metadata_path.open("r", encoding="utf-8") as file:
        return json.load(file)


def normalize_texts(task: dict) -> list[str]:
    if "texts" in task:
        texts = task["texts"]
        if not isinstance(texts, list) or not texts:
            raise ValueError("'texts' must be a non-empty array when provided.")
        return [str(text) for text in texts]
    if "text" in task:
        return [str(task["text"])]
    raise ValueError("Each task must contain either 'text' or 'texts'.")


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


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate audio in batch from a JSON array of preset-based tasks.")
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
    parser.add_argument(
        "--config",
        default="configs/preset_generation_tasks.array.example.json",
        help="Task config JSON path.",
    )
    parser.add_argument(
        "--config-json",
        default="",
        help="Inline JSON text. Supports either a top-level array or an object with a 'tasks' array.",
    )
    parser.add_argument(
        "--default-output-root",
        default="outputs/preset_tasks",
        help="Default output root when a task does not specify output_dir.",
    )
    parser.add_argument(
        "--default-pause-ms",
        type=int,
        default=300,
        help="Default silence duration between merged lines in milliseconds.",
    )
    args = parser.parse_args()

    library_dir = Path(args.library_dir)
    default_output_root = Path(args.default_output_root)
    tasks = load_tasks(args.config, args.config_json)

    model = build_model(args.model)
    prompt_cache: dict[str, dict] = {}

    for index, task in enumerate(tasks, start=1):
        preset_id = task["preset"]
        task_id = task.get("task_id") or f"task_{index:02d}_{preset_id}"
        texts = normalize_texts(task)

        preset = load_preset(library_dir, preset_id)
        if preset_id not in prompt_cache:
            prompt_cache[preset_id] = model.create_voice_clone_prompt(
                ref_audio=preset["reference_audio"],
                ref_text=preset["ref_text"],
            )

        language = task.get("language") or preset["language"]
        output_dir = Path(task.get("output_dir") or (default_output_root / task_id))
        output_dir.mkdir(parents=True, exist_ok=True)

        wavs, sample_rate = model.generate_voice_clone(
            text=texts,
            language=[language] * len(texts),
            voice_clone_prompt=prompt_cache[preset_id],
        )

        for wav_index, wav in enumerate(wavs, start=1):
            output_path = output_dir / f"line_{wav_index:02d}.wav"
            sf.write(output_path, wav, sample_rate)
            print(f"[{task_id}] Saved audio to {output_path}")

        merged_output = task.get("merged_output")
        if merged_output:
            merged_output_path = Path(merged_output)
        elif task.get("merge", False):
            merged_output_path = output_dir / "final.wav"
        else:
            merged_output_path = None

        if merged_output_path is not None:
            pause_ms = int(task.get("pause_ms", args.default_pause_ms))
            merge_audio(wavs, sample_rate, merged_output_path, pause_ms)
            print(f"[{task_id}] Saved merged audio to {merged_output_path}")


if __name__ == "__main__":
    main()