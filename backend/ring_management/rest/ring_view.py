from rest_framework import serializers, viewsets, filters
from rest_framework.authentication import SessionAuthentication, BasicAuthentication
from licensing.rest.utils import DjangoProtectedModelPermissions
from .common import RingOrderSerializer
from ring_management.models import Ring


class RingOrderViewSet(viewsets.ModelViewSet):
    authentication_classes = [SessionAuthentication, BasicAuthentication]
    permission_classes = [DjangoProtectedModelPermissions]

    filter_backends = [filters.SearchFilter]
    search_fields = ["name"]

    queryset = Ring.objects.all()
    serializer_class = RingSerializer