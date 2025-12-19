from licensing.models import (
    LicenseSequence,
    License,
    Actor,
    ActorTypeChoices,
    SexChoices,
    LanguageChoices,
    LicenseRoleChoices,
    LicenseRelation,
    ReportStatusChoices,
    LicensePermission,
    LicensePermissionType,
    LicenseStatusChoices,
)

from rest_framework import routers, serializers, viewsets, filters, pagination, response
from django.contrib.postgres.aggregates import StringAgg
from django.db import models
from django.db.models import Q, Case, When, Value, CharField, DateField, Max
from collections import OrderedDict


def parse_csv_string(csv_str: str):
    return [v.strip() for v in csv_str.split(",")]


class IdSelectionFilter(filters.BaseFilterBackend):
    """
    Filter that allows filtering on object ids
    """

    def filter_queryset(self, request, queryset, view):
        id_filter_target = getattr(view, "id_filter_target", "id")
        id_filter_max = getattr(view, "id_filter_max", 100)

        filter_ids = set(
            [id for id in parse_csv_string(request.GET.get("ids", "")) if id]
        )

        if len(filter_ids) > id_filter_max:
            raise serializers.ValidationError(
                {
                    "ids": f"Too many ids in list {len(filter_ids)}. Maximum limit is {id_filter_max}"
                }
            )

        if len(filter_ids) > 0:
            filter = {f"{id_filter_target}__in": filter_ids}
            return queryset.filter(**filter)
        else:
            return queryset


class DynamicOrderingFilter(filters.BaseFilterBackend):
    """
    Filter that allows dynamic user controlled ordering
    """

    def filter_queryset(self, request, queryset, view):
        default_ordering = getattr(view, "default_ordering", [])
        base_allowed_ordering = getattr(view, "allowed_ordering", [])
        allowed_ordering = set(base_allowed_ordering)
        order_by = [
            o
            for o in parse_csv_string(request.GET.get("ordering", ""))
            if o in allowed_ordering
        ]
        order_by = order_by if len(order_by) > 0 else default_ordering
        return queryset.order_by(*order_by)

    @staticmethod
    def include_reverse(items: list[str]):
        return [f"{d}{o}" for o in items for d in ["", "-"]]


class StandardResultsSetPagination(pagination.PageNumberPagination):
    page_size = 100
    page_size_query_param = "page_size"
    max_page_size = 1000

    def get_paginated_response(self, data):
        return response.Response(
            OrderedDict(
                [
                    ("count", self.page.paginator.count),
                    (
                        "num_pages",
                        self.page.paginator.num_pages,
                    ),  # Add total number of pages
                    ("next", self.get_next_link()),
                    ("previous", self.get_previous_link()),
                    ("results", data),
                ]
            )
        )


class ActorLicenseRelationSerializer(serializers.ModelSerializer):
    role = serializers.ChoiceField(
        choices=LicenseRoleChoices, source="get_role_display"
    )

    class Meta:
        model = LicenseRelation
        fields = ["license_id", "role", "mnr", "mednr"]


class ActorSerializer(serializers.ModelSerializer):
    type = serializers.ChoiceField(choices=ActorTypeChoices, source="get_type_display")
    sex = serializers.ChoiceField(choices=SexChoices, source="get_sex_display")
    language = serializers.ChoiceField(
        choices=LanguageChoices, source="get_language_display"
    )
    current_license_relations = ActorLicenseRelationSerializer(
        many=True, read_only=True
    )

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
    language = serializers.ChoiceField(
        choices=LanguageChoices, source="get_language_display"
    )

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
    role = serializers.ChoiceField(
        choices=LicenseRoleChoices, source="get_role_display"
    )

    class Meta:
        model = LicenseRelation
        fields = ["actor", "role", "mednr"]

class LicensePermissionTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = LicensePermissionType
        fields = ['name']

class LicenseLicensePermissionSerializer(serializers.ModelSerializer):
    type = LicensePermissionTypeSerializer(read_only=True)

    class Meta:
        model = LicensePermission
        fields = ["type"]

class LicenseSerializer(serializers.ModelSerializer):
    actors = LicenseActorRelationSerializer(many=True, read_only=True)
    report_status = serializers.ChoiceField(choices=ReportStatusChoices, source="get_report_status_display")

    class Meta:
        model = License
        fields = ["actors", "version", "location", "description", "report_status"]


class LicenseSequenceSerializer(serializers.HyperlinkedModelSerializer):
    current = LicenseSerializer(read_only=True)
    license_holder = serializers.CharField()
    status = serializers.ChoiceField(choices=LicenseStatusChoices, source="get_status_display")
    methods = serializers.CharField()
    last_email_sent_at = serializers.DateTimeField()

    class Meta:
        model = LicenseSequence
        fields = ["mnr", "current", "status", "license_holder", "methods", "last_email_sent_at"]

    def create(self, validated_data):
        # TODO: Implement real function
        raise RuntimeError(f"create: {validated_data}")

    def update(self, instance, validated_data):
        # TODO: Implement real function
        raise RuntimeError(f"update: {validated_data}")


class LicenseSequenceViewSet(viewsets.ModelViewSet):
    # TODO: override get_object in order to select instances using date insteade of primary key
    lookup_field = "mnr"
    queryset = LicenseSequence.objects.all().distinct().order_by("mnr")
    serializer_class = LicenseSequenceSerializer
    pagination_class = StandardResultsSetPagination

    def get_queryset(self):
        queryset = super().get_queryset()

        search = self.request.query_params.get('search', None)

        queryset = queryset.annotate(
            license_holder=StringAgg(Case(
                When(instances__actors__role=Value(1), then='instances__actors__actor__full_name'),
                default=Value(None),
                output_field=CharField()
            ), delimiter=', ', distinct=True),
            methods=StringAgg('instances__permissions__type__name', delimiter=', ', distinct=True),
            last_email_sent_at=Max(Case(
                When(instances__communication__status=Value(1), then='instances__communication__updated_at'),
                default=Value(None),
                output_field=DateField()
            )),
        )

        if search is not None:
            search_terms = search.split()
            for term in search_terms:
                queryset = queryset.filter(
                Q(license_holder__icontains=term)
                |
                Q(mnr__icontains=term)
                |
                Q(methods__icontains=term)
                |
                Q(last_email_sent_at__icontains=term)
                )

        return queryset

actor_type_label = models.Case(
    *[
        models.When(type=value, then=models.Value(label))
        for value, label in ActorTypeChoices.choices
    ],
    output_field=models.CharField(),
    default=models.Value(""),
)


license_role_label = models.Case(
    *[
        models.When(
            models.Q(licenses__role=value, licenses__license__version=0),
            then=models.Value(label),
        )
        for value, label in LicenseRoleChoices.choices
    ],
    output_field=models.CharField(),
    default=models.Value(""),
)

license_mnr = models.Case(
    models.When(
        models.Q(licenses__license__version=0),
        then=models.F("licenses__license__sequence__mnr"),
    ),
    output_field=models.CharField(),
    default=models.Value(""),
)


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
        "license_mnr",
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
        ]
    )
    default_ordering = ["full_name", "city", "country"]

router = routers.DefaultRouter()
router.register(r"license_sequence", LicenseSequenceViewSet)
router.register(r"actor", ActorViewSet)
