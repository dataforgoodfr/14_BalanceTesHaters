FROM python:3.13-slim-trixie AS builder

RUN apt-get update && apt-get install -y --no-install-recommends \
      build-essential cmake gcc g++ && rm -rf /var/lib/apt/lists/*

COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/
WORKDIR /app

# 1. Copy only dependency definitions
COPY backend/pyproject.toml backend/uv.lock ./

# 2. Sync dependencies (cached unless pyproject.toml or uv.lock change)
RUN uv sync --frozen --no-install-project

# 3. Copy the rest of the source code
COPY backend/ .

# 4. Final sync to install the project itself
RUN uv sync --frozen

# 5. Pre-download models into the image so cold-start has no network dependency.
#    HF_HOME controls where sentence-transformers and huggingface_hub cache files.
ENV HF_HOME=/app/hf_cache
RUN .venv/bin/python - <<'EOF'
from huggingface_hub import hf_hub_download, snapshot_download
from sentence_transformers import SentenceTransformer

# Pull the sklearn MLP classifier artifact
hf_hub_download(repo_id="gregco/balance-tes-haters-classifier", filename="harassment_arctic_mlp.joblib")

# Pull and cache the Snowflake encoder weights
SentenceTransformer("Snowflake/snowflake-arctic-embed-l-v2.0")
EOF

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
