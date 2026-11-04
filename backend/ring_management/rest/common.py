from rest_framework import serializers
from licensing.rest.utils import (
    NameBasedChoiceField,
    DjangoProtectedModelPermissions, 
    RelatedFieldSerializer,
)
from ring_management.models import (
    RingVariant,
    RingColor,
    RingOrder,
    RingOrderStatusChoices,
    RingStatusChoices,
    NamedEntity,
    RingModel,
    RingSeries
)

class NamedEntitySerializer(serializers.ModelSerializer):
    class Meta:
        model = NamedEntity
        fields = ["name"]


class RingModelSerializer(serializers.ModelSerializer):
    class Meta:
        model = RingModel
        fields = [
            "id",
            "name",
            "variant",
            "diameter",
            "thickness",
            "weight",
        ]


class RingSeriesSerializer(serializers.ModelSerializer):
    color = RelatedFieldSerializer(
        serializer_class=NamedEntitySerializer,
        queryset=RingColor.objects.all(),
    )

    class Meta:
        model = RingSeries
        fields = [
            "id",
            "prefix",
            "number_of_digits",
            "is_euring",
            "has_web_address",
            "color",
        ]


class RingOrderSerializer(serializers.ModelSerializer):
    status = NameBasedChoiceField(RingOrderStatusChoices)
    ring_model = RelatedFieldSerializer(
        serializer_class=RingModelSerializer,
        queryset=RingModel.objects.all(),
        read_only=True,
    )
    ring_series = RelatedFieldSerializer(
        serializer_class=RingSeriesSerializer,
        queryset=RingSeries.objects.all(),
        read_only=True,
    )

    class Meta:
        model = RingOrder
        fields = [
            "status",
            "ring_model",
            "ring_series",
            "start_number",
            "end_number",
            "external_reference",
            "note",
            "ordered_at",
            "delivered_at"
        ]


class RingSerializer(serializers.ModelSerializer):
    status = NameBasedChoiceField(RingStatusChoices)
    model = RelatedFieldSerializer(
        serializer_class=RingModelSerializer,
        queryset=RingModel.objects.all(),
        read_only=True,
    )
    series = RelatedFieldSerializer(
        serializer_class=RingSeriesSerializer,
        queryset=RingSeries.objects.all(),
        read_only=True,
    )

    class Meta:
        model = RingOrder
        fields = [
            "type",
            "number",
            "status",
            "order",
            "series",
            "model",
        ]