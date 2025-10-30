#!/bin/sh -

case $SERVICE_MODE in (*-init)
	case $SERVICE_MODE in (dev*)
		env POSTGRES_USER=dbadmin \
			python manage.py makemigrations
	esac

	env POSTGRES_USER=dbadmin \
		python manage.py migrate
	exit
esac

case $SERVICE_MODE in (dev*)
	exec env POSTGRES_USER=dbuser \
		python manage.py runserver
esac

exec env POSTGRES_USER=dbuser \
	gunicorn bird_ringing.wsgi
