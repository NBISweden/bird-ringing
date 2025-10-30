import platform
import time
from datetime import timedelta
from django import get_version
from django.conf import settings
from django.core.cache import cache
from django.db import connection

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

from bird_ringing import __version__

SERVER_START_TIME = time.time()


class SystemInfoView(APIView):

    def get(self, request):
        uptime = int(time.time() - SERVER_START_TIME)

        info = {
            "application": {
                "name": "bird_ringing",
                "version": __version__,
                "uptime_seconds": uptime,
                "uptime": str(timedelta(seconds = uptime)),
                "django_version": get_version(),
                "python_version": platform.python_version(),
            },
            "config": {
                "debug": settings.DEBUG,
            }
        }

        return Response(info)

class HealthCheckView(APIView):

    def get(self, request):
        health_status = {
            "database": self.db_check(),
            "cache": self.cache_check(),
        }

        # this is True if all checks returned ok
        is_ready = set(health_status.values()) == {'ok'}

        return Response(
            {
                "status": "ok" if is_ready else "not ok",
                "checks": health_status
            },
            status=status.HTTP_200_OK if is_ready else status.HTTP_503_SERVICE_UNAVAILABLE
        )

    def db_check(self):
        try:
            connection.ensure_connection()
            return "ok"
        except Exception:
            return "fail"

    def cache_check(self):
        try:
            cache.set("readiness_check", "ok", timeout=5)
            return "ok" if cache.get("readiness_check") == "ok" else "fail"
        except Exception:
            return "fail"
