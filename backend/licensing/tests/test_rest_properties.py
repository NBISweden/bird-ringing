from django.test import TestCase
from rest_framework.test import APIClient
from licensing.models import (
    Actor,
    LicensePermissionType,
    LicensePermissionProperty,
    ActorTypeChoices,
    SexChoices,
)
from .utils import create_user


class RestPropertiesTests(TestCase):
    def setUp(self):
        self.client = APIClient(HTTP_ACCEPT_LANGUAGE="en")
        self.user_with_access = create_user(
            "userwithaccess",
            "pwd",
            [
                "view_licensepermissiontype",
                "view_licensepermissionproperty",
                "view_actor",
            ]
        )
        self.user_without_access = create_user("userwithoutaccess", "pwd")

    def test_actor_endpoint(self):
        for name in ["Adam", "Bertil", "Carl", "Daniel"]:
            Actor.objects.create(
                full_name=name,
                email=f"{name.lower()}@example.com",
                sex=SexChoices.UNDISCLOSED,
                type=ActorTypeChoices.PERSON,
                created_by=self.user_with_access,
                updated_by=self.user_with_access
            )
        self._test_endpoint("/api/property/actor/")

        items = self._test_endpoint("/api/property/actor/?search=adam")
        self.assertEqual(len(items), 1, "only one matching actor should be included")

    def test_permission_type_endpoint(self):
        for name in ["A", "B", "C"]:
            LicensePermissionType.objects.create(
                name=name,
                description=f"Description {name}",
                created_by=self.user_with_access,
                updated_by=self.user_with_access
            )
        self._test_endpoint("/api/property/permission_type/")

        items = self._test_endpoint("/api/property/permission_type/?search=b")
        self.assertEqual(len(items), 1, "only one matching permission type should be included")


    def test_permission_property_endpoint(self):
        [ptA, ptB, ptC] = [
            LicensePermissionType.objects.create(
                name=name,
                description=f"Description {name}",
                created_by=self.user_with_access,
                updated_by=self.user_with_access
            )
            for name in ["A", "B", "C"]
        ]
        for name in ["has-1", "has-2", "has-3"]:
            LicensePermissionProperty.objects.create(
                name=name,
                description=f"Description {name}",
                created_by=self.user_with_access,
                updated_by=self.user_with_access
            )
        for (name, related_type) in [("has-4-A", ptA), ("has-5-B", ptB), ("has-6-C", ptC)]:
            LicensePermissionProperty.objects.create(
                name=name,
                description=f"Description {name}",
                related_type=related_type,
                created_by=self.user_with_access,
                updated_by=self.user_with_access
            )

        items = self._test_endpoint("/api/property/permission_property/")
        for item in items:
            self.assertTrue("related_type" in item, "item should have a related_type")
            related_type = item["related_type"]
            if related_type is not None:
                self.assertTrue("id" in related_type, "related_type should have an id")
        
        items = self._test_endpoint("/api/property/permission_property/?search=has-5-b")
        self.assertEqual(len(items), 1, "only one matching permission property should be included")
    
    def test_choice_field_endpoints(self):
        endpoints = [
            "/api/property/actor_type/",
            "/api/property/sex/",
            "/api/property/language/",
            "/api/property/report_status/",
            "/api/property/report_type/",
            "/api/property/license_role/",
            "/api/property/license_status/",
        ]

        for endpoint in endpoints:
            self._test_endpoint(endpoint)

    def _test_endpoint(self, endpoint: str):
        self._with_access()
        response = self.client.get(endpoint, format="json")
        self.assertEqual(response.status_code, 200, "response should be ok")

        items = response.json()
        self.assertEqual(type(items), list, "result should be a list")
        self.assertGreater(len(items), 0)
        for item in items:
            self.assertTrue("id" in item, "item should have an id")
            self.assertTrue("label" in item, "item should have a label")
        
        return items

    def _with_access(self):
        self.client.login(username="userwithaccess", password="pwd")