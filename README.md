# The Bird Ringing Project

## Development and production environments

The `docker-compose.yml` file defines the production environment, while
the `docker-compose.dev.yml` contains the overrides for the development
environment.

Two convenience scripts are provided for starting the two different
environments: `compose-prod.sh` for the production environment and
`compose-dev.sh` for the development environment.

To start and stop the production environment, use:

``` sh
./compose-prod.sh up --build
./compose-prod.sh down
```

To start and stop the development environment, use:

``` sh
./compose-dev.sh up --build
./compose-dev.sh down
```

In general, the scripts can be used with any `docker compose` command,
for example:

``` sh
./compose-dev.sh {up|down|logs|ps|...} [options]
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
./compose-dev.sh down           # Bring down the development environment
./compose-prod.sh up --build    # Build and start the production environment
```

To switch from a running production environment to a development
environment, use the following commands:

``` sh
./compose-prod.sh down          # Bring down the production environment
./compose-dev.sh up --build     # Build and start the development environment
```

### Differences between development and production environments

The main differences between the two environments are:

- The `frontend` directory is bind-mounted into the "frontend" service
  container in the development environment, while in the production
  environment, the source code is copied into the container at build
  time.

- The `backend` directory is bind-mounted into the "backend" service
  container in the development environment, while in the production
  environment, the source code is copied into the container at build
  time.

- The "frontend" service in the development environment runs the
  development server with hot reloading, while in the production
  environment, it does nothing apart from checking to make sure the
  static site's file are present.

  - The development server is served by `npm run dev`.
  - The production server is built as an exported static site and served
    by a Caddy web server. The exported site is stored in the
    `frontend-vol` Docker volume.

## Database management

The database used by this project is a PostgreSQL database running in a
Docker container called `database`. The name of the database in the
container is `ringdb`. Apart from the database superuser, `postgres`,
there are the two application users `db_admin` (only used for applying
schema migrations) and `db_user`.

Direct access to the database can be obtained by exposing the database
port for the `database` container in the `docker-compose.yml` file and
connecting to it directly from the host, or by using the `psql` command
in the `database` container:

``` sh
./compose-prod.sh exec database psql -U db_user -d ringdb
```

### Database passwords

Passwords used for accessing the database are stored in separate files
in the `secrets` directory at the root of the project. The following
files are required and must be created before attempting to set up the
initial database.

The files should only contain the secret values themselves.

- `secrets/postgres-pass.txt` - The password for the PostgreSQL
  superuser, `postgres`. This user has full administrative access to the
  database server, and is only used for initial database setup.

- `secrets/db-admin-pass.txt` - The password for the PostgreSQL
  application admin user, `dbadmin`. This is the user that has the
  ability to apply migrations to the database. It is only used by the
  `backend-init` service when applying migrations during service
  startup.

- `secrets/db-user-pass.txt` - The password for the PostgreSQL
  application user `dbuser`. This is the user that the application
  connects to the database with.

### Database initialisation

If the `database-vol` Docker volume does not exist, the database is
initialised when the services are started with either
`./compose-prod.sh up` or `./compose-dev.sh up`.

### Database backup

A backup of the database can be created with the following command while
the `database` container is running:

``` sh
./compose-prod.sh exec database pg_dump --format=custom -U postgres ringdb >initdb.d/database.dump
```

### Restoring a database from a backup

A database dump file called `initdb.d/database.dump` will be restored
automatically when the services are started with `docker compose up` if
the `database-vol` Docker volume does not exist.

All Docker volumes associated with the project can be removed with the
following command:

``` sh
./compose-prod.sh down -v
```

Or, to only remove the database volume (assuming all services are
stopped), use:

``` sh
docker volume rm bird-ringing_database-vol
```

## Docker build setup (for developers)

### Frontend

- `node:24-alpine`
  - `base`
    - `prod-build`
    - `dev`
- `busybox:stable-musl`
  - `prod`
    - Copies static site from `prod-build` stage

### Backend

- `python:3.12-alpine`
  - `base`
    - `prod-build`
    - `dev`
- `python:3.12-alpine`
  - `prod`
    - Copies application from `prod-build` stage
