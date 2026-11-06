from django.test import TestCase
from licensing.models import (
    Actor,
    ActorTypeChoices,
    SexChoices,
    LicenseSequence,
    LicenseStatusChoices,
    License,
    ReportStatusChoices,
    LicenseRelation,
    LicenseRoleChoices
)
from licensing.rest.license_sequence_view import LicenseSequenceViewSet
from .utils import create_user
import datetime


class TestValueListFetchers(TestCase):
    def setUp(self):
        self.user = create_user("user", "pwd")
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
        self.sequences = [
            LicenseSequence.objects.create(
                license_number=license_number,
                status=LicenseStatusChoices.ACTIVE,
                created_by=self.user,
                updated_by=self.user
            )
            for license_number in ["0000", "0001"]
        ]
        self.licenses = [
            License.objects.create(
                sequence=sequence,
                version=0,
                report_status=ReportStatusChoices.YES,
                starts_at=datetime.date.today(),
                ends_at=datetime.date.today(),
                created_by=self.user,
                updated_by=self.user,
            )
            for sequence in self.sequences
        ]

        for lic_idx, lic in enumerate(self.licenses):
            for actor_idx, actor in enumerate(self.actors):
                LicenseRelation.objects.create(
                    license=lic,
                    actor=actor,
                    associate_number=str(actor_idx + 1).rjust(4, "0"),
                    role=(
                        LicenseRoleChoices.RINGER
                        if lic_idx == actor_idx
                        else LicenseRoleChoices.ASSOCIATE_RINGER
                    ),
                    created_by=self.user,
                    updated_by=self.user,
                )
        
        for sequence in self.sequences:
            sequence.commit(sequence.current)
    
    def test_license_sequence__get_holder(self):
        holders = list(LicenseSequenceViewSet.get_holder(LicenseSequence.objects.all()))
        self.assertEqual(
            holders,
            [
                ("0000", [{"email": "adam@example.com", "full_name": "Adam"}]),
                ("0001", [{"email": "bertil@example.com", "full_name": "Bertil"}]),
            ]
        )
    
    def test_license_sequence__get_max_associate_number(self):
        holders = list(LicenseSequenceViewSet.get_max_associate_number(LicenseSequence.objects.all()))
        self.assertEqual(
            holders,
            [
                ("0000", 4),
                ("0001", 4),
            ]
        )