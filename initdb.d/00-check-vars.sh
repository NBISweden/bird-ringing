#!/bin/bash -

# This script checks that the required environment variables are set
# and non-empty.

set -u

. "$DB_ENV_FILE" || exit

for var in \
	POSTGRES_USER \
	POSTGRES_DB \
	DB_NAME \
	DB_USER_RO \
	DB_PASS_RO \
	DB_USER_RW \
	DB_PASS_RW
do
	if [ "${!var-}" = "" ]; then
		printf 'Variable "%s" must be set and non-empty.\n' "$var" >&2
		err=true
	fi
done

if "${err-false}"; then
	exit 1
fi
