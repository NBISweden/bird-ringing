# Deployment of Bird Ringing

This guide describes how to successfully deploy the Bird Ringing service. It assumes that you have a working installation of `Docker` and `Docker Compose` to simplify the instructions. If you need help installing Docker, please refer to their installation instructions [here](https://docs.docker.com/engine/install/).

In order to get the service up and running you will need to go through the following steps:

1. [Create docker-compose.override.yml](#configuring-the-service)
2. [Create secrets](#docker-secrets)
3. [Configure environment variables](#docker-environment-variables)
4. [Validate the configuration](#validating-the-configuration)
5. [Start the service](#starting-the-service)
6. [Create super user and groups](#enable-service-admin)
7. [Load data](#load-data)

## Prerequisites

The current recommended setup of the service only requires Docker and Docker Compose as dependencies. The setup includes a backend container running `Django`, a `PostgreSQL` database, and a proxy serving static content and reverse-proxying the `Django` backend. Optionally, the service can be configured to use an externally hosted PostgreSQL database.

- Docker + Docker Compose (>=29.2.1)
- (Optional) PostgreSQL (>=18)

## Configuring the Service

Configuration of the service is expected to be provided in a Docker Compose file called `docker-compose.override.yml` along with a number of secrets, resource files, and environment variables documented in the following sections. A complete example of a configuration file is provided in the section [A complete example config](#a-complete-example-config).

### Docker Secrets

Some configuration options of the service use Docker secrets to add an extra layer of security (more details about Docker secrets can be found [here](https://docs.docker.com/compose/how-tos/use-secrets/). These options are primarily passwords and other values that are important to protect. The current secrets are presented in the following table. The `Secret ID` refers to the ID used in the Docker Compose file, the `Source Path` refers to a path relative to the `docker-compose.yml` file, and `Expected Content` describes the expected content of the secret file.

> **Note:** All of the following files needs to be created and populated in order to have a complete configuration.

| Secret ID             | Source Path                         | Expected Content                                                                                                                                                                                                                                                               |
| :-------------------- | :---------------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| postgres-pass         | `secrets/postgres-pass.txt`         | A file containing the root password for the targeted PostgreSQL instance.                                                                                                                                                                                                      |
| db-admin-pass         | `secrets/db-admin-pass.txt`         | A file containing the PostgreSQL admin password.                                                                                                                                                                                                                               |
| db-user-pass          | `secrets/db-user-pass.txt`          | A file containing the PostgreSQL user password.                                                                                                                                                                                                                                |
| django-secret-key     | `secrets/django-secret-key.txt`     | A file containing the Django secret key. It can be generated using the following command: `./compose-prod.sh run --rm backend-init python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())" > secrets/django-secret-key.txt` |
| django-email-password | `secrets/django-email-password.txt` | A file containing the password for the email account used to send emails. |

### Docker Environment Variables

Some configuration options are supplied as environment variables using Docker Compose. These options should be included in the `docker-compose.override.yml`, they are less sensitive and describe properties related to the deployed instance and its host.

| Relevant Container | Variable Name                         | Expected Value                                                                                                                                                                                                                                                               |
| :----------------- | :------------------------------------ | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| backend            | DJANGO_ALLOWED_HOSTS                  | A CSV string that includes `backend` and any aliases from which the site should be accessible (`backend` must be included since it is used for internal routing within the Docker Compose container setup).                                                                  |
| backend            | DJANGO_CSRF_TRUSTED_ORIGINS           | A CSV string that includes all origins from which the Django admin should be accessible.                                                                                                                                                                                     |
| backend            | LICENSE_CARD_FILE                     | The path (within the container) to the license card template  file.                                                                                                                                                                                                          |
| backend            | PERMIT_TEMPLATE_FILE                  | A path (within the container) to the permit document template file-                                                                                                                                                                                                          |
| backend            | DJANGO_TEMPLATES_DIR                  | A path (within the container) to the directory holding email templates. (By default it is `/resources/templates`)                                                                                                                                                            |
| backend            | LICENSING_EMAIL_TEMPLATE              | A path relative to the `DJANGO_TEMPLATES_DIR` from which to load the email template. (An example template file can be found [here](./examples/example_email.txt).)                                                                                                           |
| backend            | LICENSING_EMAIL_FROM_ADDR             | An email address from which the licensing emails should be sent.                                                                                                                                                                                                             |
| backend            | LICENSING_EMAIL_SUBJECT               | A template string using the [django template language](https://docs.djangoproject.com/en/5.2/ref/templates/language/) where the variables `mnr` and `name` are available. The variable `name` contains the name of the receiving actor.                                      |
| backend            | LICENSING_EMAIL_HTML_TEMPLATE         | (Optional) A path relative to the `DJANGO_TEMPLATES_DIR` from which to load the html email template. (An example template file can be found [here](./examples/example_email.html).)                                                                                          |
| backend            | LICENSING_COMMUNICATION_LANGUAGE_CODE | (Optional) Specify the language used when sending emails. Currently allowed values are `en` and `sv`. The default is `en`. (`Note:` This only affects system values. Most of the message content is still dictated by templates and template strings).                               |
| backend            | DJANGO_EMAIL_BACKEND                  | For production instances, use `django.core.mail.backends.smtp.EmailBackend` and for test instances you may use `django.core.mail.backends.console.EmailBackend`. See [django documentation](https://docs.djangoproject.com/en/6.0/topics/email/#email-backends) for details. |
| backend            | DJANGO_EMAIL_HOST                     | The SMTP host.                                                                                                                                                                                                                                                               |
| backend            | DJANGO_EMAIL_PORT                     | The SMTP port.                                                                                                                                                                                                                                                               |
| backend            | DJANGO_EMAIL_HOST_USER                | The SMTP user.                                                                                                                                                                                                                                                               |
| backend            | DJANGO_EMAIL_TIMEOUT                  | An email timeout specified in seconds. |
| backend            | DJANGO_EMAIL_USE_TLS                  | Specify if the server uses TLS or not. Default is `false`. |
| backend            | DJANGO_EMAIL_USE_SSL                  | Specify if the server uses SSL or not. Default is `false`. |
| backend            | DJANGO_EMAIL_SSL_KEYFILE              | (When `DJANGO_EMAIL_USE_SSL="true"`) A SSL key file. Preferrably using [docker secrets](https://docs.docker.com/compose/how-tos/use-secrets/). |
| backend            | DJANGO_EMAIL_SSL_CERTFILE             | (When `DJANGO_EMAIL_USE_SSL="true"`) A SSL a certificate file. Preferrably using [docker secrets](https://docs.docker.com/compose/how-tos/use-secrets/). |
| backend            | GUNICORN_WORKERS                      | (Optional, when in a singleton deployment) Specify the number of workers to use for the production gunicorn instance. See [gunicorns documentation](https://gunicorn.org/reference/settings/#workers) for details |
| backend            | GUNICORN_TIMEOUT                      | (Optional, when batch actions take a long time) Specify the worker timeout in seconds for the production gunicorn instance. See [gunicorns documentation](https://gunicorn.org/reference/settings/#timeout) for details |
| backend            | SSL_CERT_FILE                         | (Optional, when using self signed certificate for email) If you are using a self signed certificate you may need to mount the certificate file and set the path in this variable. |

### Docker Options

To completely configure the service for your host, it is important to decide which port and restart policy to use. The port is configured on the `proxy` container, and HTTPS is expected to be provided by an external reverse proxy not configured here. The restart policy can be chosen as `always` if the intent is for the service to survive a host restart. The restart policy needs to be set on the `proxy`, `backend`, and `database` containers.

### A Complete Example Config

A complete example configuration requires a `docker-compose.override.yml` file and a set of files following a structure described in this section.

```yml
services:
  proxy:
    restart: always
    ports: !override
      - 3210:80

  backend:
    restart: always
    environment:
      DJANGO_ALLOWED_HOSTS: "backend, localhost, bird-ringing.deployment.example"
      DJANGO_CSRF_TRUSTED_ORIGINS: "https://bird-ringing.deployment.example"
      LICENSE_CARD_FILE: /resources/Licenskort_för_ringmärkning-2026.svg
      PERMIT_TEMPLATE_FILE: /resources/permit.docx
      DJANGO_EMAIL_HOST_USER: user
      DJANGO_EMAIL_HOST: email.example.com
      DJANGO_EMAIL_PORT: 465
      LICENSING_EMAIL_FROM_ADDR: user@email.example.com
      LICENSING_EMAIL_SUBJECT: "Hello world from bird ringing ({{mnr}}) {{name|safe}}"
      LICENSING_EMAIL_HTML_TEMPLATE: "email_template.html"
      LICENSING_EMAIL_TEMPLATE: "email_template.txt"

  database:
    restart: always
```

The expected file structure for this configuration file will look as follows:
- resources
  - templates
    - email_template.html
    - email_template.txt
  - Licenskort_för_ringmärkning-2026.svg
  - permit.docx
- secrets:
  - postgres-pass.txt
  - db-admin-pass.txt
  - db-user-pass.txt
  - django-secret-key.txt
  - django-email-password.txt

## Validating the configuration

Before starting the service you can test your configuration by running the following script.

```sh
./compose-prod.sh build
./compose-prod.sh run --rm --no-deps backend ./manage.py validate_settings
```

## Starting the Service

```sh
# Build the containers
./compose-prod.sh build
./compose-prod.sh up -d
```

### Enable service admin

In order to make the service available for administrators and users you need to add atleast one super user and create the necessary permission groups.

> **Note:** The following commands can only be run when the `backend` container is up and running

```sh
# Follow the on screen instructions to create an initial super user
./compose-prod.sh exec backend python manage.py createsuperuser
```

```sh
# Creates groups with the permissions needed for regular service users.
# Currently the only group is "Bird ringing experts", by default
./compose-prod.sh exec backend python manage.py create_base_groups
```

Additional users can be created by the super user using the `Django` admin section, available at `https://<your-host>/admin/`. Regular users needs to be assigned to the group `Bird ringing experts` in order to have access to the Bird Ringing service.

### Load data

In order to populate the service with data it is necessary to execute a management command in the `backend` container. This command requires a data export from the the original Bird Ringing database. It expects a folder containing a collection of CSV formatted files that are described in detail [here](./licensing-files.md).

| File Name      | Expected Content                                                               |
| :------------- | :----------------------------------------------------------------------------- |
| Artlista.csv   | A table of species.                                                            |
| Maerkare.csv   | A table of bird ringers combined with some license information.                |
| Medhj.csv      | A table of bird ringing associate ringers mapped to licenses.                  |
| MarkAssYr.csv  | A table relating bird ringing associate ringers to licenses on specific years. |
| TillstTyp.csv  | A table of permission types.                                                   |
| TillstProp.csv | A table of permission properties.                                              |
| Tillstand.csv  | A table of entries describing permits.                                         |

Make sure to have the data available in a folder on the host system, ex. `./resources/bird-ringing-data`. You can then run the following command to populate the service with data:

```sh
./compose-prod.sh run --rm --volume "$(pwd)/resources/bird-ringing-data:/opt/bird-ringing-data:ro" backend-init python manage.py load_data --path_format=/opt/bird-ringing-data/br-ex-{id}.csv
```

## Using an External Database

If you want to host your database externally, note that the currently targeted database is `PostgreSQL`, which is the only recommended out-of-the-box supported solution. It is also expected that you are familiar with how to set up and configure the database yourself.

For an external database, it can be configured mostly using environment variables, except for the password, which follows the documentation in the section [Docker Secrets](#docker-secrets).

| Variable Name | Expected Value                                    |
| :------------ | :------------------------------------------------ |
| POSTGRES_DB   | The name of the database to be used.              |
| POSTGRES_USER | A database user with write access.                |
| POSTGRES_HOST | The host address of the database server.          |
| POSTGRES_PORT | The port used for the database server connection. |

To have a complete setup, these variables need to be configured correctly for both the `backend` and the `backend-init` container. The `backend-init` container is responsible for applying database migrations and generally requires a higher access level than the `backend` container.

A complete example configuration for an external database:

```yml
services:
  proxy:
    restart: always
    ports: !override
      - 3210:80

  backend-init:
    environment:
      POSTGRES_DB: external-database
      POSTGRES_USER: database-privileged-user
      POSTGRES_HOST: database.server.local
      POSTGRES_PORT: 5432

  backend:
    restart: always
    environment:
      POSTGRES_DB: external-database
      POSTGRES_USER: database-user
      POSTGRES_HOST: database.server.local
      POSTGRES_PORT: 5432

      DJANGO_ALLOWED_HOSTS: "backend, localhost, bird-ringing.deployment.example"
      DJANGO_CSRF_TRUSTED_ORIGINS: "https://bird-ringing.deployment.example"
      LICENSE_CARD_FILE: /resources/Licenskort_för_ringmärkning-2026.svg
      PERMIT_TEMPLATE_FILE: /resources/permit.docx
      DJANGO_EMAIL_HOST_USER: user
      DJANGO_EMAIL_HOST: email.example.com
      DJANGO_EMAIL_PORT: 465
      LICENSING_EMAIL_FROM_ADDR: user@email.example.com
      LICENSING_EMAIL_SUBJECT: "Hello world from bird ringing ({{mnr}}) {{name|safe}}"
      LICENSING_EMAIL_HTML_TEMPLATE: "email_template.html"
      LICENSING_EMAIL_TEMPLATE: "email_template.txt"

  database:
    restart: always
```
