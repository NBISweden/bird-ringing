from rest_framework import routers
from .core import router as rest_router
from .properties import router as properties_router

router = routers.DefaultRouter()
router.registry.extend(rest_router.registry)
router.registry.extend(properties_router.registry)