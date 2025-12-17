from licensing.models import LicenseSequence, License, Actor, ActorTypeChoices, SexChoices, LanguageChoices, LicenseRoleChoices, LicenseRelation

from rest_framework import routers, serializers, viewsets, filters, pagination, response
from django.contrib.postgres.aggregates import StringAgg
from django.db import models
import datetime
from collections import OrderedDict


class DynamicOrderingFilter(filters.BaseFilterBackend):
    """
    Filter that allows dynamic user controlled filtering
    """
    def filter_queryset(self, request, queryset, view):
        default_ordering = getattr(view, "default_ordering", [])
        base_allowed_ordering = getattr(view, "allowed_ordering", [])
        allowed_ordering = set(base_allowed_ordering)
        order_by = [
            o
            for o in self._parse_csv_string(request.GET.get("ordering", ""))
            if o in allowed_ordering
        ]
        print(order_by)
        order_by = order_by if len(order_by) > 0 else default_ordering
        return queryset.order_by(*order_by)

    def _parse_csv_string(self, csv_str: str):
        return [v.strip() for v in csv_str.split(",")]
    
    @staticmethod
    def include_reverse(items: list[str]):
        return [f"{d}{o}" for o in items for d in ["", "-"]]


class StandardResultsSetPagination(pagination.PageNumberPagination):
    page_size = 100
    page_size_query_param = "page_size"
    max_page_size = 1000

    def get_paginated_response(self, data):
        return response.Response(OrderedDict([
            ('count', self.page.paginator.count),
            ('num_pages', self.page.paginator.num_pages),  # Add total number of pages
            ('next', self.get_next_link()),
            ('previous', self.get_previous_link()),
            ('results', data)
        ]))


class ActorLicenseRelationSerializer(serializers.ModelSerializer):
    role = serializers.ChoiceField(choices=LicenseRoleChoices, source="get_role_display")
    class Meta:
        model = LicenseRelation
        fields = ["license_id", "role", "mnr", "mednr"]


class ActorSerializer(serializers.ModelSerializer):
    type = serializers.ChoiceField(choices=ActorTypeChoices, source="get_type_display")
    sex = serializers.ChoiceField(choices=SexChoices, source="get_sex_display")
    language = serializers.ChoiceField(choices=LanguageChoices, source="get_language_display")
    current_license_relations = ActorLicenseRelationSerializer(many=True, read_only=True)
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
            "current_license_relations",
            "updated_at",
        ]


class LicenseActorSerializer(serializers.ModelSerializer):
    type = serializers.ChoiceField(choices=ActorTypeChoices, source="get_type_display")
    sex = serializers.ChoiceField(choices=SexChoices, source="get_sex_display")
    language = serializers.ChoiceField(choices=LanguageChoices, source="get_language_display")
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
        ]


class LicenseActorRelationSerializer(serializers.ModelSerializer):
    actor = LicenseActorSerializer()
    role = serializers.ChoiceField(choices=LicenseRoleChoices, source="get_role_display")
    class Meta:
        model = LicenseRelation
        fields = ["actor", "role", "mednr"]


class LicenseSerializer(serializers.ModelSerializer):
    actors = LicenseActorRelationSerializer(many=True, read_only=True)
    class Meta:
        model = License
        fields = ["actors", "version", "location", "description", "report_status"]


class LicenseSequenceSerializer(serializers.HyperlinkedModelSerializer):
    current = LicenseSerializer(read_only=True)

    class Meta:
        model = LicenseSequence
        fields = ["mnr", "current", "status"]

    def create(self, validated_data):
        # TODO: Implement real function
        raise RuntimeError(f"create: {validated_data}")

    def update(self, instance, validated_data):
        # TODO: Implement real function
        raise RuntimeError(f"update: {validated_data}")


class LicenseSequenceViewSet(viewsets.ModelViewSet):
    # TODO: override get_object in order to select instances using date insteade of primary key
    lookup_field = "mnr"
    queryset = LicenseSequence.objects.all().order_by('mnr')
    serializer_class = LicenseSequenceSerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ["mnr"]
    pagination_class = StandardResultsSetPagination


actor_type_label = models.Case(
    *[
        models.When(type=value, then=models.Value(label))
        for value, label in ActorTypeChoices.choices
    ],
    output_field=models.CharField(),
    default=models.Value("")
)


license_role_label = models.Case(
    *[
        models.When(models.Q(licenses__role=value, licenses__license__version=0), then=models.Value(label))
        for value, label in LicenseRoleChoices.choices
    ],
    output_field=models.CharField(),
    default=models.Value("")
)

license_mnr = models.Case(
    models.When(
        models.Q(licenses__license__version=0),
        then=models.F("licenses__license__sequence__mnr"),
    ),
    output_field=models.CharField(),
    default=models.Value("")
)


email_listing = models.Case(
    models.When(
        ~(models.Q(email="") | models.Q(email__isnull=True)),
        then=models.functions.Concat(models.F("full_name"), models.Value(" <"), models.F("email"), models.Value(">"), output_field=models.CharField()),
    ),
    output_field=models.CharField(),
    default=None
)


class ActorPropertyViewSet(viewsets.ViewSet):
    allowed_properties = {
        "email",
        "alternative_email",
        "full_name",
        "email_listing",
    }

    def list(self, request):
        property = request.GET.get("property")

        if property is None or property not in self.allowed_properties:
            raise serializers.ValidationError({"property": "Include a valid property"})

        ids = set(
            [
                id.strip()
                for id in request.GET.get("ids").split(",")
            ]
            if "ids" in request.GET
            else []
        )

        if len(ids) == 0:
            raise serializers.ValidationError({"ids": "Include atleast 1 id"})

        items = Actor.objects.annotate(email_listing=email_listing).filter(id__in=ids).values_list(property, flat=True)

        return response.Response([
            item
            for item in items
            if item is not None
        ])


class ActorViewSet(viewsets.ModelViewSet):
    queryset = Actor.objects.annotate(
        type_label=actor_type_label,
        license_role_label=StringAgg(
            license_role_label,
            delimiter=", ",
            distinct=True,
        ),
        license_mnr=StringAgg(
            license_mnr,
            delimiter=", ",
            distinct=True,
        ),
    ).all()
    serializer_class = ActorSerializer
    filter_backends = [filters.SearchFilter, DynamicOrderingFilter]
    search_fields = [
        "email",
        "alternative_email",
        "full_name",
        "first_name",
        "last_name",
        "city",
        "type_label",
        "license_role_label",
        "license_mnr",
    ]
    pagination_class = StandardResultsSetPagination

    allowed_ordering = DynamicOrderingFilter.include_reverse(
        ["full_name", "city", "country", "email", "alternative_email", "first_name", "last_name", "type", "updated_at"]
    )
    default_ordering = ["full_name", "city", "country"]


router = routers.DefaultRouter()
router.register(r"license_sequence", LicenseSequenceViewSet)
router.register(r"actor", ActorViewSet)
router.register(r"actor_property", ActorPropertyViewSet, basename="actor_property")
