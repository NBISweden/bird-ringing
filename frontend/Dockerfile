# Multi-stage Dockerfile for Node.js application with development and
# production stages.

## Base stage
FROM node:24-alpine AS base

### Only used for picking the base Docker image to build from.

## Development stage
FROM base AS dev

ARG UID=1000
ARG GID=1000

USER "$UID:$GID"

ENV NODE_ENV=development \
    NEXT_TELEMETRY_DISABLED=1 \
    HOME=/app

WORKDIR /app

CMD ["sh", "-x", "-c", "npm ci --loglevel=info && npm run dev"]

## Production build stage
FROM base AS prod-build

ARG UID=1000
ARG GID=1000

USER "$UID:$GID"

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    NEXT_CACHE=/var/cache/next

WORKDIR /app

### Copy only what's needed for "npm ci".
COPY --chown="$UID" package*.json ./
RUN --mount=type=cache,id=npm-cache,uid="$UID",target=/var/cache/npm \
	npm --cache=/var/cache/npm ci

### We don't do "COPY ./ ./" because that would also pull in
### "node_modules" and potentially a lot of other files and directories
### that we don't need.  Instead, we pick the things that are actually
### needed.
COPY --chown="$UID" ./tsconfig.json next*.ts ./
COPY --chown="$UID" ./src ./src

### Export static site into /app/out
RUN --mount=type=cache,id=npm-cache,uid="$UID",target=/var/cache/npm \
    --mount=type=cache,id=next-cache,uid="$UID",target=/var/cache/next \
	npm --cache=/var/cache/npm run build

## Production stage
FROM busybox:stable-musl AS prod

COPY --from=prod-build /app/out /vol

CMD ["test", "-d", "/vol/_next"]
