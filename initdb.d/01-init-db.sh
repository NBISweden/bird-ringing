#!/bin/sh -

# This script is run by the official postgres image to initialize
# the database on first run. It creates a database user and grants
# privileges to the default database.

set -u

IFS= read -r db_pass </run/secrets/db-user-pass || exit

db_user=appuser

psql -v ON_ERROR_STOP=1 \
	--username "$POSTGRES_USER" \
	--dbname "$POSTGRES_DB" <<-SQL

	-- Roles
	CREATE USER $db_user WITH PASSWORD '$db_pass';

	-- Basic connect
	GRANT CONNECT ON DATABASE $POSTGRES_DB TO $db_user;

	-- Schema privileges
	GRANT USAGE, CREATE ON SCHEMA public TO $db_user;
	ALTER DEFAULT PRIVILEGES FOR ROLE $db_user IN SCHEMA public
		GRANT ALL PRIVILEGES ON TABLES TO $db_user;
	ALTER DEFAULT PRIVILEGES FOR ROLE $db_user IN SCHEMA public
		GRANT ALL PRIVILEGES ON SEQUENCES TO $db_user;
SQL
