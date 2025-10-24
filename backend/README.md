# The Bird Ringing Project backend

The backend is written in Python 3.12 and is built with the [Django](https://www.djangoproject.com/) framework. It interfaces to an external Postgres database via the [psychopg](https://www.psycopg.org/) driver. Dependencies are managed by the [uv](https://docs.astral.sh/uv/) package manager, packaging is done with Docker and deployments with Docker compose.

The current directory is setup so that it serves as both the parent directory for the Django and the `uv` `bird_ringing` project.

## Getting started for development

### Quickstart

The following instructions are tested on linux but should work for mac as well. Install `uv`:

```sh
curl -LsSf https://astral.sh/uv/install.sh | sh
```

Sync project dependencies:

```sh
uv sync --locked --group dev
```

The above will also create the environment folder `.venv` when run for the first time.

To deploy a minimal development stack for backend only, from the repository root folder run:

```sh
./docker-compose.sh up backend
```

The Django development server should be now accessible at [http://localhost:8080](http://localhost:8080) and any Python code changes made to the local Django project should be hot re-loaded on the running server.

To bring down the containers after work is finished:

```sh
./docker-compose.sh down --remove-orphans
```

Add `-v` in the above to clean up any created docker volume as well.

### More on running local development stacks

The Python environment can be activated/deactivated as usual with:

```sh
source .venv/bin/activate

deactivate
```

 Alternatively, wrap any python commands with `uv run` to implicitely use the environment. For example, to create a new Django application:

 ```sh
uv run python manage.py startapp <app_name>
```

**Note**: Remember to bind-mount as a volume of the `backend` service by updating the `../docker-compose.dev.yml` file.

## Tests

Django has its own unittest ecosystem. Any file that is placed under the project folder (here `backend`) with a name starting with `test` will be picked up by and executed. For example:

```sh
uv run python manage.py test bird_ringing
```

will run any test files within the `bird_ringing` folder.

## Note on dependency management

Dependencies for the project consist of a main block for the `bird_ringing` project and two groups: `dev` and `prod` (a choice between the two must be made when setting up the working environment). The structure can be inspected by peeking into the `pyproject.toml` file or running the following command:

```sh
uv tree
```

This structure allows for branching out `development` and `production` environments so that for example:

- Possible testing packages are not pulled in when building the production Docker image.
- The production Docker image runs the `psychopg` driver as a binary that is compiled from C source code during the image build stage which allows for better performance when interacting with the database.


Uv will pick up main block dependencies by default whereas to load group dependencies one needs to specify the group name, for example `--group dev`.

Modifying dependencies follows a similar syntax. For example, to add a package dependency that is common for both dev and prod environments:

```sh
uv add <package_name>
```

whereas the general form of the command for adding a dependency is:

```sh
uv add [--group dev|prod] <package_name>
```
