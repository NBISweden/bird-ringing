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
    RingSeries,
    Ring,
)

class NamedEntitySerializer(serializers.ModelSerializer):
    class Meta:
        model = NamedEntity
        fields = ["name"]


class RingModelSerializer(serializers.ModelSerializer):
    created_by = serializers.HiddenField(default=serializers.CurrentUserDefault())
    updated_by = serializers.HiddenField(default=serializers.CurrentUserDefault())

    class Meta:
        model = RingModel
        fields = [
            "id",
            "name",
            "variant",
            "diameter",
            "thickness",
            "weight",
            "created_by",
            "updated_by",
        ]


class RingSeriesSerializer(serializers.ModelSerializer):
    color = RelatedFieldSerializer(
        serializer_class=NamedEntitySerializer,
        read_only=True,
    )
    color_id = serializers.PrimaryKeyRelatedField(
        source="color",
        queryset=RingColor.objects.all(),
        write_only=True,
    )
    created_by = serializers.HiddenField(default=serializers.CurrentUserDefault())
    updated_by = serializers.HiddenField(default=serializers.CurrentUserDefault())

    class Meta:
        model = RingSeries
        fields = [
            "id",
            "prefix",
            "number_of_digits",
            "is_euring",
            "has_web_address",
            "color",
            "color_id",
            "created_by",
            "updated_by",
        ]


class RingOrderSerializer(serializers.ModelSerializer):
    status = NameBasedChoiceField(RingOrderStatusChoices)
    ring_model = RelatedFieldSerializer(
        serializer_class=RingModelSerializer,
        read_only=True,
    )
    ring_model_id = serializers.PrimaryKeyRelatedField(
        source="model",
        queryset=RingModel.objects.all(),
        write_only=True,
    )
    ring_series = RelatedFieldSerializer(
        serializer_class=RingSeriesSerializer,
        read_only=True,
    )
    ring_series_id = serializers.PrimaryKeyRelatedField(
        source="series",
        queryset=RingSeries.objects.all(),
        write_only=True,
    )
    created_by = serializers.HiddenField(default=serializers.CurrentUserDefault())
    updated_by = serializers.HiddenField(default=serializers.CurrentUserDefault())

    class Meta:
        model = RingOrder
        fields = [
            "status",
            "ring_model",
            "ring_series",
            "ring_model_id",
            "ring_series_id",
            "start_number",
            "end_number",
            "external_reference",
            "note",
            "ordered_at",
            "delivered_at",
            "created_by",
            "updated_by",
        ]


class RingSerializer(serializers.ModelSerializer):
    status = NameBasedChoiceField(RingStatusChoices)
    model = RelatedFieldSerializer(
        serializer_class=RingModelSerializer,
        read_only=True,
    )
    model_id = serializers.PrimaryKeyRelatedField(
        source="model",
        queryset=RingModel.objects.all(),
        write_only=True,
    )
    series = RelatedFieldSerializer(
        serializer_class=RingSeriesSerializer,
        read_only=True,
    )
    series_id = serializers.PrimaryKeyRelatedField(
        source="series",
        queryset=RingSeries.objects.all(),
        write_only=True,
    )
    order = RelatedFieldSerializer(
        serializer_class=RingOrderSerializer,
        read_only=True,
    )
    order_id = serializers.PrimaryKeyRelatedField(
        source="order",
        queryset=RingOrder.objects.all(),
        write_only=True,
    )
    created_by = serializers.HiddenField(default=serializers.CurrentUserDefault())
    updated_by = serializers.HiddenField(default=serializers.CurrentUserDefault())

    class Meta:
        model = Ring
        fields = [
            "number",
            "status",
            "order",
            "series",
            "model",
            "model_id",
            "series_id",
            "order_id",
            "license",
            "created_by",
            "updated_by",
        ]