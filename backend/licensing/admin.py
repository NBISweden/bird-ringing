from django.contrib import admin
from .models import (
    Actor,
    LicenseSequence,
    License,
    LicenseRelation,
    LicenseDocument,
    LicensePermissionType,
    LicensePermissionProperty,
    Species,
    LicensePermission,
    LicenseCommunication,
    SpeciesImport,
    ActorImport,
    LicenseSequenceImport,
    LicenseImport,
    PermitDnr,
    LocationPreset,
    LocationPresetGroup
)
from bird_ringing.admin import ModelAdminWithChangeTracking, COMMON_EXCLUDES


class LocationPresetAdmin(admin.TabularInline):
    exclude = COMMON_EXCLUDES
    model = LocationPreset


class LicenseRelationAdmin(admin.TabularInline):
    exclude = COMMON_EXCLUDES
    model = LicenseRelation


class LicensePermissionAdmin(admin.TabularInline):
    exclude = COMMON_EXCLUDES
    model = LicensePermission


class LicensePermissionPropertyAdmin(admin.TabularInline):
    exclude = COMMON_EXCLUDES
    model = LicensePermissionProperty


class LicenseCommunicationAdmin(admin.TabularInline):
    exclude = COMMON_EXCLUDES
    model = LicenseCommunication


class TabularLicenseAdmin(admin.TabularInline):
    exclude = COMMON_EXCLUDES
    model = License


@admin.register(Actor)
class ActorAdmin(ModelAdminWithChangeTracking):
    exclude = COMMON_EXCLUDES
    inlines = [LicenseCommunicationAdmin]


@admin.register(LicenseSequence)
class LicenseSequenceAdmin(ModelAdminWithChangeTracking):
    exclude = COMMON_EXCLUDES
    inlines = [TabularLicenseAdmin]


@admin.register(License)
class LicenseAdmin(ModelAdminWithChangeTracking):
    exclude = COMMON_EXCLUDES
    inlines = [
        LicensePermissionAdmin,
        LicenseRelationAdmin,
        LicenseCommunicationAdmin,
    ]


@admin.register(Species)
class SpeciesAdmin(ModelAdminWithChangeTracking):
    exclude = COMMON_EXCLUDES


@admin.register(LicensePermissionType)
class LicensePermissionTypeAdmin(ModelAdminWithChangeTracking):
    exclude = COMMON_EXCLUDES
    inlines = [LicensePermissionPropertyAdmin]



@admin.register(LicensePermissionProperty)
class LicensePermissionPropertyAdmin(ModelAdminWithChangeTracking):
    exclude = COMMON_EXCLUDES
    list_display = ("name", "related_type")
    list_filter = ("related_type",)
    search_fields = ("name", "description")


@admin.register(LicenseDocument)
class LicenseDocumentAdmin(ModelAdminWithChangeTracking):
    exclude = COMMON_EXCLUDES


@admin.register(ActorImport)
class ActorImportAdmin(admin.ModelAdmin):
    pass


@admin.register(LicenseSequenceImport)
class LicenseSequenceImportAdmin(admin.ModelAdmin):
    pass


@admin.register(LicenseImport)
class LicenseImportAdmin(admin.ModelAdmin):
    pass


@admin.register(SpeciesImport)
class SpeciesImportAdmin(admin.ModelAdmin):
    pass


@admin.register(PermitDnr)
class PermitDnrAdmin(ModelAdminWithChangeTracking):
    exclude = COMMON_EXCLUDES


@admin.register(LocationPresetGroup)
class LocationPresetGroupAdmin(ModelAdminWithChangeTracking):
    exclude = COMMON_EXCLUDES
    list_display = ("name",)

    inlines = [LocationPresetAdmin]