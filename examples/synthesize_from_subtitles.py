import argparse
import json
import re
from dataclasses import dataclass
from pathlib import Path

import numpy as np
import soundfile as sf
import torch
from qwen_tts import Qwen3TTSModel


SRT_TIME_PATTERN = re.compile(
    r"(?P<start>\d{2}:\d{2}:\d{2},\d{3})\s*-->\s*(?P<end>\d{2}:\d{2}:\d{2},\d{3})"
)
TAG_PATTERN = re.compile(r"<[^>]+>")


@dataclass
class SubtitleCue:
    index: int
    start_ms: int
    end_ms: int
    text: str


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


def parse_timestamp_ms(value: str) -> int:
    hours, minutes, seconds_ms = value.split(":")
    seconds, milliseconds = seconds_ms.split(",")
    return (
        int(hours) * 3_600_000
        + int(minutes) * 60_000
        + int(seconds) * 1_000
        + int(milliseconds)
    )


def normalize_subtitle_text(text: str) -> str:
    stripped = TAG_PATTERN.sub("", text)
    lines = [line.strip() for line in stripped.splitlines() if line.strip()]
    return " ".join(lines)


def parse_srt(subtitle_path: Path) -> list[SubtitleCue]:
    raw_text = subtitle_path.read_text(encoding="utf-8-sig")
    blocks = re.split(r"\n\s*\n", raw_text.strip())
    cues: list[SubtitleCue] = []

    for block in blocks:
        lines = [line.rstrip() for line in block.splitlines() if line.strip()]
        if len(lines) < 2:
            continue

        if lines[0].isdigit():
            cue_index = int(lines[0])
            timing_line = lines[1]
            text_lines = lines[2:]
        else:
            cue_index = len(cues) + 1
            timing_line = lines[0]
            text_lines = lines[1:]

        match = SRT_TIME_PATTERN.fullmatch(timing_line)
        if not match:
            raise ValueError(f"Invalid SRT timing line: {timing_line}")

        text = normalize_subtitle_text("\n".join(text_lines))
        if not text:
            continue

        cues.append(
            SubtitleCue(
                index=cue_index,
                start_ms=parse_timestamp_ms(match.group("start")),
                end_ms=parse_timestamp_ms(match.group("end")),
                text=text,
            )
        )

    if not cues:
        raise ValueError(f"No subtitle cues parsed from {subtitle_path}")
    return cues


def merge_audio_with_subtitle_timeline(
    wavs: list[np.ndarray],
    sample_rate: int,
    cues: list[SubtitleCue],
    merged_output: Path,
    tail_silence_ms: int,
) -> None:
    merged_output.parent.mkdir(parents=True, exist_ok=True)
    cursor_ms = 0
    chunks: list[np.ndarray] = []
    sample_dtype = wavs[0].dtype

    for cue, wav in zip(cues, wavs):
        if cue.start_ms > cursor_ms:
            silence_samples = int(sample_rate * (cue.start_ms - cursor_ms) / 1000)
            if silence_samples > 0:
                chunks.append(np.zeros(silence_samples, dtype=sample_dtype))
            cursor_ms = cue.start_ms

        chunks.append(wav)
        cursor_ms += int(round(len(wav) * 1000 / sample_rate))

    if tail_silence_ms > 0:
        tail_samples = int(sample_rate * tail_silence_ms / 1000)
        if tail_samples > 0:
            chunks.append(np.zeros(tail_samples, dtype=sample_dtype))

    sf.write(merged_output, np.concatenate(chunks), sample_rate)


def main() -> None:
    parser = argparse.ArgumentParser(description="Synthesize speech from an SRT subtitle file by reusing a voice preset.")
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
    parser.add_argument("--preset", required=True, help="Preset id, for example brand_male_01.")
    parser.add_argument("--subtitle", required=True, help="Path to an .srt subtitle file.")
    parser.add_argument(
        "--language",
        default="",
        help="Optional override language. Defaults to the preset language.",
    )
    parser.add_argument(
        "--output-dir",
        default="outputs/subtitle_synthesis",
        help="Directory for generated wav files and merged audio.",
    )
    parser.add_argument(
        "--tail-silence-ms",
        type=int,
        default=500,
        help="Silence duration appended to the end of the merged wav file.",
    )
    args = parser.parse_args()

    subtitle_path = Path(args.subtitle)
    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    cues = parse_srt(subtitle_path)
    texts = [cue.text for cue in cues]

    library_dir = Path(args.library_dir)
    preset = load_preset(library_dir, args.preset)
    model = build_model(args.model)
    voice_clone_prompt = model.create_voice_clone_prompt(
        ref_audio=preset["reference_audio"],
        ref_text=preset["ref_text"],
    )

    language = args.language or preset["language"]
    wavs, sample_rate = model.generate_voice_clone(
        text=texts,
        language=[language] * len(texts),
        voice_clone_prompt=voice_clone_prompt,
    )

    manifest = []
    for cue, wav in zip(cues, wavs):
        output_path = output_dir / f"cue_{cue.index:03d}.wav"
        sf.write(output_path, wav, sample_rate)
        duration_ms = int(round(len(wav) * 1000 / sample_rate))
        manifest.append(
            {
                "index": cue.index,
                "start_ms": cue.start_ms,
                "end_ms": cue.end_ms,
                "text": cue.text,
                "audio_path": str(output_path),
                "generated_duration_ms": duration_ms,
            }
        )
        print(f"[cue {cue.index:03d}] Saved audio to {output_path}")

    merged_output = output_dir / "final_timeline.wav"
    merge_audio_with_subtitle_timeline(
        wavs=wavs,
        sample_rate=sample_rate,
        cues=cues,
        merged_output=merged_output,
        tail_silence_ms=args.tail_silence_ms,
    )
    print(f"Saved timeline merged audio to {merged_output}")

    manifest_path = output_dir / "manifest.json"
    manifest_path.write_text(
        json.dumps(
            {
                "preset": args.preset,
                "subtitle": str(subtitle_path),
                "language": language,
                "sample_rate": sample_rate,
                "merged_output": str(merged_output),
                "cues": manifest,
            },
            ensure_ascii=False,
            indent=2,
        ),
        encoding="utf-8",
    )
    print(f"Saved cue manifest to {manifest_path}")


if __name__ == "__main__":
    main()


    # python synthesize_from_subtitles.py --preset brand_male_01 --subtitle sample_subtitles.srt --output-dir outputs/subtitle_demo


# python examples/synthesize_from_subtitles.py --preset brand_male_01 --subtitle examples/sample_subtitles.srt --output-dir outputs/subtitle_demo