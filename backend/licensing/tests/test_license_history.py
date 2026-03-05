from django.test import TestCase
from .utils import create_user, create_permission
from licensing import models
import datetime


class TestLicenseHistory(TestCase):
    def setUp(self):
        self.user = create_user(
            "user",
            "pwd",
        )

        self.license_sequence = models.LicenseSequence.objects.create(
            mnr="0001",
            status=models.LicenseStatusChoices.ACTIVE,
            created_by=self.user,
            updated_by=self.user,
        )
        starts_at = "2026-02-01"
        ends_at = "2026-11-01"
        current = models.License.objects.create(
            sequence=self.license_sequence,
            created_by=self.user,
            updated_by=self.user,
            version=0,
            location="",
            description="",
            report_status=models.ReportStatusChoices.YES, # How do we handle report status when we are using this history?
            starts_at=starts_at,
            ends_at=ends_at,
        )

        self.permission_types = [
            models.LicensePermissionType.objects.create(
                name=pt,
                created_by=self.user,
                updated_by=self.user,
            )
            for pt in ["permission-a", "permission-b"]
        ]

        self.permission_properties = [
            models.LicensePermissionProperty.objects.create(
                name=pp,
                created_by=self.user,
                updated_by=self.user,
            )
            for pp in ["property-a", "property-b"]
        ]

        self.species = [
            models.Species.objects.create(
                name=species,
                created_by=self.user,
                updated_by=self.user,
            )
            for species in ["species-a", "species-b"]
        ]

        self.permissions = [
            create_permission(
                current,
                permission_type,
                self.permission_properties,
                self.species,
                self.user,
                starts_at,
                ends_at,
            )
            for permission_type in self.permission_types
        ]
        self.reference_docs = [
            models.LicenseDocument.objects.create(
                type=models.DocumentTypeChoices.DOCUMENT,
                reference=ref,
                created_by=self.user,
                updated_by=self.user,
                is_permanent=True,
            )
            for ref in ["a", "b", "c"]
        ]
        license_docs = [
            models.LicenseDocument.objects.create(
                type=models.DocumentTypeChoices.LICENSE,
                reference=ref,
                is_permanent=False,
                created_by=self.user,
                updated_by=self.user,
            )
            for ref in ["a", "b", "c"]
        ]
        current.documents.set([
            *self.reference_docs,
            *license_docs,
        ])

    def test_commit_initial_latest(self):
        self.assertEqual(self.license_sequence.latest, None)

        latest = self.license_sequence.commit(self.license_sequence.current)
        self.assertNotEqual(latest.version, 0)

        self.assertEqual(latest, self.license_sequence.latest)
        self.assertEqual(self.license_sequence.current.dump(), latest.dump())
    
    def test_commit_only_when_updated(self):
        current = self.license_sequence.current
        previous = self.license_sequence.commit(current)
        latest = self.license_sequence.commit(current)

        self.assertEqual(previous.version, latest.version)

        current.description = "updated"
        current.save()
        latest = self.license_sequence.commit(current)
        self.assertNotEqual(previous.version, latest.version)

    def test_license_dump(self):
        starts_at = datetime.date(year=2026, month=2, day=1)
        ends_at = datetime.date(year=2026, month=11, day=1)
        self.assertEqual(
            self.license_sequence.current.dump(),
            (
                (1,),
                (
                    "",
                    "",
                    starts_at,
                    ends_at,
                    set((doc.id  for doc in self.reference_docs)),
                    {
                        (1, "", "", starts_at, ends_at, (1, 2), (1, 2)),
                        (2, "", "", starts_at, ends_at, (1, 2), (1, 2))
                    }
                )
            )
        )
        
