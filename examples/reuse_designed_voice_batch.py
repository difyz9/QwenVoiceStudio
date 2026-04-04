import argparse
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


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Reuse an existing designed voice audio as reference and batch synthesize new lines."
    )
    parser.add_argument(
        "--model",
        default="Qwen/Qwen3-TTS-12Hz-1.7B-Base",
        help="Base model id or local model directory.",
    )
    parser.add_argument("--ref-audio", required=True, help="Reference audio path, such as outputs/voice_design_basic.wav.")
    parser.add_argument("--ref-text", required=True, help="Transcript that exactly matches the reference audio.")
    parser.add_argument("--language", default="Chinese", help="Language for all target texts.")
    parser.add_argument(
        "--text",
        action="append",
        required=True,
        help="One target sentence. Repeat this argument for batch synthesis.",
    )
    parser.add_argument(
        "--output-dir",
        default="outputs/reuse_designed_voice_batch",
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
    args = parser.parse_args()

    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    model = build_model(args.model)
    voice_clone_prompt = model.create_voice_clone_prompt(
        ref_audio=args.ref_audio,
        ref_text=args.ref_text,
    )

    wavs, sample_rate = model.generate_voice_clone(
        text=args.text,
        language=[args.language] * len(args.text),
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