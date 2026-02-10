#!/bin/sh -

if [ -f docker-compose.override.yml ]; then
    set -- -f docker-compose.override.yml "$@"
fi

exec env UID="$(id -u)" GID="$(id -g)" \
	docker compose \
		-f docker-compose.yml \
		"$@"
