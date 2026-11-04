from rest_framework import routers
from .order_view import RingOrderViewSet
from .ring_view import RingViewSet

router = routers.DefaultRouter()
router.register(r"order", RingOrderViewSet)
router.register(r"ring", RingViewSet)