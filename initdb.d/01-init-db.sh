#!/bin/sh -

# This script is run by the official postgres image to initialize the
# database on first run. It creates our two database users and grants
# privileges to the default database.

set -u

# Read the first line from the files with the application users'
# password.
IFS= read -r dbuser_pass <"$DB_USER_PASSWORD_FILE"
IFS= read -r dbadmin_pass <"$DB_ADMIN_PASSWORD_FILE"

# Ensure the passwords are not empty.
test -n "$dbadmin_pass" || {
	echo 'ERROR: Application user password is empty.' >&2
	err=true
}
test -n "$dbuser_pass" || {
	echo 'ERROR: Admin user password is empty.' >&2
	err=true
}

if "${err:-false}"; then
	exit 1
fi

dbuser=dbuser
dbadmin=dbadmin

psql -v ON_ERROR_STOP=1 \
        --username "$POSTGRES_USER" \
        --dbname "$POSTGRES_DB" \
        -v db="$POSTGRES_DB" \
        -v dbadmin="$dbadmin" \
        -v dbadmin_pass="$dbadmin_pass" \
        -v dbuser="$dbuser" \
        -v dbuser_pass="$dbuser_pass" <<-'SQL'

        -- Create dbadmin user (for migrations)
        CREATE USER :dbadmin WITH PASSWORD :'dbadmin_pass';

        -- Create dbuser (for application use)
        CREATE USER :dbuser WITH PASSWORD :'dbuser_pass';

        -- Grant connection privileges
        GRANT CONNECT ON DATABASE :db TO :dbadmin;
        GRANT CONNECT ON DATABASE :db TO :dbuser;

        -- dbadmin: Full schema management privileges
        GRANT USAGE, CREATE ON SCHEMA public TO :dbadmin;
        GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO :dbadmin;
        GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO :dbadmin;

        -- Allow dbadmin to manage objects created by itself
        ALTER DEFAULT PRIVILEGES FOR ROLE :dbadmin IN SCHEMA public
                GRANT ALL PRIVILEGES ON TABLES TO :dbadmin;
        ALTER DEFAULT PRIVILEGES FOR ROLE :dbadmin IN SCHEMA public
                GRANT ALL PRIVILEGES ON SEQUENCES TO :dbadmin;

        -- Allow dbadmin to grant privileges to dbuser on objects it creates
        ALTER DEFAULT PRIVILEGES FOR ROLE :dbadmin IN SCHEMA public
                GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO :dbuser;
        ALTER DEFAULT PRIVILEGES FOR ROLE :dbadmin IN SCHEMA public
                GRANT USAGE, SELECT ON SEQUENCES TO :dbuser;

        -- dbuser: Data manipulation only (no schema changes)
        GRANT USAGE ON SCHEMA public TO :dbuser;
        GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO :dbuser;
        GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO :dbuser;
SQL
