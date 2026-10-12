# syntax=docker/dockerfile:1
FROM python:3.13-slim-trixie AS builder

RUN apt-get update && apt-get install -y --no-install-recommends \
      build-essential cmake gcc g++ && rm -rf /var/lib/apt/lists/*

COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/
WORKDIR /app

# 1. Copy only dependency definitions
COPY backend/pyproject.toml backend/uv.lock ./

# 2. Sync dependencies (cached unless pyproject.toml or uv.lock change)
RUN uv sync --frozen --no-install-project

# 3. Pre-download models into the image so cold-start has no network dependency.
#    This is done before source code layer to minimize the invalidation
#    Download targets a `bth-model-cache` BuildKit cache that survives even if Docker layer is rebuilt.
#    The model is then copied to its final location for app to consume.
RUN --mount=type=cache,id=bth-model-cache,target=/model-cache,sharing=locked \
    HF_HOME=/model-cache .venv/bin/python - <<'EOF'
import shutil

from huggingface_hub import hf_hub_download
from sentence_transformers import SentenceTransformer

# Pull the sklearn MLP classifier artifact
hf_hub_download(repo_id="gregco/balance-tes-haters-classifier", filename="harassment_arctic_mlp.joblib")

# Pull and cache the Snowflake encoder weights to the BuildKit cache
SentenceTransformer("Snowflake/snowflake-arctic-embed-l-v2.0")

# Copy model from cache to final location
shutil.copytree("/model-cache/hub", "/app/hf_cache/hub", symlinks=True, dirs_exist_ok=True)
EOF

#  HF_HOME controls env controls final model location used by app
ENV HF_HOME=/app/hf_cache

# 3. Copy the rest of the source code
COPY backend/ .

# 4. Final sync to install the project itself
RUN uv sync --frozen


FROM python:3.13-slim-trixie
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgomp1 && rm -rf /var/lib/apt/lists/*

COPY --from=builder /app /app
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/
ADD /docker/backend/run.sh /app
WORKDIR /app

ENV HF_HOME=/app/hf_cache

EXPOSE 8000
CMD ["/bin/bash", "run.sh"]
