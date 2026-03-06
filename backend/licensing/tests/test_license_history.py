from django.test import TestCase
from .utils import create_user, create_permission
from licensing import models
import datetime
from licensing.utils import default_document_copy_policy


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

        self.actors = [
            models.Actor.objects.create(
                full_name=f"{actor} actor",
                email=f"{actor.lower()}@example.com",
                sex=models.SexChoices.NOT_APPLICABLE,
                type=models.ActorTypeChoices.STATION,
                created_by=self.user,
                updated_by=self.user
            )
            for actor in ["a", "b", "c"]
        ]
        for index, actor in enumerate(self.actors):
            models.LicenseRelation.objects.create(
                actor=actor,
                license=current,
                mednr=str(index).zfill(4),
                role=models.LicenseRoleChoices.RINGER,
                created_by=self.user,
                updated_by=self.user
            )

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
                reference=f"license-{actor.full_name}",
                is_permanent=False,
                created_by=self.user,
                updated_by=self.user,
                actor=actor
            )
            for actor in self.actors
        ]
        permit_docs = [
            models.LicenseDocument.objects.create(
                type=models.DocumentTypeChoices.PERMIT,
                reference=f"permit-{actor.full_name}",
                is_permanent=False,
                created_by=self.user,
                updated_by=self.user,
                actor=actor
            )
            for actor in self.actors
        ]
        current.documents.set([
            *self.reference_docs,
            *license_docs,
            *permit_docs,
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
    
    def test_post_commit(self):
        current = self.license_sequence.current
        current.documents.set(list(current.documents.filter(is_permanent=True)))

        first_commit = self.license_sequence.commit(current, default_document_copy_policy)

        license_docs = [
            models.LicenseDocument.objects.create(
                type=models.DocumentTypeChoices.LICENSE,
                reference=f"l1-{actor.full_name}",
                is_permanent=False,
                created_by=self.user,
                updated_by=self.user,
                actor=actor
            )
            for actor in self.actors
        ]
        permit_docs = [
            models.LicenseDocument.objects.create(
                type=models.DocumentTypeChoices.PERMIT,
                reference=f"p1-{actor.full_name}",
                is_permanent=False,
                created_by=self.user,
                updated_by=self.user,
                actor=actor
            )
            for actor in self.actors
        ]
        first_commit.documents.add(*license_docs, *permit_docs)

        # Change only state
        current.report_status = models.ReportStatusChoices.NO
        current.save()

        second_commit = self.license_sequence.commit(current, default_document_copy_policy)
        self.assertEqual(
            set(second_commit.documents.values_list("id", flat=True)),
            set(first_commit.documents.values_list("id", flat=True)),
            "Expect all documents to be carried over from previous version"
        )

        # Change content
        current.description = current.description + "-change"
        current.save()
        third_commit = self.license_sequence.commit(current, default_document_copy_policy)
        self.assertEqual(
            set(third_commit.documents.values_list("id", flat=True)),
            set(second_commit.documents.filter(
                type__in={models.DocumentTypeChoices.LICENSE, models.DocumentTypeChoices.DOCUMENT}
            ).values_list("id", flat=True)),
            "Expect only permanent and LICENSE documents to be carried over from previous version"
        )

        # Change state and remove actors
        current.report_status = models.ReportStatusChoices.NO
        current.actors.all().delete()
        fourth_commit = self.license_sequence.commit(current, default_document_copy_policy)
        self.assertEqual(
            set(fourth_commit.documents.values_list("reference", flat=True)),
            set(third_commit.documents.filter(is_permanent=True).values_list("reference", flat=True)),
            "Expect all non permanent documents related to actors to be removed"
        )
    
    def test_actor_changes(self):
        current = self.license_sequence.current
        first_commit = self.license_sequence.commit(current, default_document_copy_policy)
        self.assertNotEqual(current, first_commit, "Expect current and first_commit to be different objects")
        self.assertTrue(first_commit.actors.count() != 0)
        self.assertEqual(
            set(first_commit.actors.values_list("actor__full_name", "mednr")),
            set(current.actors.values_list("actor__full_name", "mednr")),
            "Expect actor list to be the same, for first_commit, as on current"
        )

        current.actors.all().delete()
        second_commit = self.license_sequence.commit(current, default_document_copy_policy)
        self.assertNotEqual(current, second_commit, "Expect current and first_commit to be different objects")
        self.assertEqual(
            set(second_commit.actors.values_list("actor__full_name", "mednr")),
            set(current.actors.values_list("actor__full_name", "mednr")),
            "Expect actor list to be the same, for second_commit, as on current"
        )

        models.LicenseRelation.objects.create(
            actor=self.actors[0],
            license=current,
            mednr="R001",
            role=models.LicenseRoleChoices.RINGER,
            created_by=self.user,
            updated_by=self.user
        )
        third_commit = self.license_sequence.commit(current, default_document_copy_policy)
        self.assertNotEqual(current, third_commit, "Expect current and first_commit to be different objects")
        self.assertTrue(third_commit.actors.count() == 1)
        self.assertEqual(
            set(third_commit.actors.values_list("actor__full_name", "mednr")),
            set(current.actors.values_list("actor__full_name", "mednr")),
            "Expect actor list to be the same, for third_commit, as on current"
        )


    def test_license_dump(self):
        starts_at = datetime.date(year=2026, month=2, day=1)
        ends_at = datetime.date(year=2026, month=11, day=1)
        self.assertEqual(
            self.license_sequence.current.dump(),
            (
                (
                    1,
                    {
                        (2, "0001", 1),
                        (3, "0002", 1),
                        (1, "0000", 1)
                    }
                ),
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
        
