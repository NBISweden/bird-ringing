from rest_framework import routers
from .ring_series_view import RingSeriesViewSet
from .ring_specification_view import RingSpecificationViewSet
from .properties_view import (
    RingVariantViewSet,
    RingMaterialViewSet,
    RingTypeCodeViewSet,
    RingColorViewSet,
)

router = routers.DefaultRouter()

router.register(r"ring_series", RingSeriesViewSet)
router.register(r"ring_specification", RingSpecificationViewSet)

router.register(r"property/ring_variant", RingVariantViewSet)
router.register(r"property/ring_material", RingMaterialViewSet)
router.register(r"property/ring_type_code", RingTypeCodeViewSet)
router.register(r"property/ring_color", RingColorViewSet)