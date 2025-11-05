#!/bin/sh -

# The "backend-init" service will apply any pending migrations and then
# terminate.
case $SERVICE_MODE in (*-init)
	export POSTGRES_USER=db_admin

	case $SERVICE_MODE in (development*)
		pip install uv &&
		uv sync --frozen &&
		python manage.py makemigrations || exit
	esac

	python manage.py migrate
	exit
esac

# The main "backend" service runs here.

export POSTGRES_USER=db_user

# In development mode, run the Django development server.
case $SERVICE_MODE in (development*)
	exec python manage.py runserver 0.0.0.0:8000
esac

# In production mode, run Gunicorn.
exec gunicorn --bind 0.0.0.0:8000 bird_ringing.wsgi
