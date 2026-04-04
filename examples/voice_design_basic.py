import argparse
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


def main() -> None:
    parser = argparse.ArgumentParser(description="Run local Qwen3-TTS voice design inference.")
    parser.add_argument(
        "--model",
        default="Qwen/Qwen3-TTS-12Hz-1.7B-VoiceDesign",
        help="Hugging Face model id or local model directory.",
    )
    parser.add_argument("--text", required=True, help="Text to synthesize.")
    parser.add_argument("--language", default="Chinese", help="Language name, such as Chinese or English.")
    parser.add_argument("--instruct", required=True, help="Natural language description of the target voice.")
    parser.add_argument("--output", default="outputs/voice_design_basic.wav", help="Output wav path.")
    args = parser.parse_args()

    output_path = Path(args.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    model = build_model(args.model)
    wavs, sample_rate = model.generate_voice_design(
        text=args.text,
        language=args.language,
        instruct=args.instruct,
    )
    sf.write(output_path, wavs[0], sample_rate)
    print(f"Saved audio to {output_path}")


if __name__ == "__main__":
    main()