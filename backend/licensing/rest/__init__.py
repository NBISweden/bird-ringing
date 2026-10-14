from rest_framework import routers
from .properties import router as properties_router
from .license_sequence_view import LicenseSequenceViewSet
from .actor_view import ActorViewSet

router = routers.DefaultRouter()
router.register(r"license_sequence", LicenseSequenceViewSet)
router.register(r"actor", ActorViewSet)
router.registry.extend(properties_router.registry)
