from rest_framework import routers, serializers, viewsets, filters
from rest_framework.authentication import SessionAuthentication, BasicAuthentication
from licensing.models import (
    Actor,
    LicensePermissionType,
    LicensePermissionProperty,
    ActorTypeChoices,
    SexChoices,
    LanguageChoices,
    ReportStatusChoices,
    ReportTypeChoices,
    LicenseRoleChoices,
    LicenseStatusChoices,
)
from .utils import LabeledChoiceViewset, DjangoProtectedModelPermissions


class ActorSerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(read_only=True)
    label = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Actor
        fields = ["id", "label"]

    def get_label(self, obj):
        return f"{obj.full_name} ({obj.birth_year})"


class PermissionTypeSerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(read_only=True)
    label = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = LicensePermissionType
        fields = ["id", "label"]

    def get_label(self, obj):
        return obj.name


class PermissionPropertySerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(read_only=True)
    label = serializers.SerializerMethodField(read_only=True)
    related_type = serializers.SerializerMethodField(read_only=True)
    queryset = LicensePermissionProperty.objects.all().select_related("related_type")

    class Meta:
        model = LicensePermissionProperty
        fields = ["id", "label", "related_type"]

    def get_label(self, obj):
        return obj.name
    
    def get_related_type(self, obj):
        return (
            {
                "id": obj.related_type.id,
            }
            if obj.related_type
            else None
        )


class ActorViewSet(viewsets.ModelViewSet):
    authentication_classes = [SessionAuthentication, BasicAuthentication]
    permission_classes = [DjangoProtectedModelPermissions]

    filter_backends = [filters.SearchFilter]
    search_fields = ["full_name"]

    queryset = Actor.objects.all()
    serializer_class = ActorSerializer


class PermissionTypeViewSet(viewsets.ModelViewSet):
    authentication_classes = [SessionAuthentication, BasicAuthentication]
    permission_classes = [DjangoProtectedModelPermissions]

    filter_backends = [filters.SearchFilter]
    search_fields = ["name"]

    queryset = LicensePermissionType.objects.all()
    serializer_class = PermissionTypeSerializer


class PermissionPropertyViewSet(viewsets.ModelViewSet):
    authentication_classes = [SessionAuthentication, BasicAuthentication]
    permission_classes = [DjangoProtectedModelPermissions]

    filter_backends = [filters.SearchFilter]
    search_fields = ["name"]

    queryset = LicensePermissionProperty.objects.all()
    serializer_class = PermissionPropertySerializer


def register_choice_view_sets(router):
    choice_classes = [
        ("actor_type", ActorTypeChoices),
        ("sex", SexChoices),
        ("language", LanguageChoices),
        ("report_status", ReportStatusChoices),
        ("report_type", ReportTypeChoices),
        ("license_role", LicenseRoleChoices),
        ("license_status", LicenseStatusChoices),
    ]

    for (basename, choice_class) in choice_classes:
        class _ChoiceViewSet(LabeledChoiceViewset):
            choices = choice_class
        router.register(r"property/" + basename, _ChoiceViewSet, basename=basename)


router = routers.DefaultRouter()
router.register(r"property/actor", ActorViewSet)
router.register(r"property/permission_type", PermissionTypeViewSet)
router.register(r"property/permission_property", PermissionPropertyViewSet)
register_choice_view_sets(router)