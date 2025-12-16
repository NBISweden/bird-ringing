from licensing.models import LicenseSequence, License, Actor, ActorTypeChoices, SexChoices, LanguageChoices, LicenseRoleChoices, LicenseRelation, ReportStatusChoices

from rest_framework import routers, serializers, viewsets, filters, pagination, response
from django.db import models
import datetime
from collections import OrderedDict


from django_filters import FilterSet, NumberFilter
from django_filters.rest_framework import DjangoFilterBackend
import re

class LicenseSequenceFilter(FilterSet):
    role = NumberFilter(field_name="instances__actors__role")
    class Meta:
        model = LicenseSequence
        fields = ['role']

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
    report_status = serializers.ChoiceField(choices=ReportStatusChoices, source="get_report_status_display")

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
    queryset = LicenseSequence.objects.all().distinct().order_by('mnr')
    serializer_class = LicenseSequenceSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_class = LicenseSequenceFilter
    search_fields = ['mnr', 'instances__actors__actor__full_name']
    pagination_class = StandardResultsSetPagination

    def get_queryset(self):
        queryset = super().get_queryset()
        role = self.request.query_params.get('role', None)
        search = self.request.query_params.get('search', None)

        if search is not None and role is not None:
            mnr_matches = re.search(r'\b\d{1,4}\b', search)

            if not mnr_matches:
                queryset = queryset.filter(
                    instances__actors__actor__full_name__icontains=search,
                    instances__actors__role=role
                )

        return queryset

class ActorViewSet(viewsets.ModelViewSet):
    # TODO: override get_object in order to select instances using date insteade of primary key
    queryset = Actor.objects.all()
    serializer_class = ActorSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["email", "alternative_email", "full_name", "first_name", "last_name", "city"]
    pagination_class = StandardResultsSetPagination
    ordering = ["full_name", "city", "country"]

router = routers.DefaultRouter()
router.register(r"license_sequence", LicenseSequenceViewSet)
router.register(r"actor", ActorViewSet)