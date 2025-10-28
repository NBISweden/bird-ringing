#!/bin/sh

if [ "$1" = "dev" ]; then
    # Create and run migrations
    python manage.py makemigrations
    python manage.py migrate

    # Start Django app for development
    exec python manage.py runserver "0.0.0.0:8000"
elif [ "$1" = "prod" ]; then
    # Run migrations
    python manage.py migrate

    # Start Django app with WSGI layer
    exec gunicorn bird_ringing.wsgi --bind "0.0.0.0:8000"
fi
