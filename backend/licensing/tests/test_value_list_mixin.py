from datetime import date, timedelta
from licensing.rest.core import ValueListMixin
from licensing.models import PermitDnr
from django.contrib.auth.models import User
from rest_framework import viewsets, serializers
from django.test import TestCase
from rest_framework import filters
from rest_framework.test import APIRequestFactory
import json


class PermitDnrSerializer(serializers.ModelSerializer):
    """
    We need a serializer for the test viewset
    """
    dnr_number = serializers.CharField(read_only=True)
    starts_at = serializers.DateField(read_only=True)
    ends_at = serializers.DateField(read_only=True)
    is_active = serializers.BooleanField(read_only=True)

    class Meta:
        model = PermitDnr
        fields = ["dnr_number", "starts_at", "ends_at", "is_active"]


class PermitDnrViewset(viewsets.ModelViewSet, ValueListMixin):
    """
    We need a viewset for testing the ValueListMixin. PermitDnr is the
    simplest existing model.
    """

    queryset = PermitDnr.objects.all()
    filter_backends = [filters.SearchFilter]
    search_fields = [
        "dnr_number",
        "starts_at",
        "ends_at",
        "is_active",
    ]
    serializer_class = PermitDnrSerializer
    lookup_field = "dnr_number"

    def get_available_value_ids(self):
        return {
            "dnr_number": "dnr_number",
            "starts_at": "starts_at",
            "ends_at": "ends_at",
            "is_active": "is_active",
            "dnr": "dnr_number",
            "summary": PermitDnrViewset.get_summary
        }
    
    @staticmethod
    def get_summary(queryset):
        values = list(queryset.values_list("dnr_number", "starts_at", "ends_at", "is_active"))
        return [
            (dnr, f"{dnr} ({is_active}): from {starts_at} to {ends_at}")
            for (dnr, starts_at, ends_at, is_active) in values
        ]


class ValueListMixinTests(TestCase):
    maxDiff = None
    def setUp(self):
        user = User.objects.create(username="User")
        test_date = date(year=1632, month=11, day=6)
        for i in range(10):
            PermitDnr.objects.create(
                dnr_number=f"{i}".zfill(4),
                starts_at=(test_date + timedelta(days=i)),
                ends_at=(test_date + timedelta(days=i + 1)),
                is_active=bool(i % 2),
                created_by=user,
                updated_by=user,
            )
        
        self.request_factory = APIRequestFactory()
    
    def test_value_list_accepts_filters(self):
        response = self._get_value_list("dnr", {"search": "0000"})
        self.assertEqual(response.status_code, 200)

        self.assertEqual(
            json.loads(response.content),
            {
                "values": {"0000": "0000"},
                "value_id": "dnr"
            }
        )
    
    def test_can_use_function_based_sources(self):
        response = self._get_value_list("summary")
        self.assertEqual(response.status_code, 200)

        items = PermitDnr.objects.all()
        expected_values = {
            i.dnr_number: f"{i.dnr_number} ({i.is_active}): from {i.starts_at} to {i.ends_at}"
            for i in items
        }
        self.assertEqual(
            json.loads(response.content),
            {
                "values": expected_values,
                "value_id": "summary"
            }
        )
    
    def test_can_use_string_based_field_sources(self):
        response = self._get_value_list("starts_at")
        self.assertEqual(response.status_code, 200)

        items = PermitDnr.objects.all()
        expected_values = {
            i.dnr_number: str(i.starts_at)
            for i in items
        }
        self.assertEqual(
            json.loads(response.content),
            {
                "values": expected_values,
                "value_id": "starts_at"
            }
        )
    
    def test_can_use_aliases_for_field_sources(self):
        response = self._get_value_list("dnr")
        self.assertEqual(response.status_code, 200)

        items = PermitDnr.objects.all()
        expected_values = {
            i.dnr_number: i.dnr_number
            for i in items
        }
        self.assertEqual(
            json.loads(response.content),
            {
                "values": expected_values,
                "value_id": "dnr"
            }
        )
    
    def _get_value_list(self, value_id, options=None):
        options = {} if options is None else options
        query_str = "&".join([
            f"{key}={value}"
            for key, value in options.items()
        ])
        request = self.request_factory.get(f"/permit_dnr/value_list/{value_id}/?{query_str}")
        view = PermitDnrViewset.as_view({"get": "value_list"})
        response = view(request, value_id=value_id)
        response.render()
        return response