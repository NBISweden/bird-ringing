from django.test import TestCase
from licensing.rest.core import (
    LicensePermissionSerializer,
    LicenseSerializer,
    LicenseActorRelationSerializer,
    LicenseSequenceSerializer
)
from licensing.models import (
    Actor,
    LicensePermissionType,
    LicensePermissionProperty,
    ActorTypeChoices,
    SexChoices,
    Species,
    LicenseSequence,
    LicenseStatusChoices,
    License,
    ReportStatusChoices,
)
from django.test.client import RequestFactory
from .utils import create_user
from rest_framework.exceptions import ValidationError
import datetime


class TestSerializers(TestCase):
    def setUp(self):
        self.user = create_user("user", "pwd")
        self.request_factory = RequestFactory()
        self.actors = [
            Actor.objects.create(
                full_name=name,
                email=f"{name.lower()}@example.com",
                sex=SexChoices.UNDISCLOSED,
                type=ActorTypeChoices.PERSON,
                created_by=self.user,
                updated_by=self.user
            )
            for name in ["Adam", "Bertil", "Carl", "Daniel"]
        ]
        self.permission_type = LicensePermissionType.objects.create(
            name="PermissionType",
            created_by=self.user,
            updated_by=self.user
        )
        self.permission_property = LicensePermissionProperty.objects.create(
            name="PermissionProperty",
            created_by=self.user,
            updated_by=self.user
        )
        self.species = Species.objects.create(
            name="Species",
            scientific_code="code",
            created_by=self.user,
            updated_by=self.user
        )
        self.sequence = LicenseSequence.objects.create(
            mnr="0000",
            status=LicenseStatusChoices.ACTIVE,
            created_by=self.user,
            updated_by=self.user
        )
    
    def test_permission_serializer_success(self):
        permission_serializer = LicensePermissionSerializer(
            data={
                "type": {"id": self.permission_type.id},
                "properties": [
                    {"id": self.permission_property.id}
                ],
                "species_list": [
                    {"id": self.species.id}
                ],
            },
            context=self._get_context()
        )
        license = License.objects.create(
            sequence=self.sequence,
            version=0,
            report_status=ReportStatusChoices.YES,
            starts_at=datetime.date.today(),
            ends_at=datetime.date.today(),
            created_by=self.user,
            updated_by=self.user,
        )
        permission_serializer.is_valid(raise_exception=True)
        permission_serializer.save(license=license)

    def test_license_actor_relation_serializer(self):
        good_data = {
            "actor": {"id": self.actors[0].id},
            "role": "ringer",
            "mednr": "0001"
        }
        relation_serializer = LicenseActorRelationSerializer(
            data=good_data,
            context=self._get_context()
        )
        relation_serializer.is_valid(raise_exception=True)

        license = License.objects.create(
            sequence=self.sequence,
            version=0,
            report_status=ReportStatusChoices.YES,
            starts_at=datetime.date.today(),
            ends_at=datetime.date.today(),
            created_by=self.user,
            updated_by=self.user,
        )
        relation_serializer.save(license=license)

    def test_license_serializer_success(self):
        license_serializer = LicenseSerializer(
            data=self._good_license_data(),
            context=self._get_context(),
        )
        license_serializer.is_valid(raise_exception=True)
        license_serializer.save(sequence=self.sequence)
    
    def test_license_serializer_partial_success(self):
        license = License.objects.create(
            sequence=self.sequence,
            version=0,
            report_status=ReportStatusChoices.YES,
            starts_at=datetime.date.today(),
            ends_at=datetime.date.today(),
            created_by=self.user,
            updated_by=self.user,
        )
        license_serializer = LicenseSerializer(
            instance=license,
            data=self._good_license_data(),
            context=self._get_context(),
            partial=True,
        )
        license_serializer.is_valid(raise_exception=True)
        license_serializer.save(sequence=self.sequence)
    
    def test_license_serializer_partial_error(self):
        license = License.objects.create(
            sequence=self.sequence,
            version=0,
            report_status=ReportStatusChoices.YES,
            starts_at=datetime.date.today(),
            ends_at=datetime.date.today(),
            created_by=self.user,
            updated_by=self.user,
        )
        license_serializer = LicenseSerializer(
            instance=license,
            data={
                **self._good_license_data(),
                "actors": [{
                    "actor": {"id": self.actors[0].id},
                    "mednr": "0001",
                }]
            },
            context=self._get_context(),
            partial=True,
        )
        result = None
        try:
            license_serializer.is_valid(raise_exception=True)
        except ValidationError as e:
            result = e.get_codes()

        self.assertEqual(
            result,
            {"actors": [{"role": ["required"]}]},
            "expect relation to be invalid due to missing role"
        )
    
    def test_license_serializer_errors(self):
        good_data = self._good_license_data()
        entries = [
            *self._shared_error_cases(),
            (
                "expect fields to be missing",
                {},
                {
                    "location": ["required"],
                    "report_status": ["required"],
                    "starts_at": ["required"],
                    "ends_at": ["required"],
                }
            ),
            (
                "expect dates to be invalid",
                {
                    **good_data,
                    "starts_at": "2026-00-01",
                    "ends_at": "2026-13-31",
                },
                {
                    "starts_at": ["invalid"],
                    "ends_at": ["invalid"],
                }
            ),
        ]
        for message, data, expected_result in entries:
            with self.subTest(message):
                license_serializer = LicenseSerializer(
                    data=data,
                    context=self._get_context()
                )
                result = None
                try:
                    license_serializer.is_valid(raise_exception=True)
                except ValidationError as e:
                    result = e.get_codes()

                self.assertEqual(result, expected_result, message)

    def test_license_sequence_serializer(self):
        sequence_serializer = LicenseSequenceSerializer(
            data=self._good_sequence_data(),
            context=self._get_context(),
        )
        sequence_serializer.is_valid(raise_exception=True)
        sequence_serializer.save()
    
    def test_license_sequence_serializer_errors(self):
        entries = [
            (message, self._good_sequence_data({"latest": data}), {"latest": expected_result})
            for message, data, expected_result in self._shared_error_cases()
        ]
        License.objects.create(
            sequence=self.sequence,
            version=0,
            report_status=ReportStatusChoices.YES,
            starts_at=datetime.date.today(),
            ends_at=datetime.date.today(),
            created_by=self.user,
            updated_by=self.user,
        )
        for message, data, expected_result in entries:
            with self.subTest(message):
                sequence_serializer = LicenseSequenceSerializer(
                    instance=self.sequence,
                    data=data,
                    partial=True,
                    context=self._get_context()
                )
                result = None
                try:
                    sequence_serializer.is_valid(raise_exception=True)
                    sequence_serializer.save()
                except ValidationError as e:
                    result = e.get_codes()

                self.assertEqual(result, expected_result, message)
    
    def test_license_sequence_partial_serializer(self):
        License.objects.create(
            sequence=self.sequence,
            version=0,
            report_status=ReportStatusChoices.YES,
            starts_at=datetime.date.today(),
            ends_at=datetime.date.today(),
            created_by=self.user,
            updated_by=self.user,
        )
        sequence_serializer = LicenseSequenceSerializer(
            instance=self.sequence,
            data={"status": "paused", "latest": {"report_status": "no"}},
            context=self._get_context(),
            partial=True,
        )
        sequence_serializer.is_valid(raise_exception=True)
        sequence_serializer.save()
        self.assertEqual(self.sequence.latest.report_status, ReportStatusChoices.NO)
        self.assertEqual(self.sequence.status, LicenseStatusChoices.PAUSED)

    def _good_sequence_data(self, override={}):
        return {
            "mnr": "0001",
            "status": "active",
            "latest": self._good_license_data(),
            **override
        }

    def _good_license_data(self, override={}):
        return {
            "location": "Location",
            "report_status": "yes",
            "starts_at": "2026-01-01",
            "ends_at": "2026-12-31",
            "permissions": [{
                "type": {"id": self.permission_type.id},
                "period": [
                    "2026-01-01",
                    "2026-12-31"
                ],
                "properties": [
                    {"id": self.permission_property.id}
                ],
                "species_list": [
                    {"id": self.species.id}
                ],
            }],
            "actors": [
                {
                    "actor": {"id": actor.id},
                    "role": role,
                    "mednr": str(index).rjust(4, "0")
                }
                for index, (actor, role) in enumerate(zip(self.actors, ["ringer", "associate_ringer", "communication", "affiliate"]))
            ],
            **override
        }
    
    def _shared_error_cases(self):
        good_data = self._good_license_data()
        return [
            (
                "expect actor and mednr to trigger invalid fields due to duplicates",
                {
                    **good_data,
                    "actors": [
                        *good_data["actors"],
                        {
                            "actor": {"id": self.actors[0].id},
                            "role": "ringer",
                            "mednr": "0001"
                        }
                    ]
                },
                {
                    "actors": [
                        {"actor": ["invalid"]},
                        {"mednr": ["invalid"]},
                        {},
                        {},
                        {"actor": ["invalid"], "mednr": ["invalid"]}
                    ]
                }
            ),
            (
                "expect permission period to be invalid",
                {
                    **good_data,
                    "permissions": [{
                        "type": {"id": self.permission_type.id},
                        "period": [
                            "2026-12-31"
                            "2026-01-01",
                        ],
                        "properties": [],
                        "species_list": [],
                    }]
                },
                {
                    "permissions": [{
                        "period": {0: ["invalid"]}
                    }]
                }
            ),
            (
                "expect actor id to be invalid",
                {
                    **good_data,
                    "actors": [
                        {
                            "actor": {},
                            "role": "ringer",
                            "mednr": "0001"
                        }
                    ]
                },
                {
                    "actors": [
                        {"actor": {"id": "invalid"}},
                    ]
                }
            ),
            (
                "expect role to be missing",
                {
                    **good_data,
                    "actors": [
                        {
                            "actor": {"id": self.actors[0].id},
                            "mednr": "0001"
                        }
                    ]
                },
                {
                    "actors": [
                        {"role": ["required"]},
                    ]
                }
            ),
            (
                "expect mednr to be too short",
                {
                    **good_data,
                    "actors": [
                        {
                            "actor": {"id": self.actors[0].id},
                            "role": "ringer",
                            "mednr": "BAD"
                        },
                    ]
                },
                {
                    "actors": [
                        {"mednr": ["min_length"]},
                    ]
                }
            ),
            (
                "expect permission type to be missing",
                {
                    **good_data,
                    "permissions": [{
                        "properties": [],
                        "species_list": [],
                    }],
                },
                {
                    "permissions": [
                        {"type": ["required"]},
                    ]
                }
            ),
        ]
    
    def _get_context(self):
        request = self.request_factory.patch("/data")
        request.user = self.user
        return {
            "request": request
        }