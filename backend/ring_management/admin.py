from django.contrib import admin
from .models import (
    RingColor,
    RingVariant,
    RingMaterial,
    RingTypeCode,
    RingSpecification,
    RingSeries,
)
from bird_ringing.admin import ModelAdminWithChangeTracking, COMMON_EXCLUDES


@admin.register(RingColor)
class RingColorAdmin(admin.ModelAdmin):
    exclude = COMMON_EXCLUDES
    model = RingColor


@admin.register(RingTypeCode)
class RingTypeCodeAdmin(admin.ModelAdmin):
    exclude = COMMON_EXCLUDES
    model = RingTypeCode


@admin.register(RingMaterial)
class RingMaterialdmin(admin.ModelAdmin):
    exclude = COMMON_EXCLUDES
    model = RingMaterial


@admin.register(RingVariant)
class RingVariantAdmin(admin.ModelAdmin):
    exclude = COMMON_EXCLUDES
    model = RingVariant


@admin.register(RingSpecification)
class RingSpecificationAdmin(ModelAdminWithChangeTracking):
    exclude = COMMON_EXCLUDES
    model = RingSpecification


@admin.register(RingSeries)
class RingSeriesAdmin(ModelAdminWithChangeTracking):
    exclude = COMMON_EXCLUDES
    model = RingSeries
