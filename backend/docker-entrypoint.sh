#!/bin/sh -

# The "backend-init" service will apply any pending migrations and then
# terminate.
case $SERVICE_MODE in (*-init)
	case $SERVICE_MODE in 
		development*)
			pip install uv &&
			uv sync --frozen &&
			python manage.py makemigrations || exit
			;;
		production*)
			: # Do nothing.
			;;
		*)
			printf "Unknown SERVICE_MODE: %s\n" "$SERVICE_MODE" >&2
			exit 1
	esac

	python manage.py migrate
	exit
esac

# The main "backend" service runs here.

# In development mode, run the Django development server.
case $SERVICE_MODE in
	development*)
		exec python manage.py runserver 0.0.0.0:8000
		;;
	production*)
		TIMEOUT=${GUNICORN_TIMEOUT:-30}
		WORKERS=${GUNICORN_WORKERS:-1}
		exec gunicorn --bind 0.0.0.0:8000 bird_ringing.wsgi --timeout "$TIMEOUT" --workers "$WORKERS"
		;;
	*)
		printf "Unknown SERVICE_MODE: %s\n" "$SERVICE_MODE" >&2
		exit 1
esac
