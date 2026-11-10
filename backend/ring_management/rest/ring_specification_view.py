from rest_framework import viewsets, filters
from rest_framework.authentication import SessionAuthentication, BasicAuthentication
from licensing.rest.utils import DjangoProtectedModelPermissions
from .common import RingSpecificationSerializer
from ring_management.models import RingSpecification


class RingSpecificationViewSet(viewsets.ModelViewSet):
    authentication_classes = [SessionAuthentication, BasicAuthentication]
    permission_classes = [DjangoProtectedModelPermissions]

    filter_backends = [filters.SearchFilter]
    search_fields = ["name"]

    queryset = RingSpecification.objects.all()
    serializer_class = RingSpecificationSerializer