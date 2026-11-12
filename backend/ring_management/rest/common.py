from rest_framework import serializers
from licensing.rest.utils import (
    RelatedFieldSerializer,
)
from bird_ringing.serializers import ChangeTrackingSerializer
from ring_management.models import (
    RingVariant,
    RingMaterial,
    RingTypeCode,
    RingColor,
    RingSpecification,
    RingSeries,
)


class RingTypeCodeSerializer(serializers.ModelSerializer):
    class Meta:
        model = RingTypeCode
        fields = ["name", "id"]


class RingMaterialSerializer(serializers.ModelSerializer):
    class Meta:
        model = RingMaterial
        fields = ["name", "id"]


class RingVariantSerializer(serializers.ModelSerializer):
    class Meta:
        model = RingVariant
        fields = ["name", "id"]


class RingColorSerializer(serializers.ModelSerializer):
    class Meta:
        model = RingColor
        fields = ["name", "id"]


class RingSpecificationSerializer(ChangeTrackingSerializer, serializers.ModelSerializer):
    type_code = RelatedFieldSerializer(
        serializer_class=RingTypeCodeSerializer,
        read_only=True,
    )
    type_code_id = serializers.PrimaryKeyRelatedField(
        source="type_code",
        queryset=RingTypeCode.objects.all(),
        write_only=True,
    )
    variant = RelatedFieldSerializer(
        serializer_class=RingVariantSerializer,
        read_only=True,
    )
    variant_id = serializers.PrimaryKeyRelatedField(
        source="variant",
        queryset=RingVariant.objects.all(),
        write_only=True,
    )
    material = RelatedFieldSerializer(
        serializer_class=RingMaterialSerializer,
        read_only=True,
    )
    material_id = serializers.PrimaryKeyRelatedField(
        source="material",
        queryset=RingMaterial.objects.all(),
        write_only=True,
    )

    class Meta:
        model = RingSpecification
        fields = [
            "id",
            "name",
            "type_code",
            "type_code_id",
            "variant",
            "variant_id",
            "material",
            "material_id",
            "variant",
            "diameter",
            "thickness",
            "height",
            "weight",
            "created_by",
            "updated_by",
        ]
    
    def update(self, instance, validated_data):
        validated_data["updated_by"] = self.context["request"].user
        return super().update(instance, validated_data)


class RingSeriesSerializer(ChangeTrackingSerializer, serializers.ModelSerializer):
    color = RelatedFieldSerializer(
        serializer_class=RingColorSerializer,
        read_only=True,
    )
    color_id = serializers.PrimaryKeyRelatedField(
        source="color",
        queryset=RingColor.objects.all(),
        write_only=True,
        required=False,
        allow_null=True,
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
            "color_id",
            "created_by",
            "updated_by",
        ]
