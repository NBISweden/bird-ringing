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

# Drop the named volumes backend-vol and frontend-vol.
# These will be reinitialised with the data in the built images.
project_name=$(sed -e '/^name: */!d' -e 's///' docker-compose.yml)
docker volume rm \
	"${project_name}_backend-vol" \
	"${project_name}_frontend-vol" 2>/dev/null || true

exec docker compose -f docker-compose.yml "$@"
