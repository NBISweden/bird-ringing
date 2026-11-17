from django.db.models import Prefetch
from rest_framework import viewsets
from rest_framework.authentication import SessionAuthentication, BasicAuthentication
from licensing.rest.utils import DjangoProtectedModelPermissions
from .common import RingOrderSerializer
from .ring_sequence_view import ring_sequence_queryset
from ring_management.models import RingOrder


class RingOrderViewSet(viewsets.ModelViewSet):
    """
    Ring orders can only be created and read. Changing the status of their
    sequences is handled separately.
    """
    authentication_classes = [SessionAuthentication, BasicAuthentication]
    permission_classes = [DjangoProtectedModelPermissions]
    http_method_names = ["get", "post", "head", "options"]

    queryset = RingOrder.objects.prefetch_related(
        Prefetch("sequences", queryset=ring_sequence_queryset)
    )
    serializer_class = RingOrderSerializer
