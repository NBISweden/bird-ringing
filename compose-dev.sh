#!/bin/sh -

exec "$(dirname "$0")/compose-prod.sh" \
	-f docker-compose.dev.yml \
	"$@"
