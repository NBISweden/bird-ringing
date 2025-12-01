from licensing.models import LicenseSequence, License, Actor, ActorTypeChoices, SexChoices, LanguageChoices, LicenseRoleChoices, LicenseRelation

from rest_framework import routers, serializers, viewsets, filters, pagination, response
from django.db import models
import datetime
from collections import OrderedDict


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
    licenses = ActorLicenseRelationSerializer(many=True, read_only=True)
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
            "licenses",
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
    queryset = LicenseSequence.objects.all()
    serializer_class = LicenseSequenceSerializer
    pagination_class = StandardResultsSetPagination


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