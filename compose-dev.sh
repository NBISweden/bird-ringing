#!/bin/sh -

if [ -f docker-compose.override.yml ]; then
        # If a docker-compose.override.yml file exists, prepend it to
        # the arguments list.
	set -- -f docker-compose.override.yml "$@"
fi

# In development, the build and runtime user:group is the same as the
# host's user:group, so that files created by the container are owned by
# the host user.

uid="$(id -u)"
gid="$(id -g)"
export BUILD_ID="${BUILD_ID:-"$uid:$gid"}"
export RUNTIME_ID="${RUNTIME_ID:-"$uid:$gid"}"

exec "$(dirname "$0")/compose-prod.sh" -f docker-compose.dev.yml "$@"
