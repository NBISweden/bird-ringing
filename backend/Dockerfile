# Multi-stage Dockerfile for Django application with development and
# production stages.

## Base
FROM python:3.12-alpine AS base

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

# Install system dependencies
RUN apk update && \
    apk add --no-cache build-base

# Install uv via pip
RUN pip install --no-cache-dir uv

## Development stage
FROM base AS dev

WORKDIR /app

RUN --mount=type=cache,target=/root/.cache/uv \
    --mount=type=bind,source=uv.lock,target=uv.lock \
    --mount=type=bind,source=pyproject.toml,target=pyproject.toml \
    uv sync --locked --no-install-project

COPY . /app

RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --locked

RUN uv run python manage.py migrate

# Place executables in the environment at the front of the path
ENV PATH="/app/.venv/bin:$PATH"

ARG UID=1000
ARG GID=1000

USER "$UID:$GID"

# Expose Django runserver port
EXPOSE 8000

# Start Django app
CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]

## Production build stage
FROM base AS prod-build

WORKDIR /app
RUN --mount=type=cache,target=/root/.cache/uv \
    --mount=type=bind,source=uv.lock,target=uv.lock \
    --mount=type=bind,source=pyproject.toml,target=pyproject.toml \
    uv sync --locked --no-install-project --no-dev

COPY . /app

RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --locked --no-dev

RUN uv run python manage.py migrate

## Production stage
FROM python:3.12-alpine AS prod

ARG UID=1000
ARG GID=1000

# Copy the application from the builder
COPY --from=prod-build --chown="$UID:$GID" /app /app

# Place executables in the environment at the front of the path
ENV PATH="/app/.venv/bin:$PATH"

USER "$UID:$GID"

WORKDIR /app

EXPOSE 8000

# Start Django app with WSGI layer
CMD ["gunicorn", "bird_ringing.wsgi", "--bind", "0.0.0.0:8000"]