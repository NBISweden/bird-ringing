from django.contrib import admin
from .models import (
    RingColor,
    RingOrder,
    RingVariant,
    RingMaterial,
    RingTypeCode,
    RingModel,
    RingSeries,
    Ring,
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


@admin.register(RingModel)
class RingModelAdmin(ModelAdminWithChangeTracking):
    exclude = COMMON_EXCLUDES
    model = RingModel


@admin.register(RingSeries)
class RingSeriesAdmin(ModelAdminWithChangeTracking):
    exclude = COMMON_EXCLUDES
    model = RingSeries

@admin.register(RingOrder)
class RingOrderAdmin(ModelAdminWithChangeTracking):
    exclude = COMMON_EXCLUDES
    model = RingOrder


@admin.register(Ring)
class RingAdmin(ModelAdminWithChangeTracking):
    exclude = COMMON_EXCLUDES
    model = Ring