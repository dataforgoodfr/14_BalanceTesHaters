FROM python:3.13-slim-trixie
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/
ADD /backend /app
ADD /docker/backend/run.sh /app
WORKDIR /app
RUN uv sync --locked
EXPOSE 8000
CMD ["/bin/bash", "run.sh"]
