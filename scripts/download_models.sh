#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
MODELS_DIR="${REPO_ROOT}/models"

MODEL_IDS=(
  "Qwen/Qwen3-TTS-Tokenizer-12Hz"
  "Qwen/Qwen3-TTS-12Hz-1.7B-CustomVoice"
  "Qwen/Qwen3-TTS-12Hz-1.7B-VoiceDesign"
  "Qwen/Qwen3-TTS-12Hz-1.7B-Base"
  "Qwen/Qwen3-TTS-12Hz-0.6B-CustomVoice"
  "Qwen/Qwen3-TTS-12Hz-0.6B-Base"
)

usage() {
  cat <<'EOF'
Usage: ./scripts/download_models.sh [modelscope|huggingface]

Arguments:
  modelscope   Install modelscope and download all models through ModelScope.
  huggingface  Install huggingface_hub CLI and download all models through Hugging Face.

If no argument is provided, modelscope is used by default.
EOF
}

download_with_modelscope() {
  python3 -m pip install -U modelscope

  for model_id in "${MODEL_IDS[@]}"; do
    local model_name
    model_name="${model_id##*/}"

    modelscope download --model "${model_id}" --local_dir "${MODELS_DIR}/${model_name}"
  done
}

download_with_huggingface() {
  python3 -m pip install -U "huggingface_hub[cli]"

  for model_id in "${MODEL_IDS[@]}"; do
    local model_name
    model_name="${model_id##*/}"

    huggingface-cli download "${model_id}" --local-dir "${MODELS_DIR}/${model_name}"
  done
}

main() {
  local source="${1:-modelscope}"

  if [[ "${source}" == "-h" || "${source}" == "--help" ]]; then
    usage
    exit 0
  fi

  mkdir -p "${MODELS_DIR}"

  case "${source}" in
    modelscope)
      download_with_modelscope
      ;;
    huggingface)
      download_with_huggingface
      ;;
    *)
      echo "Unsupported source: ${source}" >&2
      usage >&2
      exit 1
      ;;
  esac
}

main "$@"