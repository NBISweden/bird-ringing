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
from django.contrib.auth import authenticate, login
from rest_framework.parsers import JSONParser
from django.views.decorators.cache import never_cache
from django.views.decorators.csrf import ensure_csrf_cookie
from django.utils.decorators import method_decorator

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


@method_decorator(ensure_csrf_cookie, name="dispatch")
@method_decorator(never_cache, name="dispatch")
class LoginView(APIView):
    parser_classes = [JSONParser]

    def get(self, request):
        return Response(self.get_user_info(request.user))

    def post(self, request):
        if "username" not in request.data or "password" not in request.data:
            return Response(
                {"detail": "Missing parameters"}, status=status.HTTP_400_BAD_REQUEST
            )
        username = request.data["username"]
        password = request.data["password"]
        user = authenticate(request, username=username, password=password)

        if user is not None:
            login(request, user)
            return Response(self.get_user_info(user))
        else:
            return Response(
                {"detail": "Incorrect user or password"},
                status=status.HTTP_401_UNAUTHORIZED,
            )

    def get_user_info(self, user):
        user_permissions = {perm.codename for perm in user.user_permissions.all()}
        for group in user.groups.all():
            user_permissions.update({perm.codename for perm in group.permissions.all()})
        return {
            "username": user.username,
            "permissions": user_permissions,
            "isAuthenticated": user.is_authenticated,
        }
