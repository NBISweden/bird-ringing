import platform
import time
from datetime import timedelta
import django
from django.conf import settings

from rest_framework.views import APIView
from rest_framework.response import Response

SERVER_START_TIME = time.time()


class SystemInfoView(APIView):

    def get(self, request):
        uptime = int(time.time() - SERVER_START_TIME)

        info = {
            "application": {
                "name": "bird_ringing",
                "version": "0.0.0",
                "uptime_seconds": uptime,
                "uptime": str(timedelta(seconds = uptime)),
                "django_version": django.get_version(),
                "python_version": platform.python_version(),
            },
            "config": {
                "debug": settings.DEBUG,
            }
        }

        return Response(info)
