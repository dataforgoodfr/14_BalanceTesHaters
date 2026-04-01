FROM python:3.13-slim-trixie AS builder

RUN apt-get update && apt-get install -y --no-install-recommends \
      build-essential cmake gcc g++ && rm -rf /var/lib/apt/lists/*

COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/
WORKDIR /app

# 1. Copy only dependency definitions
COPY backend/pyproject.toml backend/uv.lock ./

# Build llama-cpp-python for Ivy Bridge (AVX only, NO AVX2/FMA).
# The Xeon E3-1240 V2 does not support AVX2 or FMA -- enabling them
# would cause illegal-instruction crashes at runtime.
ENV CMAKE_ARGS="-DGGML_AVX=ON -DGGML_AVX2=OFF -DGGML_FMA=OFF -DGGML_F16C=OFF"

# 2. Sync dependencies (cached unless pyproject.toml or uv.lock change)
RUN uv sync --frozen --no-install-project

# 3. Copy the rest of the source code
COPY backend/ .

# 4. Final sync to install the project itself
RUN uv sync --frozen

FROM python:3.13-slim-trixie
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgomp1 wget && rm -rf /var/lib/apt/lists/*

# Download the model to /models/Qwen3-1.7B-Q4_K_M.gguf
RUN mkdir -p /models && \
    wget -O /models/Qwen3-1.7B-Q4_K_M.gguf https://huggingface.co/unsloth/Qwen3-1.7B-GGUF/resolve/main/Qwen3-1.7B-Q4_K_M.gguf

COPY --from=builder /app /app
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/
ADD /docker/backend/run.sh /app
WORKDIR /app

EXPOSE 8000
CMD ["/bin/bash", "run.sh"]
