from rest_framework import viewsets, filters
from rest_framework.authentication import SessionAuthentication, BasicAuthentication
from licensing.rest.utils import DjangoProtectedModelPermissions
from .common import RingSeriesSerializer
from ring_management.models import RingSeries


class RingSeriesViewSet(viewsets.ModelViewSet):
    authentication_classes = [SessionAuthentication, BasicAuthentication]
    permission_classes = [DjangoProtectedModelPermissions]

    filter_backends = [filters.SearchFilter]
    search_fields = ["prefix"]

    queryset = RingSeries.objects.select_related("color")
    serializer_class = RingSeriesSerializer