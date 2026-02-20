#!/bin/sh -

if [ -f docker-compose.override.yml ]; then
        # If a docker-compose.override.yml file exists, prepend it to
        # the arguments list.
	set -- -f docker-compose.override.yml "$@"
fi

# Unless already set, the build and runtime user:group IDs default to
# 6000:6000 and 6001:6001, respectively.
export BUILD_ID="${BUILD_ID:-6000:6000}"
export RUNTIME_ID="${RUNTIME_ID:-6001:6001}"

exec docker compose -f docker-compose.yml "$@"
