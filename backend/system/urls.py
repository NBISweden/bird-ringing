from django.urls import path
from .views import SystemInfoView

urlpatterns = [
    path('info/', SystemInfoView.as_view(), name='system-info'),
]