from rest_framework import viewsets
from rest_framework.authentication import SessionAuthentication, BasicAuthentication
from licensing.rest.utils import DjangoProtectedModelPermissions
from .common import (
    RingVariantSerializer,
    RingMaterialSerializer,
    RingTypeCodeSerializer,
    RingColorSerializer,
)
from ring_management.models import (
    RingVariant,
    RingMaterial,
    RingTypeCode,
    RingColor,
)


class RingVariantViewSet(viewsets.ModelViewSet):
    authentication_classes = [SessionAuthentication, BasicAuthentication]
    permission_classes = [DjangoProtectedModelPermissions]

    queryset = RingVariant.objects.all()
    serializer_class = RingVariantSerializer


class RingMaterialViewSet(viewsets.ModelViewSet):
    authentication_classes = [SessionAuthentication, BasicAuthentication]
    permission_classes = [DjangoProtectedModelPermissions]

    queryset = RingMaterial.objects.all()
    serializer_class = RingMaterialSerializer


class RingTypeCodeViewSet(viewsets.ModelViewSet):
    authentication_classes = [SessionAuthentication, BasicAuthentication]
    permission_classes = [DjangoProtectedModelPermissions]

    queryset = RingTypeCode.objects.all()
    serializer_class = RingTypeCodeSerializer


class RingColorViewSet(viewsets.ModelViewSet):
    authentication_classes = [SessionAuthentication, BasicAuthentication]
    permission_classes = [DjangoProtectedModelPermissions]

    queryset = RingColor.objects.all()
    serializer_class = RingColorSerializer