# The Bird Ringing Project

## Initial database setup

### Secrets

Secrets are stored in the `secrets` directory at the root of the
project. The following files are required and must be created before
attempting to set up the database.

Text files that contain only the secret value:

- `secrets/db-root-pass.txt` - The password for the PostgreSQL superuser
  `postgres`.

The superuser password is only ever used during the initial database
setup, and when performing manual maintenance on the database server.

Text files that contain environment variable-like assignments:

- `secrets/database.env` - The environment variables for the application
  database connection. It should contain assignments for the following
  variables:

  - `DB_NAME` - The name of the database.
  - `DB_USER_RO` - The username for the database's read-only user.
  - `DB_PASS_RO` - The password for the database's read-only user.
  - `DB_USER_RW` - The username for the database's read-write user.
  - `DB_PASS_RW` - The password for the database's read-write user.

There is a template for the `database.env` file at
`secrets/database.env.dist`, while the `db-root-pass.txt` file must be
created from scratch.

### Database initialisation

The database is initialised if the `database` service is started and the
database does not already exist. The database does not exist if the
Docker volume `database-vol` was removed with, e.g.,
`docker compose down -v`.

If a file called `initdb.d/database.dump` exists, it is restored into
the new database. Otherwise, an empty database is created.

A database dump can be created from a running database container with:

``` sh
docker compose exec database pg_dump --format=custom -U postgres {DB_NAME} > initdb.d/database.dump
```

... where `{DB_NAME}` is replaced with the name of the database as
defined in `secrets/database.env`.
