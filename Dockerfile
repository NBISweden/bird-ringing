ARG BUILD_ID=1000:1000
ARG RUNTIME_ID=1000:1000

#-----------------------------------------------------------------------
# BACKEND
#-----------------------------------------------------------------------

# Backend base
FROM python:3.12-alpine AS backend-base

ARG BUILD_ID
ARG RUNTIME_ID
ARG UID=${BUILD_ID%:*}
ARG GID=${BUILD_ID#*:}

RUN --mount=type=cache,id=apk-cache,target=/var/cache/apk \
    apk --cache-dir=/var/cache/apk add \
        build-base \
        ca-certificates \
        ccache \
        dumb-init \
        libpq \
        libpq-dev \
        cairo \
        fontconfig \
        font-noto \
        gettext

RUN update-ca-certificates
RUN fc-cache -f

ENV HOME=/app
ENV XDG_CACHE_HOME="$HOME/.cache"
ENV UV_CACHE_DIR="$XDG_CACHE_HOME/uv"
ENV PIP_CACHE_DIR="$XDG_CACHE_HOME/pip"
ENV CCACHE_DIR="$XDG_CACHE_HOME/ccache"
ENV CC="ccache cc" \
    CXX="ccache c++"

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    UV_LINK_MODE=copy

# /static needed by collectstatic in backend-static-build, which runs as non-root.
RUN install -d -o "$UID" -g "$GID" "$HOME" /static

USER "$BUILD_ID"
WORKDIR "$HOME"

RUN --mount=type=cache,id=pip-cache,uid="$UID",target="$PIP_CACHE_DIR" \
    pip install uv

ENV PATH="$HOME/.local/bin:$PATH"

COPY --chown="$BUILD_ID" backend/docker-entrypoint.sh ./docker-entrypoint.sh

ENTRYPOINT ["/usr/bin/dumb-init", "--"]

# Backend dependency layer
FROM backend-base AS backend-deps

RUN --mount=type=cache,id=uv-cache,uid="$UID",target="$UV_CACHE_DIR" \
    --mount=type=cache,id=cc-cache,uid="$UID",target="$CCACHE_DIR" \
    --mount=type=bind,source=backend/uv.lock,target=uv.lock,readonly \
    --mount=type=bind,source=backend/pyproject.toml,target=pyproject.toml,readonly \
    uv sync --frozen --no-install-project

# Backend app build
FROM backend-deps AS backend-app-build

COPY --chown="$BUILD_ID" backend/pyproject.toml ./
COPY --chown="$BUILD_ID" backend/uv.lock ./
COPY --chown="$BUILD_ID" backend/manage.py ./
COPY --chown="$BUILD_ID" backend/bird_ringing ./bird_ringing
COPY --chown="$BUILD_ID" backend/licensing ./licensing

RUN --mount=type=cache,id=uv-cache,uid="$UID",target="$UV_CACHE_DIR" \
    uv sync --frozen

# Backend static build
FROM backend-app-build AS backend-static-build

ENV PATH="$HOME/.venv/bin:$PATH"

RUN python manage.py collectstatic --noinput && \
    python manage.py compilemessages

# Backend production runtime
FROM python:3.12-alpine AS backend-prod

ARG BUILD_ID
ARG RUNTIME_ID
ARG UID=${BUILD_ID%:*}
ARG GID=${BUILD_ID#*:}

RUN --mount=type=cache,id=apk-cache,target=/var/cache/apk \
    apk --cache-dir=/var/cache/apk add \
        cairo \
        dumb-init \
        font-noto \
        fontconfig \
        libpq \
        gettext

ENV HOME=/app

RUN install -d -o "$UID" -g "$GID" "$HOME"
RUN fc-cache -f

USER "$BUILD_ID"
WORKDIR "$HOME"

COPY --from=backend-app-build --chown="$BUILD_ID" "$HOME" .

ENV PATH="$HOME/.venv/bin:$PATH"

USER "$RUNTIME_ID"

ENTRYPOINT ["/usr/bin/dumb-init", "--"]
CMD ["./docker-entrypoint.sh"]

# Backend development
FROM backend-base AS backend-dev

ARG RUNTIME_ID

ENV PATH="$HOME/.venv/bin:$PATH"

USER "$RUNTIME_ID"

#-----------------------------------------------------------------------
# FRONTEND
#-----------------------------------------------------------------------

# Frontend base
FROM node:24-alpine AS frontend-base

ARG BUILD_ID
ARG RUNTIME_ID
ARG UID=${BUILD_ID%:*}
ARG GID=${BUILD_ID#*:}

RUN --mount=type=cache,id=apk-cache,target=/var/cache/apk \
    apk --cache-dir=/var/cache/apk add \
        dumb-init

ENV HOME=/app
ENV XDG_CACHE_HOME="$HOME/.cache"
ENV npm_config_cache="$XDG_CACHE_HOME/npm"
ENV npm_config_loglevel=info
ENV NEXT_TELEMETRY_DISABLED=1

RUN install -d -o "$UID" -g "$GID" "$HOME"

USER "$BUILD_ID"
WORKDIR "$HOME"

ENTRYPOINT ["/usr/bin/dumb-init", "--"]

# Frontend static build
FROM frontend-base AS frontend-static-build

ENV NODE_ENV=production

RUN --mount=type=cache,id=npm-cache,uid="$UID",target="$npm_config_cache" \
    --mount=type=bind,source=frontend/package.json,target=./package.json,readonly \
    --mount=type=bind,source=frontend/package-lock.json,target=./package-lock.json,readonly \
    npm ci --omit=dev

COPY --chown="$BUILD_ID" frontend/package*.json ./
COPY --chown="$BUILD_ID" frontend/tsconfig.json ./
COPY --chown="$BUILD_ID" frontend/next*.ts ./
COPY --chown="$BUILD_ID" frontend/src ./src

ARG BUILD_GIT_COMMIT
ARG BUILD_GIT_BRANCH

ENV NEXT_PUBLIC_BUILD_GIT_COMMIT="$BUILD_GIT_COMMIT" \
    NEXT_PUBLIC_BUILD_GIT_BRANCH="$BUILD_GIT_BRANCH"

RUN mkdir -p .next

RUN --mount=type=cache,id=npm-cache,uid="$UID",target="$npm_config_cache" \
    --mount=type=cache,id=next-cache,uid="$UID",target=.next/cache \
    npm run build

# Frontend production runtime
FROM busybox:stable-musl AS frontend-prod

ARG BUILD_ID
ARG RUNTIME_ID
ARG UID=${BUILD_ID%:*}
ARG GID=${BUILD_ID#*:}

ENV HOME=/app
ENV SERVICE_MODE=production

RUN install -d -o "$UID" -g "$GID" "$HOME"

USER "$BUILD_ID"
WORKDIR "$HOME"

COPY --chown="$BUILD_ID" frontend/docker-entrypoint.sh ./docker-entrypoint.sh

USER "$RUNTIME_ID"

CMD ["./docker-entrypoint.sh"]

# Frontend development
FROM frontend-base AS frontend-dev

ARG BUILD_DATE
ARG BUILD_GIT_COMMIT
ARG BUILD_GIT_BRANCH
ARG RUNTIME_ID

ENV NEXT_PUBLIC_BUILD_DATE="$BUILD_DATE" \
    NEXT_PUBLIC_BUILD_GIT_COMMIT="$BUILD_GIT_COMMIT" \
    NEXT_PUBLIC_BUILD_GIT_BRANCH="$BUILD_GIT_BRANCH"

ENV SERVICE_MODE=development
ENV NODE_ENV=development

USER "$RUNTIME_ID"

#-----------------------------------------------------------------------
# PROXY
#-----------------------------------------------------------------------

# Proxy production image
FROM caddy:2-alpine AS proxy-prod

COPY caddy/Caddyfile /etc/caddy/Caddyfile

COPY --from=frontend-static-build /app/out /srv/frontend
COPY --from=backend-static-build /static /srv/backend
