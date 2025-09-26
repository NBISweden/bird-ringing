#!/bin/sh -

# This script will restore the database from a dump file if a file named
# "database.dump" is found in the same directory as this script.
#
# It is assumed that the application usernames have not changed since
# the dump was created.

set -u

. "$DB_ENV_FILE" || exit

db_dump_file="$(dirname "$0")/database.dump"
if [ -s "$db_dump_file" ]; then
	printf 'Restoring database from dump file: %s\n' "$db_dump_file"
	pg_restore \
		--username "$POSTGRES_USER" \
		--dbname "$DB_NAME" \
		"$db_dump_file"
fi
