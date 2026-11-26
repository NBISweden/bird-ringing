from django.contrib import admin
from django.core.exceptions import ValidationError
from django.forms.models import BaseInlineFormSet
from .models import (
    RingColor,
    RingVariant,
    RingMaterial,
    RingTypeCode,
    RingSpecification,
    RingSeries,
    RingOrder,
    RingSequence,
)
from bird_ringing.admin import ModelAdminWithChangeTracking, COMMON_EXCLUDES


@admin.register(RingColor)
class RingColorAdmin(admin.ModelAdmin):
    model = RingColor


@admin.register(RingTypeCode)
class RingTypeCodeAdmin(admin.ModelAdmin):
    model = RingTypeCode


@admin.register(RingMaterial)
class RingMaterialdmin(admin.ModelAdmin):
    model = RingMaterial


@admin.register(RingVariant)
class RingVariantAdmin(admin.ModelAdmin):
    model = RingVariant


@admin.register(RingSpecification)
class RingSpecificationAdmin(ModelAdminWithChangeTracking):
    readonly_fields = COMMON_EXCLUDES
    model = RingSpecification


@admin.register(RingSeries)
class RingSeriesAdmin(ModelAdminWithChangeTracking):
    readonly_fields = COMMON_EXCLUDES
    model = RingSeries


class RingSequenceInlineFormSet(BaseInlineFormSet):
    def clean(self):
        """
        Checks the sequences in the submitted forms against each other.
        Overlaps with sequences already in the database are checked by
        RingSequence.clean().
        """
        super().clean()

        sequences = [
            form.instance
            for form in self.forms
            if form.is_valid()
            and form.cleaned_data
            and not form.cleaned_data.get("DELETE", False)
        ]

        overlaps = [
            f"{sequence} overlaps with {other}"
            for i, sequence in enumerate(sequences)
            for other in sequences[i + 1:]
            if sequence.overlaps_with(other)
        ]

        if overlaps:
            raise ValidationError(overlaps)


class RingSequenceInlineAdmin(admin.TabularInline):
    exclude = COMMON_EXCLUDES
    model = RingSequence
    formset = RingSequenceInlineFormSet


@admin.register(RingOrder)
class RingOrderAdmin(ModelAdminWithChangeTracking):
    readonly_fields = COMMON_EXCLUDES
    model = RingOrder
    inlines = [RingSequenceInlineAdmin]


@admin.register(RingSequence)
class RingSequenceAdmin(ModelAdminWithChangeTracking):
    readonly_fields = COMMON_EXCLUDES
    model = RingSequence
