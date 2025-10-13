# The Bird Ringing Project

## Development and production environments

The `docker-compose.yml` file defines the production environment, while
the `docker-compose.dev.yml` contains the overrides for the development
environment.

Thus, to start the production environment, use:

``` sh
docker compose up
```

To start the development environment, use:

``` sh
docker compose -f docker-compose.yml -f docker-compose.dev.yml up
```

There is also a convenience script, `docker-compose.sh`, that can be
used as a wrapper for `docker compose` commands addressing the
development environment:

``` sh
./docker-compose.sh {up|down|...}
```

### Differences between development and production environments

The main differences between the two environments are:

- The database is exposed to the host on port 5432 in the development
  environment for easier access, while it is not exposed in the
  production environment.

That is the only difference at the moment. In the future, there may be
other differences, such as mounting source code into the application
container in the development environment.

## Database management

The database used by this project is a PostgreSQL database running in a
Docker container called `database`. The name of the database in the
container is `ringdb`. Apart from the database superuser, `postgres`,
there is the application user, `appuser`.

### Database passwords

Passwords used for accessing the database are stored in separate files
in the `secrets` directory at the root of the project. The following
files are required and must be created before attempting to set up the
initial database.

The files should only contain the secret values themselves.

- `secrets/db-admin-pass.txt` - The password for the PostgreSQL
  superuser `postgres`.

- `secrets/db-user-pass.txt` - The password for the PostgreSQL
  application user `appuser`.

### Database initialisation

If the `database-vol` Docker volume does not exist, the database is
initialised when the servics are started with `docker compose up`.

### Database backup

A backup of the database can be created with the following command while
the `database` container is running:

``` sh
docker compose exec database pg_dump --format=custom -U postgres ringdb >initdb.d/database.dump
```

### Restoring a database from a backup

A database dump file called `initdb.d/database.dump` will be restored
automatically when the services are started with `docker compose up` if
the `database-vol` Docker volume does not exist.

The Docker volume can be removed with the following command:

``` sh
docker compose down -v
```
