from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import transaction
from rest_framework import serializers
from licensing.rest.utils import (
    RelatedFieldSerializer,
    NameBasedChoiceField,
)
from bird_ringing.serializers import ChangeTrackingSerializer
from ring_management.models import (
    RingVariant,
    RingMaterial,
    RingTypeCode,
    RingColor,
    RingSpecification,
    RingSeries,
    RingOrder,
    RingSequence,
    RingSequenceStatusChoices,
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

    def update(self, instance, validated_data):
        try:
            return super().update(instance, validated_data)
        except DjangoValidationError as error:
            raise serializers.ValidationError(error.message_dict)


class RingSequenceSerializer(ChangeTrackingSerializer, serializers.ModelSerializer):
    series = RelatedFieldSerializer(
        serializer_class=RingSeriesSerializer,
        read_only=True,
    )
    series_id = serializers.PrimaryKeyRelatedField(
        source="series",
        queryset=RingSeries.objects.all(),
        write_only=True,
    )
    specification = RelatedFieldSerializer(
        serializer_class=RingSpecificationSerializer,
        read_only=True,
    )
    specification_id = serializers.PrimaryKeyRelatedField(
        source="specification",
        queryset=RingSpecification.objects.all(),
        write_only=True,
    )
    quantity = serializers.IntegerField(min_value=1)
    first_ring_number = serializers.CharField(read_only=True)
    last_ring_number = serializers.CharField(read_only=True)
    status = NameBasedChoiceField(choices=RingSequenceStatusChoices, read_only=True)

    class Meta:
        model = RingSequence
        fields = [
            "id",
            "order_id",
            "series",
            "series_id",
            "specification",
            "specification_id",
            "start_number",
            "quantity",
            "end_number",
            "first_ring_number",
            "last_ring_number",
            "status",
            "created_at",
            "created_by",
            "updated_by",
        ]
        read_only_fields = ["order_id", "end_number"]
        extra_kwargs = {"start_number": {"min_value": 1}}

    def validate(self, attrs):
        quantity = attrs.pop("quantity")
        attrs["end_number"] = attrs["start_number"] + quantity - 1

        sequence = RingSequence(
            series=attrs["series"],
            specification=attrs["specification"],
            start_number=attrs["start_number"],
            end_number=attrs["end_number"],
        )
        try:
            sequence.clean()
        except DjangoValidationError as error:
            raise serializers.ValidationError({
                ("quantity" if field == "end_number" else field): messages
                for field, messages in error.message_dict.items()
            })

        return attrs


class RingOrderSerializer(ChangeTrackingSerializer, serializers.ModelSerializer):
    sequences = RingSequenceSerializer(many=True, allow_empty=False)

    class Meta:
        model = RingOrder
        fields = [
            "id",
            "note",
            "sequences",
            "created_at",
            "created_by",
            "updated_by",
        ]

    def validate_sequences(self, sequences):
        """
        Checks the sequences in the request against each other. Overlaps
        with sequences already in the database are checked by
        RingSequenceSerializer.
        """
        instances = [
            RingSequence(
                series=data["series"],
                start_number=data["start_number"],
                end_number=data["end_number"],
            )
            for data in sequences
        ]

        errors = [{} for _ in instances]
        for i, sequence in enumerate(instances):
            for j in range(i + 1, len(instances)):
                other = instances[j]
                if sequence.overlaps_with(other):
                    errors[j].setdefault("start_number", []).append(
                        f"The sequence {other} overlaps with {sequence} in this order."
                    )

        if any(errors):
            raise serializers.ValidationError(errors)

        return sequences

    @transaction.atomic
    def create(self, validated_data):
        sequences = validated_data.pop("sequences")
        order = super().create(validated_data)

        for i, sequence in enumerate(sequences):
            try:
                RingSequence.objects.create(order=order, **sequence)
            except DjangoValidationError as error:
                errors = [{} for _ in sequences]
                errors[i] = {
                    ("quantity" if field == "end_number" else field): messages
                    for field, messages in error.message_dict.items()
                }
                raise serializers.ValidationError({"sequences": errors})

        return order
