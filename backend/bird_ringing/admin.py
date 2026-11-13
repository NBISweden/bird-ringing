from django.contrib import admin
import datetime


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


COMMON_EXCLUDES = [
    "created_at",
    "updated_at",
    "created_by",
    "updated_by",
]