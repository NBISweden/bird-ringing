from django.contrib import admin
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


class RingSequenceInlineAdmin(admin.TabularInline):
    exclude = COMMON_EXCLUDES
    model = RingSequence


@admin.register(RingOrder)
class RingOrderAdmin(ModelAdminWithChangeTracking):
    readonly_fields = COMMON_EXCLUDES
    model = RingOrder
    inlines = [RingSequenceInlineAdmin]


@admin.register(RingSequence)
class RingSequenceAdmin(ModelAdminWithChangeTracking):
    readonly_fields = COMMON_EXCLUDES
    model = RingSequence
