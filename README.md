# The Bird Ringing Project

## Development and production environments

The `docker-compose.yml` file defines the production environment, while
the `docker-compose.dev.yml` contains the overrides for the development
environment.

Thus, to start the production environment, use:

``` sh
docker compose up --build
```

To start the development environment, use the convenience script
`docker-compose.sh`:

``` sh
./docker-compose.sh up --build
```

This script, `docker-compose.sh`, should be used as a wrapper for
`docker compose` commands addressing the development environment:

``` sh
./docker-compose.sh {up|down|...}
```

Regardless of the environment, once started, the website will be
available at `http://localhost:3210/`.

### Switching between development and production deployments

When switching between development and production deployments, e.g.,
when testing, it is important to bring down the currently running
environment before rebuilding and starting the other environment.

For example, to switch from a running development environment to a
production environment, use the following commands:

``` sh
./docker-compose.sh down    # Bring down the development environment
docker compose up --build   # Build and start the production environment
```

To switch from a running production environment to a development
environment, use the following commands:

``` sh
docker compose down             # Bring down the production environment
./docker-compose.sh up --build  # Build and start the development environment
```

### Differences between development and production environments

The main differences between the two environments are:

- The `frontend` directory is bind-mounted into the "frontend" service
  container in the development environment, while in the production
  environment, the source code is copied into the container at build
  time.

- The "frontend" service in the development environment runs the
  development server with hot reloading, while in the production
  environment, it runs a production web server.

  - The development server is served by `npm run dev`.
  - The production server built as an exported static site and served by
    a Caddy web server.

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
initialised when the services are started with `docker compose up`.

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
