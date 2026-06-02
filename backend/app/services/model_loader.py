from pathlib import Path
from typing import Any


def resolve_device_kwargs() -> dict[str, Any]:
    """Select the best available compute device for model inference.

    Priority: CUDA > MPS (Apple Silicon) > CPU.
    Returns a kwargs dict suitable for Qwen3TTSModel.from_pretrained().
    """
    import torch

    if torch.cuda.is_available():
        return {
            "device_map": "cuda:0",
            "dtype": torch.bfloat16,
            "low_cpu_mem_usage": False,
            "attn_implementation": "flash_attention_2",
        }

    if torch.backends.mps.is_available():
        return {
            "device_map": "mps",
            "dtype": torch.float16,
            "low_cpu_mem_usage": False,
        }

    return {
        "device_map": "cpu",
        "dtype": torch.float16,
        "low_cpu_mem_usage": True,
    }


def resolve_model_source(model_ref: str, *, config_env_name: str) -> str:
    candidate = Path(model_ref).expanduser()
    looks_like_local_path = candidate.is_absolute() or model_ref.startswith("./") or model_ref.startswith("../")

    if looks_like_local_path:
        resolved = candidate.resolve()
        if not resolved.exists():
            raise RuntimeError(
                f"Configured model path does not exist: {resolved}. "
                f"Set {config_env_name} to a valid local model directory, or use a remote model id such as 'Qwen/Qwen3-TTS-12Hz-1.7B-VoiceDesign'."
            )
        if not resolved.is_dir():
            raise RuntimeError(f"Configured model path is not a directory: {resolved}")
        if not (resolved / "config.json").is_file():
            raise RuntimeError(
                f"Configured model directory is missing config.json: {resolved}. "
                "Check whether the model was downloaded into an extra nested subdirectory."
            )
        return str(resolved)

    return model_ref