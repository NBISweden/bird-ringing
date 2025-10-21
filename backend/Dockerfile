# Multi-stage Dockerfile for Django application with development and
# production stages.

## Base
FROM python:3.12-alpine AS base

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

# Install system dependencies
RUN apk update && \
    apk add --no-cache postgresql-dev gcc musl-dev

# Install uv via pip
RUN pip install --no-cache-dir uv

## Development stage
FROM base AS dev

ARG UID=1000
ARG GID=1000

WORKDIR /app

RUN --mount=type=cache,target=/root/.cache/uv \
    --mount=type=bind,source=uv.lock,target=uv.lock \
    --mount=type=bind,source=pyproject.toml,target=pyproject.toml \
    uv sync --locked --no-install-project --group dev

COPY . /app

# Set directory ownership so that migrations can run
RUN chown -R "${UID}:${GID}" /app

RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --locked --group dev

# Place executables in the environment at the front of the path
ENV PATH="/app/.venv/bin:$PATH"

USER "$UID:$GID"

EXPOSE 8000

COPY --chmod=755 entrypoint.sh .

ENTRYPOINT ["./entrypoint.sh", "dev"]

## Production build stage
FROM base AS prod-build

WORKDIR /app
RUN --mount=type=cache,target=/root/.cache/uv \
    --mount=type=bind,source=uv.lock,target=uv.lock \
    --mount=type=bind,source=pyproject.toml,target=pyproject.toml \
    uv sync --locked --no-install-project --group prod

COPY . /app

RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --locked --group prod

## Production stage
FROM python:3.12-alpine AS prod

RUN apk update && apk add --no-cache postgresql-libs

ARG UID=1000
ARG GID=1000

# Copy the application from the builder
COPY --from=prod-build --chown="$UID:$GID" /app /app

# Place executables in the environment at the front of the path
ENV PATH="/app/.venv/bin:$PATH"

USER "$UID:$GID"

EXPOSE 8000

WORKDIR /app

COPY --chmod=755 entrypoint.sh .

ENTRYPOINT ["./entrypoint.sh", "prod"]
