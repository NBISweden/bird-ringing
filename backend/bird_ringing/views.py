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
from rest_framework.permissions import IsAuthenticated
from rest_framework.authentication import BasicAuthentication, SessionAuthentication

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
                "uptime": str(timedelta(seconds=uptime)),
                "django_version": get_version(),
                "python_version": platform.python_version(),
            },
            "status": {
                "database": self.db_check(),
                "cache": self.cache_check(),
            },
            "config": {
                "debug": settings.DEBUG,
            },
        }

        return Response(info)

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


class HealthCheckView(APIView):
    def get(self, request):
        return Response({"status": "ok"}, status=status.HTTP_200_OK)


class LoginView(APIView):
    authentication_classes = [SessionAuthentication, BasicAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user_permissions = {
            perm.codename for perm in request.user.user_permissions.all()
        }
        for group in request.user.groups.all():
            user_permissions.update({perm.codename for perm in group.permissions.all()})

        return Response(
            {
                "username": request.user.username,
                "permissions": user_permissions,
            }
        )
