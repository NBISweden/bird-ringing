from django.contrib import admin
from django import forms
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
)
import datetime
from django.db.models import Q, F
from django.contrib.admin.widgets import FilteredSelectMultiple


COMMON_EXCLUDES = [
    "created_at",
    "updated_at",
    "created_by",
    "updated_by",
]


class LicenseRelationInline(admin.StackedInline):
    exclude = COMMON_EXCLUDES
    model = LicenseRelation


class LicensePermissionInline(admin.StackedInline):
    exclude = COMMON_EXCLUDES
    model = LicensePermission

    def formfield_for_dbfield(self, db_field, **kwargs):
        if db_field.name in {"starts_at", "ends_at"}:
            kwargs['widget'] = forms.TextInput
        return super().formfield_for_dbfield(db_field, **kwargs)


class LicensePermissionPropertyInline(admin.StackedInline):
    exclude = COMMON_EXCLUDES
    model = LicensePermissionProperty


class LicenseCommunicationInline(admin.StackedInline):
    exclude = COMMON_EXCLUDES
    model = LicenseCommunication
    extra = 0
    can_delete = False

    def has_add_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False

    def has_change_permission(self, request, obj=None):
        return False


class TabularLicenseAdmin(admin.TabularInline):
    exclude = COMMON_EXCLUDES
    model = License


class StackedLicenseAdmin(admin.StackedInline):
    exclude = [
        *COMMON_EXCLUDES,
        "version"
    ]
    model = License
    extra = 0
    can_delete = False
    max_num = 0

    def get_formset(self, request, obj=None, **kwargs):
        self.parent_obj = obj
        return super().get_formset(request, obj, **kwargs)

    def get_queryset(self, request):
        qs = super().get_queryset(request)
        query = Q(version=0)
        if self.parent_obj:
            query = query | Q(id=self.parent_obj.latest.id)
            
        return qs.filter(query)


class ModelAdminWithChangeTracking(admin.ModelAdmin):
    def save_model(self, request, obj, form, change):
        if not hasattr(obj, "created_by"):
            obj.created_by = request.user

        obj.updated_by = request.user
        obj.save()

    def save_formset(self, request, obj, formset, change):
        instances = formset.save(commit=False)
        for instance in instances:
            if not hasattr(instance, "created_by") or not instance.created_by:
                instance.created_by = request.user

            instance.updated_by = request.user
            instance.updated_at = datetime.datetime.now()
            instance.save()
        formset.save()


@admin.register(Actor)
class ActorAdmin(ModelAdminWithChangeTracking):
    exclude = COMMON_EXCLUDES
    inlines = [LicenseCommunicationInline]


@admin.register(LicenseSequence)
class LicenseSequenceAdmin(ModelAdminWithChangeTracking):
    exclude = COMMON_EXCLUDES
    inlines = [StackedLicenseAdmin]
    readonly_fields = ["latest"]


class CurrentOrLatestFilter(admin.SimpleListFilter):
    title = 'Current or latest'
    parameter_name = 'version'

    def lookups(self, request, model_admin):
        return (
            ('current', 'Current'),
            ('latest', 'Latest')
        )

    def queryset(self, request, queryset):
        if self.value() == 'current':
            return queryset.filter(id=F("sequence__latest__pk"))
        elif self.value() == 'latest':
            return queryset.filter(version=0)
        return queryset


@admin.register(License)
class LicenseAdmin(ModelAdminWithChangeTracking):
    list_filter = (CurrentOrLatestFilter,)
    exclude = COMMON_EXCLUDES
    inlines = [
        LicensePermissionInline,
        LicenseRelationInline,
        LicenseCommunicationInline,
    ]

    def get_queryset(self, request):
        qs = super().get_queryset(request)
        query = Q(version=0) | Q(id=F("sequence__latest__pk"))
        return qs.filter(query)
    
    def has_change_permission(self, request, obj=None):
        if obj:
            return obj.editable
        return False


@admin.register(Species)
class SpeciesAdmin(ModelAdminWithChangeTracking):
    exclude = COMMON_EXCLUDES


@admin.register(LicensePermissionType)
class LicensePermissionTypeAdmin(ModelAdminWithChangeTracking):
    exclude = COMMON_EXCLUDES
    inlines = [LicensePermissionPropertyInline]


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
