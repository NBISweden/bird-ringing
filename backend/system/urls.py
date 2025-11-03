from django.urls import path
from .views import SystemInfoView
from .views import HealthCheckView

urlpatterns = [
    path("info/", SystemInfoView.as_view(), name="system-info"),
    path("health/", HealthCheckView.as_view(), name="system-info"),
]
