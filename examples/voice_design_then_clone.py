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
    parser = argparse.ArgumentParser(description="Design a voice once, then reuse it for multiple lines.")
    parser.add_argument(
        "--design-model",
        default="Qwen/Qwen3-TTS-12Hz-1.7B-VoiceDesign",
        help="VoiceDesign model id or local directory.",
    )
    parser.add_argument(
        "--clone-model",
        default="Qwen/Qwen3-TTS-12Hz-1.7B-Base",
        help="Base model id or local directory.",
    )
    parser.add_argument("--ref-text", required=True, help="Reference sentence used to design the voice.")
    parser.add_argument("--ref-language", default="Chinese", help="Language of the reference sentence.")
    parser.add_argument("--ref-instruct", required=True, help="Description of the target voice persona.")
    parser.add_argument(
        "--text",
        action="append",
        required=True,
        help="A sentence to synthesize with the designed voice. Repeat this argument for multiple lines.",
    )
    parser.add_argument(
        "--output-dir",
        default="outputs/voice_design_then_clone",
        help="Directory for generated wav files.",
    )
    args = parser.parse_args()

    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    design_model = build_model(args.design_model)
    ref_wavs, sample_rate = design_model.generate_voice_design(
        text=args.ref_text,
        language=args.ref_language,
        instruct=args.ref_instruct,
    )
    ref_path = output_dir / "reference_voice.wav"
    sf.write(ref_path, ref_wavs[0], sample_rate)

    clone_model = build_model(args.clone_model)
    voice_clone_prompt = clone_model.create_voice_clone_prompt(
        ref_audio=(ref_wavs[0], sample_rate),
        ref_text=args.ref_text,
    )

    wavs, sample_rate = clone_model.generate_voice_clone(
        text=args.text,
        language=[args.ref_language] * len(args.text),
        voice_clone_prompt=voice_clone_prompt,
    )

    for index, wav in enumerate(wavs, start=1):
        output_path = output_dir / f"line_{index:02d}.wav"
        sf.write(output_path, wav, sample_rate)
        print(f"Saved audio to {output_path}")


if __name__ == "__main__":
    main()