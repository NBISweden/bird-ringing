from django.contrib import admin
from .models import (
    Actor,
    License,
    LicenseRelation,
    LicenseDocument,
    LicensePermissionType,
    LicensePermissionProperty,
    Species,
    LicensePermission,
    LicenseCommunication,
)
import datetime


COMMON_EXCLUDES = [
    "created_at",
    "updated_at",
    "created_by",
    "updated_by",
]


class LicenseRelationAdmin(admin.TabularInline):
    exclude = COMMON_EXCLUDES
    model = LicenseRelation


class LicenseDocumentAdmin(admin.TabularInline):
    exclude = COMMON_EXCLUDES
    model = LicenseDocument


class LicensePermissionAdmin(admin.TabularInline):
    exclude = COMMON_EXCLUDES
    model = LicensePermission


class LicensePermissionProperty(admin.TabularInline):
    exclude = COMMON_EXCLUDES
    model = LicensePermissionProperty


class LicenseCommunicationAdmin(admin.TabularInline):
    exclude = COMMON_EXCLUDES
    model = LicenseCommunication


class ModelAdminWithChangeTracking(admin.ModelAdmin):
    def save_model(self, request, obj, form, change):
        if not hasattr(obj, "created_by"):
            obj.created_by = request.user

        obj.updated_by = request.user
        obj.save()
    
    def save_formset(self, request, obj, formset, change):
        instances = formset.save(commit=False)
        for instance in instances:
            if not hasattr(instance, "created_by"):
                instance.created_by = request.user
            
            instance.updated_by = request.user
            instance.updated_at = datetime.datetime.now()
            instance.save()
            formset.save()


@admin.register(Actor)
class ActorAdmin(ModelAdminWithChangeTracking):
    exclude = COMMON_EXCLUDES
    inlines = [
        LicenseCommunicationAdmin
    ]


@admin.register(License)
class LicenseAdmin(ModelAdminWithChangeTracking):
    exclude = COMMON_EXCLUDES
    inlines = [
        LicensePermissionAdmin,
        LicenseRelationAdmin,
        LicenseDocumentAdmin,
        LicenseCommunicationAdmin
    ]


@admin.register(Species)
class SpeciesAdmin(ModelAdminWithChangeTracking):
    exclude = COMMON_EXCLUDES


@admin.register(LicensePermissionType)
class LicensePermissionTypeAdmin(ModelAdminWithChangeTracking):
    exclude = COMMON_EXCLUDES
    inlines = [
        LicensePermissionProperty
    ]


@admin.register(LicenseDocument)
class LicenseDocumentAdmin(ModelAdminWithChangeTracking):
    exclude = COMMON_EXCLUDES