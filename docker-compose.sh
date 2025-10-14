#!/bin/sh -

# This script acts as a wrapper for the "docker compose" command when
# working in the development environment.

exec docker compose -f docker-compose.yml -f docker-compose.dev.yml "$@"
