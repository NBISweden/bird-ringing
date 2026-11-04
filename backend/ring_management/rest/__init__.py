from rest_framework import routers
from .order_view import RingOrderViewSet

router = routers.DefaultRouter()
router.register(r"order", RingOrderViewSet)
