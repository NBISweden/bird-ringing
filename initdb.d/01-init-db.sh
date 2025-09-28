#!/bin/sh -

# This script creates two database users with different privileges:
# - A read-only user ("user_ro") that can only perform SELECT queries.
# - A read-write user ("user_rw") that can perform all operations including
#   SELECT, INSERT, UPDATE, DELETE, and schema modifications.

set -u

IFS= read -r db_pass_ro </run/secrets/db-pass-ro || exit
IFS= read -r db_pass_rw </run/secrets/db-pass-rw || exit

user_ro="user_ro"
user_rw="user_rw"

psql -v ON_ERROR_STOP=1 \
	--username "$POSTGRES_USER" \
	--dbname "$POSTGRES_DB" <<-SQL

	-- Roles
	CREATE USER $user_ro WITH PASSWORD '$db_pass_ro';
	CREATE USER $user_rw WITH PASSWORD '$db_pass_rw';

	-- Basic connect
	GRANT CONNECT ON DATABASE $POSTGRES_DB TO $user_ro, $user_rw;

	-- RW: full control over public schema
	GRANT USAGE, CREATE ON SCHEMA public TO $user_rw;
	ALTER DEFAULT PRIVILEGES FOR ROLE $user_rw IN SCHEMA public
		GRANT ALL PRIVILEGES ON TABLES TO $user_rw;
	ALTER DEFAULT PRIVILEGES FOR ROLE $user_rw IN SCHEMA public
		GRANT ALL PRIVILEGES ON SEQUENCES TO $user_rw;

	-- RO: strictly SELECT
	GRANT USAGE ON SCHEMA public TO $user_ro;
	GRANT SELECT ON ALL TABLES IN SCHEMA public TO $user_ro;
	ALTER DEFAULT PRIVILEGES FOR ROLE $user_ro IN SCHEMA public
		GRANT SELECT ON TABLES TO $user_ro;
SQL
