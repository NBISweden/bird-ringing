#!/bin/sh -

# This script will restore the database from a dump file if a file named
# "database.dump" is found in the same directory as this script.
#
# It is assumed that the application username have not changed since
# the dump was created.

set -u

db_dump_file="$(dirname "$0")/database.dump"

if [ -s "$db_dump_file" ]; then
	printf 'Restoring database from dump file: %s\n' "$db_dump_file"
	pg_restore \
		--username "$POSTGRES_USER" \
		--dbname "$POSTGRES_DB" \
		"$db_dump_file"
fi
