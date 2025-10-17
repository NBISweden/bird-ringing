#!/bin/sh -

# This script acts as a wrapper for the "docker compose" command when
# working in the development environment.  It also passes the UID and
# GID of the current user into the environment.

exec env UID="$(id -u)" GID="$(id -g)" \
	docker compose \
		-f docker-compose.yml \
		-f docker-compose.dev.yml \
		"$@"
