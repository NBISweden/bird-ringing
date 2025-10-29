from django.contrib import admin
from .models import Actor, License, LicenseRelation


COMMON_EXCLUDES = [
    "created_at",
    "updated_at",
    "created_by",
    "updated_by",
]


class LicenseRelationAdmin(admin.TabularInline):
    model = LicenseRelation


@admin.register(Actor)
class ActorAdmin(admin.ModelAdmin):
    exclude = COMMON_EXCLUDES

    def save_model(self, request, obj, form, change):
        if not hasattr(obj, "created_by"):
            obj.created_by = request.user

        obj.updated_by = request.user
        obj.save()


@admin.register(License)
class LicenseAdmin(admin.ModelAdmin):
    exclude = COMMON_EXCLUDES
    inlines = [LicenseRelationAdmin]

    def save_model(self, request, obj, form, change):
        if not hasattr(obj, "created_by"):
            obj.created_by = request.user

        obj.updated_by = request.user
        obj.save()