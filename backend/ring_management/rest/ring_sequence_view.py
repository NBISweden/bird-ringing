from rest_framework import viewsets
from rest_framework.authentication import SessionAuthentication, BasicAuthentication
from licensing.rest.utils import DjangoProtectedModelPermissions
from .common import RingSequenceSerializer
from ring_management.models import RingSequence


ring_sequence_queryset = RingSequence.objects.select_related(
    "series__color",
    "specification__type_code",
    "specification__variant",
    "specification__material",
)


class RingSequenceViewSet(viewsets.ModelViewSet):
    """
    Ring sequences are created through ring orders and can only be read here.
    """
    authentication_classes = [SessionAuthentication, BasicAuthentication]
    permission_classes = [DjangoProtectedModelPermissions]
    http_method_names = ["get", "head", "options"]

    queryset = ring_sequence_queryset
    serializer_class = RingSequenceSerializer
