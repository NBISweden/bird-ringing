
import logging
from rest_framework import serializers, viewsets, filters
from django.db import models
from django.db.models.functions import Coalesce, NullIf, Trim
from django.contrib.postgres.aggregates import StringAgg
from rest_framework.authentication import SessionAuthentication, BasicAuthentication
from licensing.models import (
    Actor,
    ActorTypeChoices,
    SexChoices,
    LanguageChoices,
    LicenseRoleChoices,
    LicenseRelation,
    LicenseCommunication,
)
from .utils import ( 
    NameBasedChoiceField, 
    ValueListMixin, 
    DjangoProtectedModelPermissions, 
    DynamicOrderingFilter, 
    IdSelectionFilter, 
    StandardResultsSetPagination
)


logger = logging.getLogger(__name__)


class ActorLicenseRelationSerializer(serializers.ModelSerializer):
    role = serializers.ChoiceField(
        choices=LicenseRoleChoices, source="get_role_display"
    )
    version = serializers.IntegerField(source="license.version", read_only=True)
    starts_at = serializers.DateField(source="license.starts_at", read_only=True)
    ends_at = serializers.DateField(source="license.ends_at", read_only=True)
    communication_status = serializers.SerializerMethodField(read_only=True)
    communication_type = serializers.SerializerMethodField(read_only=True)


    class Meta:
        model = LicenseRelation
        fields = ["license_id", "role", "license_number", "associate_number", "version", "starts_at", "ends_at", "communication_status", "communication_type"]

    def get_communication_status(self, obj):  
        license_communication = LicenseCommunication.objects.filter(license=obj.license, actor=obj.actor).last()
        if license_communication:
            return license_communication.get_status_display()
        return None
    
    def get_communication_type(self, obj):
        license_communication = LicenseCommunication.objects.filter(license=obj.license, actor=obj.actor).last()
        if license_communication:
            return license_communication.get_type_display()
        return None


class ActorSerializer(serializers.ModelSerializer):
    type = NameBasedChoiceField(choices=ActorTypeChoices)
    sex = NameBasedChoiceField(choices=SexChoices)
    language = NameBasedChoiceField(choices=LanguageChoices, required=False)
    license_relations = ActorLicenseRelationSerializer(
        many=True, read_only=True
    )
    created_by = serializers.HiddenField(default=serializers.CurrentUserDefault())
    updated_by = serializers.HiddenField(default=serializers.CurrentUserDefault())

    class Meta:
        model = Actor
        fields = [
            "id",
            "full_name",
            "first_name",
            "last_name",
            "type",
            "sex",
            "birth_date",
            "birth_year",
            "language",
            "phone_number1",
            "phone_number2",
            "email",
            "alternative_email",
            "address",
            "co_address",
            "postal_code",
            "city",
            "country",
            "description",
            "license_relations",
            "updated_at",
            "created_by",
            "updated_by",
        ]


class ActorDetailSerializer(ActorSerializer):
    previous_license_relations = ActorLicenseRelationSerializer(
        many=True, read_only=True
    )

    class Meta:
        model = Actor
        fields = [
            *ActorSerializer.Meta.fields,
            "previous_license_relations",
        ]


class ActorViewSet(viewsets.ModelViewSet, ValueListMixin):
    authentication_classes = [SessionAuthentication, BasicAuthentication]
    permission_classes = [DjangoProtectedModelPermissions]

    queryset = Actor.objects.all()
    serializer_class = ActorSerializer
    filter_backends = [filters.SearchFilter, DynamicOrderingFilter, IdSelectionFilter]
    search_fields = [
        "email",
        "alternative_email",
        "full_name",
        "first_name",
        "last_name",
        "city",
        "type_label",
        "license_role_label",
        "license_numbers",
    ]
    pagination_class = StandardResultsSetPagination

    allowed_ordering = DynamicOrderingFilter.include_reverse(
        [
            "full_name",
            "city",
            "country",
            "email",
            "alternative_email",
            "first_name",
            "last_name",
            "type",
            "updated_at",
            "ordering_name",
        ]
    )
    default_ordering = ["full_name", "city", "country"]

    def get_available_value_ids(self):
        return {
            "email": "email",
            "full_name": "full_name",
        }

    def get_queryset(self):
        actor_type_label = models.Case(
            *[
                models.When(type=value, then=models.Value(str(label)))
                for value, label in ActorTypeChoices.choices
            ],
            output_field=models.CharField(),
            default=models.Value(""),
        )

        latest_license_relation = LicenseRelation.objects.filter(
            license__sequence__latest=models.F("license"),
            actor=models.OuterRef("pk"),
        )

        license_role_label = models.Case(
            *[
                models.When(role=value, then=models.Value(str(label)))
                for value, label in LicenseRoleChoices.choices
            ],
            output_field=models.CharField()
        )

        return self.queryset.annotate(
            type_label=actor_type_label,
            ordering_name=Coalesce(
                NullIf(Trim(models.F("last_name")), models.Value("")),
                models.F("full_name"),
            ),
            license_role_label=models.Subquery(
                latest_license_relation.annotate(
                    role_label=license_role_label
                ).values("actor").annotate(
                    roles_string=StringAgg("role_label", delimiter=", ")
                ).values("roles_string")[:1]
            ),
            license_numbers=models.Subquery(
                latest_license_relation.values("actor").annotate(
                    numbers=StringAgg("license__sequence__license_number", delimiter=', ')
                ).values("numbers")[:1]
            ),
        ).all()

    def get_serializer_class(self):
        if self.action == "retrieve":
            return ActorDetailSerializer
        return super().get_serializer_class()
