#!/bin/sh -

compose_override=`[ -f docker-compose.override.yml ] && echo "-f docker-compose.override.yml"`

exec env UID="$(id -u)" GID="$(id -g)" \
	docker compose \
		-f docker-compose.yml \
		$compose_override \
		"$@"
