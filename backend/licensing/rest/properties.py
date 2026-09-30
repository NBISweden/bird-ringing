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
    Species,
)
from .utils import LabeledChoiceViewset, DjangoProtectedModelPermissions


class ActorSerializer(serializers.ModelSerializer):
    id = serializers.CharField(read_only=True)
    label = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Actor
        fields = ["id", "label"]

    def get_label(self, obj):
        return f"{obj.full_name} ({obj.birth_year})"


class SpeciesSerializer(serializers.ModelSerializer):
    id = serializers.CharField(read_only=True)
    label = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Species
        fields = ["id", "label"]

    def get_label(self, obj):
        return obj.name


class PermissionPropertyNestedSerializer(serializers.ModelSerializer):
    id = serializers.CharField(read_only=True)
    label = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = LicensePermissionProperty
        fields = ["id", "label", "description"]

    def get_label(self, obj):
        return obj.name


class PermissionTypeSerializer(serializers.ModelSerializer):
    id = serializers.CharField(read_only=True)
    label = serializers.CharField(source="name")
    description = serializers.CharField(required=False, allow_blank=True)
    properties = serializers.SerializerMethodField(read_only=True)
    created_by = serializers.HiddenField(
        default=serializers.CreateOnlyDefault(serializers.CurrentUserDefault())
    )
    updated_by = serializers.HiddenField(default=serializers.CurrentUserDefault())

    class Meta:
        model = LicensePermissionType
        fields = [
            "id",
            "label",
            "description",
            "properties",
            "created_by",
            "updated_by",
        ]

    def get_properties(self, obj):
        qs = obj.licensepermissionproperty_set.all().order_by("name")
        return PermissionPropertyNestedSerializer(qs, many=True).data


class PermissionPropertySerializer(serializers.ModelSerializer):
    id = serializers.CharField(read_only=True)
    label = serializers.CharField(source="name")
    description = serializers.CharField(required=False, allow_blank=True)
    related_type = serializers.SerializerMethodField(read_only=True)
    related_type_id = serializers.PrimaryKeyRelatedField(
        source="related_type",
        queryset=LicensePermissionType.objects.all(),
        write_only=True,
        required=False,
        allow_null=True,
    )
    created_by = serializers.HiddenField(
        default=serializers.CreateOnlyDefault(serializers.CurrentUserDefault())
    )
    updated_by = serializers.HiddenField(default=serializers.CurrentUserDefault())

    class Meta:
        model = LicensePermissionProperty
        fields = [
            "id",
            "label",
            "description",
            "related_type",
            "related_type_id",
            "created_by",
            "updated_by",
        ]

    def get_related_type(self, obj):
        return (
            {
                "id": str(obj.related_type.id),
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


class SpeciesViewSet(viewsets.ModelViewSet):
    authentication_classes = [SessionAuthentication, BasicAuthentication]
    permission_classes = [DjangoProtectedModelPermissions]

    filter_backends = [filters.SearchFilter]
    search_fields = ["name", "scientific_code"]

    queryset = Species.objects.all()
    serializer_class = SpeciesSerializer


class PermissionTypeViewSet(viewsets.ModelViewSet):
    authentication_classes = [SessionAuthentication, BasicAuthentication]
    permission_classes = [DjangoProtectedModelPermissions]

    filter_backends = [filters.SearchFilter]
    search_fields = ["name"]

    queryset = LicensePermissionType.objects.prefetch_related("licensepermissionproperty_set").all()    
    serializer_class = PermissionTypeSerializer


class PermissionPropertyViewSet(viewsets.ModelViewSet):
    authentication_classes = [SessionAuthentication, BasicAuthentication]
    permission_classes = [DjangoProtectedModelPermissions]

    filter_backends = [filters.SearchFilter]
    search_fields = ["name"]

    queryset = LicensePermissionProperty.objects.select_related("related_type").all()
    serializer_class = PermissionPropertySerializer

    def get_queryset(self):
        qs = super().get_queryset()
        unrelated = self.request.query_params.get("unrelated")
        if unrelated in ("1", "true", "True"):
            qs = qs.filter(related_type__isnull=True)
        return qs.order_by("name")

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
router.register(r"property/species", SpeciesViewSet)
router.register(r"property/permission_type", PermissionTypeViewSet)
router.register(r"property/permission_property", PermissionPropertyViewSet)
register_choice_view_sets(router)