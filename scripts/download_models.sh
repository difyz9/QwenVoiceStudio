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
Usage: ./scripts/download_models.sh [modelscope|huggingface] [all|MODEL_NAME|MODEL_ID]

Arguments:
  modelscope   Install modelscope and download models through ModelScope.
  huggingface  Install huggingface_hub CLI and download models through Hugging Face.
  all          Download all supported models. This is the default target.
  MODEL_NAME   Download a single model by short name, for example:
               Qwen3-TTS-12Hz-1.7B-VoiceDesign
  MODEL_ID     Download a single model by full id, for example:
               Qwen/Qwen3-TTS-12Hz-1.7B-VoiceDesign

If no argument is provided, modelscope and all are used by default.
EOF
}

print_supported_models() {
  local model_id

  echo "Supported models:" >&2
  for model_id in "${MODEL_IDS[@]}"; do
    echo "  - ${model_id##*/}" >&2
  done
}

resolve_model_ids() {
  local target="$1"
  local model_id
  local resolved=()

  if [[ "${target}" == "all" ]]; then
    printf '%s\n' "${MODEL_IDS[@]}"
    return 0
  fi

  for model_id in "${MODEL_IDS[@]}"; do
    if [[ "${target}" == "${model_id}" || "${target}" == "${model_id##*/}" ]]; then
      resolved+=("${model_id}")
    fi
  done

  if [[ ${#resolved[@]} -eq 0 ]]; then
    echo "Unsupported model target: ${target}" >&2
    print_supported_models
    return 1
  fi

  printf '%s\n' "${resolved[@]}"
}

download_with_modelscope() {
  local target="$1"
  local model_id
  local model_name

  python3 -m pip install -U modelscope

  while IFS= read -r model_id; do
    model_name="${model_id##*/}"

    modelscope download --model "${model_id}" --local_dir "${MODELS_DIR}/${model_name}"
  done < <(resolve_model_ids "${target}")
}

download_with_huggingface() {
  local target="$1"
  local model_id
  local model_name

  python3 -m pip install -U "huggingface_hub[cli]"

  while IFS= read -r model_id; do
    model_name="${model_id##*/}"

    huggingface-cli download "${model_id}" --local-dir "${MODELS_DIR}/${model_name}"
  done < <(resolve_model_ids "${target}")
}

main() {
  local source="${1:-modelscope}"
  local target="${2:-all}"

  if [[ "${source}" == "-h" || "${source}" == "--help" ]]; then
    usage
    exit 0
  fi

  mkdir -p "${MODELS_DIR}"

  case "${source}" in
    modelscope)
      download_with_modelscope "${target}"
      ;;
    huggingface)
      download_with_huggingface "${target}"
      ;;
    *)
      echo "Unsupported source: ${source}" >&2
      usage >&2
      exit 1
      ;;
  esac
}

main "$@"