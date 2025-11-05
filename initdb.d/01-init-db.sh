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

# This is where these names are defined for use in the application.
dbuser_name=db_user
dbadmin_name=db_admin

psql -v ON_ERROR_STOP=1 \
        --username "$POSTGRES_USER" \
        --dbname "$POSTGRES_DB" \
        -v db="$POSTGRES_DB" \
        -v dbadmin_name="$dbadmin_name" \
        -v dbadmin_pass="$dbadmin_pass" \
        -v dbuser_name="$dbuser_name" \
        -v dbuser_pass="$dbuser_pass" <<-'SQL'

        -- Create dbadmin user (for migrations)
        CREATE USER :dbadmin_name WITH PASSWORD :'dbadmin_pass';

        -- Create dbuser (for application use)
        CREATE USER :dbuser_name WITH PASSWORD :'dbuser_pass';

        -- Grant connection privileges
        GRANT CONNECT ON DATABASE :db TO :dbadmin_name;
        GRANT CONNECT ON DATABASE :db TO :dbuser_name;

        -- dbadmin: Full schema management privileges
        GRANT USAGE, CREATE ON SCHEMA public TO :dbadmin_name;
        GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO :dbadmin_name;
        GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO :dbadmin_name;

        -- Allow dbadmin to manage objects created by itself
        ALTER DEFAULT PRIVILEGES FOR ROLE :dbadmin_name IN SCHEMA public
                GRANT ALL PRIVILEGES ON TABLES TO :dbadmin_name;
        ALTER DEFAULT PRIVILEGES FOR ROLE :dbadmin_name IN SCHEMA public
                GRANT ALL PRIVILEGES ON SEQUENCES TO :dbadmin_name;

        -- Allow dbadmin to grant privileges to dbuser on objects it creates
        ALTER DEFAULT PRIVILEGES FOR ROLE :dbadmin_name IN SCHEMA public
                GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO :dbuser_name;
        ALTER DEFAULT PRIVILEGES FOR ROLE :dbadmin_name IN SCHEMA public
                GRANT USAGE, SELECT ON SEQUENCES TO :dbuser_name;

        -- dbuser: Data manipulation only (no schema changes)
        GRANT USAGE ON SCHEMA public TO :dbuser_name;
        GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO :dbuser_name;
        GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO :dbuser_name;
SQL
