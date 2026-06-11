from django.test import TestCase
from rest_framework.test import APIClient

from licensing.models import (
    License,
    LicenseSequence,
    LicenseStatusChoices,
    ReportStatusChoices,
    Actor,
    SexChoices,
    ActorTypeChoices,
)

from .utils import create_user


class LicenseSequenceUpdateTests(TestCase):
    def setUp(self):
        self.client = APIClient(HTTP_ACCEPT_LANGUAGE="en")
        self.user_with_access = create_user(
            "userwithaccess",
            "pwd",
            [
                "view_licensesequence",
                "add_licensesequence",
                "change_licensesequence",
            ],
        )
        self.user_without_access = create_user("userwithoutaccess", "pwd")

        self.actors = [
            Actor.objects.create(
                full_name=name,
                first_name=name,
                email=f"{name.lower()}@example.com",
                sex=SexChoices.UNDISCLOSED,
                type=ActorTypeChoices.PERSON,
                created_by=self.user_with_access,
                updated_by=self.user_with_access
            )
            for name in ["Adam", "Bertil", "Carl", "Daniel"]
        ]

    def test_license_sequence_create(self):
        payload = self._license_sequence_payload()

        self._with_access()

        response = self.client.post(
            "/api/license_sequence/",
            data=payload,
            format="json",
        )

        self.assertEqual(
            response.status_code,
            201,
            "Adding a new license sequence should succeed.",
        )

        created = response.json()

        self.assertEqual(created["mnr"], payload["mnr"])
        self.assertEqual(created["status"], payload["status"])
        self.assertEqual(created["latest"]["location"], payload["latest"]["location"])
        self.assertEqual(created["latest"]["description"], payload["latest"]["description"])
        self.assertEqual(created["latest"]["report_status"], payload["latest"]["report_status"])
        self.assertEqual(created["latest"]["starts_at"], payload["latest"]["starts_at"])
        self.assertEqual(created["latest"]["ends_at"], payload["latest"]["ends_at"])
        self.assertEqual(created["latest"]["version"], 1)

        sequence = LicenseSequence.objects.get(mnr="1234")
        self.assertIsNotNone(sequence.latest)
        self.assertEqual(sequence.latest.version, 1)
        self.assertEqual(sequence.latest.location, "Test location")
    
    def test_license_sequence_create_with_empty_description(self):
        payload = self._license_sequence_payload(description="")

        self._with_access()

        response = self.client.post(
            "/api/license_sequence/",
            data=payload,
            format="json",
        )

        self.assertEqual(
            response.status_code,
            201,
            "Adding a new license sequence should succeed.",
        )

        sequence = LicenseSequence.objects.get(mnr="1234")
        self.assertIsNotNone(sequence.latest)
        self.assertEqual(sequence.latest.version, 1)
        self.assertEqual(sequence.latest.description, "")

    def test_license_sequence_update(self):
        sequence = self._create_license_sequence(mnr="1234")

        self._with_access()

        update = {
            "mnr": "1234",
            "status": "paused",
            "latest": {
                "location": "New location",
                "description": "New description",
                "report_status": "incomplete",
                "starts_at": "2026-02-01",
                "ends_at": "2026-11-30",
            },
        }

        update_response = self.client.put(
            "/api/license_sequence/1234/",
            data=update,
            format="json",
        )

        self.assertEqual(
            update_response.status_code,
            200,
            "Updating license sequence data should succeed.",
        )

        updated = update_response.json()

        self.assertEqual(updated["mnr"], "1234")
        self.assertEqual(updated["status"], "paused")
        self.assertEqual(updated["latest"]["location"], "New location")
        self.assertEqual(updated["latest"]["description"], "New description")
        self.assertEqual(updated["latest"]["report_status"], "incomplete")
        self.assertEqual(updated["latest"]["starts_at"], "2026-02-01")
        self.assertEqual(updated["latest"]["ends_at"], "2026-11-30")
        self.assertEqual(updated["latest"]["version"], 2)

        sequence.refresh_from_db()
        sequence.latest.refresh_from_db()

        self.assertEqual(sequence.status, LicenseStatusChoices.PAUSED)
        self.assertEqual(sequence.latest.location, "New location")
        self.assertEqual(sequence.latest.description, "New description")
        self.assertEqual(sequence.latest.report_status, ReportStatusChoices.INCOMPLETE)

    def test_license_sequence_create_fail(self):
        test_cases = [
            (
                {
                    "mnr": "1234",
                    "status": "non_valid_status",
                    "latest": {
                        "location": "Test location",
                        "description": "Test description",
                        "report_status": "yes",
                        "starts_at": "2026-01-01",
                        "ends_at": "2026-12-31",
                    },
                },
                {
                    "status": ["Choice, 'non_valid_status', is not valid."]
                },
            ),
            (
                {
                    "mnr": "1234",
                    "status": "active",
                    "latest": {
                        "location": "Test location",
                        "description": "Test description",
                        "report_status": "non_valid_report_status",
                        "starts_at": "2026-01-01",
                        "ends_at": "2026-12-31",
                    },
                },
                {
                    "latest": {
                        "report_status": [
                            "Choice, 'non_valid_report_status', is not valid."
                        ]
                    }
                },
            ),
            (
                {
                    "status": "active",
                    "latest": {
                        "location": "Test location",
                        "description": "Test description",
                        "report_status": "yes",
                        "starts_at": "2026-01-01",
                        "ends_at": "2026-12-31",
                    },
                },
                {
                    "mnr": ["This field is required."]
                },
            ),
            (
                {
                    "mnr": "123",
                    "status": "active",
                    "latest": {
                        "location": "Test location",
                        "description": "Test description",
                        "report_status": "yes",
                        "starts_at": "2026-01-01",
                        "ends_at": "2026-12-31",
                    },
                },
                {
                    "mnr": [
                        "Ensure this field has at least 4 characters."
                    ]
                },
            ),
        ]

        self._with_access()

        for payload, expected_error in test_cases:
            response = self.client.post(
                "/api/license_sequence/",
                data=payload,
                format="json",
            )

            self.assertEqual(
                response.status_code,
                400,
                "Adding invalid license sequence should fail.",
            )
            self.assertEqual(response.json(), expected_error)

    def test_license_sequence_access(self):
        test_cases = [
            (
                "post",
                "/api/license_sequence/",
                self._license_sequence_payload(mnr="1234"),
            ),
            (
                "put",
                "/api/license_sequence/5678/",
                self._license_sequence_payload(
                    mnr="5678",
                    location="Updated location",
                ),
            ),
        ]

        self._create_license_sequence(mnr="5678")

        for method, path, payload in test_cases:
            with self.subTest(method=method, path=path):
                self._without_access()

                response = getattr(self.client, method)(
                    path,
                    data=payload,
                    format="json",
                )

                self.assertEqual(response.status_code, 403)
    
    def test_license_actor_relations_update(self):
        mnr="0001"
        payload = self._license_sequence_payload(mnr=mnr)

        self._with_access()
        response = self.client.post(
            "/api/license_sequence/",
            data=payload,
            format="json",
        )

        self.assertEqual(
            response.status_code,
            201,
            "Adding a new license sequence should succeed.",
        )

        update = {
            "latest": {
                "description": "updated description",
                "actors": [
                    {"actor": {"id": str(self.actors[0].id)}, "role": "ringer", "mednr": "0000"},
                    {"actor": {"id": str(self.actors[1].id)}, "role": "associate_ringer", "mednr": "0001"},
                    {"actor": {"id": str(self.actors[2].id)}, "role": "affiliate", "mednr": "0002"},
                    {"actor": {"id": str(self.actors[3].id)}, "role": "communication", "mednr": "0003"}
                ]
            }
        }
        response = self.client.patch(
            f"/api/license_sequence/{mnr}/",
            data=update,
            format="json"
        )
        self.assertEqual(response.status_code, 200, "Updating license sequence data should succeed.")

        sequence = LicenseSequence.objects.filter(mnr=mnr).get()
        self.assertEqual(sequence.latest.version, 2)
        self.assertEqual(sequence.latest.actors.count(), 4)
        self.assertEqual(sequence.latest.description, "updated description")

    def _with_access(self):
        self.client.login(username="userwithaccess", password="pwd")

    def _without_access(self):
        self.client.login(username="userwithoutaccess", password="pwd")

    def _create_license_sequence(self, mnr="1234"):
        sequence = LicenseSequence.objects.create(
            mnr=mnr,
            status=LicenseStatusChoices.ACTIVE,
            latest=None,
            created_by=self.user_with_access,
            updated_by=self.user_with_access,
        )

        current_license = License.objects.create(
            sequence=sequence,
            version=0,
            location="Old location",
            description="Old description",
            report_status=ReportStatusChoices.YES,
            starts_at="2026-01-01",
            ends_at="2026-12-31",
            created_by=self.user_with_access,
            updated_by=self.user_with_access,
        )

        sequence.commit(current_license)
        sequence.refresh_from_db()

        return sequence

    def _license_sequence_payload(
        self,
        mnr="1234",
        location="Test location",
        description="Test description",
    ):
        payload = {
            "mnr": mnr,
            "status": "active",
            "latest": {
                "location": location,
                "description": description,
                "report_status": "yes",
                "starts_at": "2026-01-01",
                "ends_at": "2026-12-31",
            },
        }

        return payload