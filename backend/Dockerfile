# Multi-stage Dockerfile for Django application with development and production stages.

## Base
FROM python:3.12-alpine AS base

ARG UID=1000
ARG GID=1000

ENV HOME=/app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

RUN install -d -o "$UID" -g "$GID" /app

WORKDIR /app

RUN apk update && \
    apk add --no-cache postgresql-dev gcc musl-dev

USER "$UID:$GID"

RUN --mount=type=cache,target=/app/.cache/pip \
    pip install uv

ENV PATH="/app/.local/bin:$PATH"

## Development stage
FROM base AS dev

USER root

ENV UV_PROJECT_ENVIRONMENT="/opt/app/.venv/"

RUN --mount=type=cache,uid="$UID",target=/app/.cache/uv \
    --mount=type=bind,source=uv.lock,target=uv.lock \
    --mount=type=bind,source=pyproject.toml,target=pyproject.toml \
    uv sync --locked --no-install-project --group dev

USER "$UID:$GID"

ENV PATH="/opt/app/.venv/bin:$PATH"

CMD ["./entrypoint.sh", "dev"]

## Production build stage
FROM base AS prod-build

RUN --mount=type=cache,uid="$UID",target=/app/.cache/uv \
    --mount=type=bind,source=uv.lock,target=uv.lock \
    --mount=type=bind,source=pyproject.toml,target=pyproject.toml \
    uv sync --locked --no-install-project --group prod

COPY --chown="${UID}:${GID}" . .

RUN --mount=type=cache,uid="$UID",target=/app/.cache/uv \
    uv sync --locked --group prod

## Production stage
FROM python:3.12-alpine AS prod

ARG UID=1000
ARG GID=1000

RUN apk update && apk add --no-cache postgresql-libs

USER "$UID:$GID"

COPY --from=prod-build --chown="$UID:$GID" /app /app

ENV PATH="/app/.venv/bin:$PATH"

WORKDIR /app

COPY --chmod=755 entrypoint.sh .

ENTRYPOINT ["./entrypoint.sh", "prod"]
