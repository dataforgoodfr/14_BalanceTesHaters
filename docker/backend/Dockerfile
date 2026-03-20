FROM python:3.13-slim-trixie AS builder

RUN apt-get update && apt-get install -y --no-install-recommends \
      build-essential cmake gcc g++ && rm -rf /var/lib/apt/lists/*

COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/
ADD /backend /app
WORKDIR /app

# Build llama-cpp-python for Ivy Bridge (AVX only, NO AVX2/FMA).
# The Xeon E3-1240 V2 does not support AVX2 or FMA -- enabling them
# would cause illegal-instruction crashes at runtime.
ENV CMAKE_ARGS="-DGGML_AVX=ON -DGGML_AVX2=OFF -DGGML_FMA=OFF -DGGML_F16C=OFF"
RUN uv sync --locked

FROM python:3.13-slim-trixie
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgomp1 && rm -rf /var/lib/apt/lists/*
COPY --from=builder /app /app
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/
ADD /docker/backend/run.sh /app
WORKDIR /app

EXPOSE 8000
CMD ["/bin/bash", "run.sh"]
