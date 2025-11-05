#!/bin/sh -

exec env UID="$(id -u)" GID="$(id -g)" \
	docker compose \
		-f docker-compose.yml \
		"$@"
