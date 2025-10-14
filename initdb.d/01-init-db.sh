#!/bin/sh -

# This script is run by the official postgres image to initialize
# the database on first run. It creates a database user and grants
# privileges to the default database.

set -u

# Read the first line from the file with the application user's
# password.
IFS= read -r db_pass <"$DB_USER_PASSWORD_FILE"

# Ensure the password is not empty.
test -n "$db_pass" || {
	echo 'ERROR: Application user password is empty.' >&2
	exit 1
}

db_user=appuser

psql -v ON_ERROR_STOP=1 \
	--username "$POSTGRES_USER" \
	--dbname "$POSTGRES_DB" \
	-v db="$POSTGRES_DB" \
	-v user="$db_user" \
	-v pass="$db_pass" <<-'SQL'

	-- Roles
	CREATE USER :user WITH PASSWORD :'pass';

	-- Basic connect
	GRANT CONNECT ON DATABASE :db TO :user;

	-- Schema privileges
	GRANT USAGE, CREATE ON SCHEMA public TO :user;
	ALTER DEFAULT PRIVILEGES FOR ROLE :user IN SCHEMA public
		GRANT ALL PRIVILEGES ON TABLES TO :user;
	ALTER DEFAULT PRIVILEGES FOR ROLE :user IN SCHEMA public
		GRANT ALL PRIVILEGES ON SEQUENCES TO :user;
SQL
