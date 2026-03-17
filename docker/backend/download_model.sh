#!/bin/bash
set -euo pipefail

# Downloads a Qwen3 GGUF model from HuggingFace.
#
# Usage:
#   ./download_model.sh              # defaults to 1.7B Q4_K_M
#   ./download_model.sh 0.6B         # Qwen3-0.6B  Q4_K_M
#   ./download_model.sh 1.7B Q8_0    # Qwen3-1.7B  Q8_0

SIZE="${1:-1.7B}"
QUANT="${2:-Q4_K_M}"
QUANT_LOWER=$(echo "$QUANT" | tr '[:upper:]' '[:lower:]')

REPO="Qwen/Qwen3-${SIZE}-GGUF"
FILE="qwen3-${SIZE,,}-${QUANT_LOWER}.gguf"
DEST="$(dirname "$0")/models"

echo "Downloading ${REPO} / ${FILE} → ${DEST}/"

if ! command -v huggingface-cli &>/dev/null; then
    echo "huggingface-cli not found. Install with: pip install huggingface_hub[cli]"
    exit 1
fi

mkdir -p "$DEST"
huggingface-cli download "$REPO" "$FILE" --local-dir "$DEST"

echo "Done. Model saved to ${DEST}/${FILE}"
