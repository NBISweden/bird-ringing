"""
URL configuration for bird_ringing project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""

from django.contrib import admin
from django.urls import path, include
from licensing.rest import router as licensing_router
from .views import SystemInfoView, HealthCheckView, LoginView


urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/system/info/", SystemInfoView.as_view(), name="system-info"),
    path("api/system/health/", HealthCheckView.as_view(), name="system-health"),
    path("api/user/", LoginView.as_view(), name="auth-login"),
    path("api/", include(licensing_router.urls)),
]
