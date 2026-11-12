from django.contrib.auth.models import User
from django.core.files.uploadedfile import SimpleUploadedFile
from django.urls import reverse
from rest_framework.test import APITestCase

from licensing.models import (
    License,
    LicenseDocument,
    LicenseSequence,
    LicenseStatusChoices,
    ReportStatusChoices,
    DocumentTypeChoices,
)


class LicenseDocumentUploadTests(APITestCase):

    def setUp(self):
        self.user = User.objects.create_superuser(
            username="testuser",
            email="test@example.com",
            password="testpassword",
        )

        self.client.force_authenticate(user=self.user)

        self.sequence = LicenseSequence.objects.create(
            license_number="0001",
            status=LicenseStatusChoices.ACTIVE,
            created_by=self.user,
            updated_by=self.user,
        )

        self.license = License.objects.create(
            sequence=self.sequence,
            version=0,
            report_status=ReportStatusChoices.NO,
            starts_at="2026-01-01",
            ends_at="2026-12-31",
            created_by=self.user,
            updated_by=self.user,
        )

        self.sequence.latest = self.license
        self.sequence.save()

        self.url = reverse(
            "licensesequence-document-upload",
            kwargs={"license_number": self.sequence.license_number},
        )

    def test_upload_document_without_actor(self):
        file_content = b"%PDF-1.4 test document content"

        uploaded_file = SimpleUploadedFile(
            "test-document.pdf",
            file_content,
            content_type="application/pdf",
        )

        response = self.client.post(
            self.url,
            {"file": uploaded_file},
            format="multipart",
        )

        self.assertEqual(response.status_code, 201)

        self.assertEqual(LicenseDocument.objects.count(), 1)

        document = LicenseDocument.objects.get()

        # Document belongs to the correct license sequence
        self.assertEqual(
            document.license_sequence,
            self.sequence,
        )

        # Actor should be optional
        self.assertIsNone(document.actor)

        # Document should be permanent
        self.assertTrue(document.is_permanent)

        # Filename should be stored as reference
        self.assertEqual(
            document.reference,
            "test-document.pdf",
        )

        # Filetype should be stored as "document"
        self.assertEqual(
            document.type,
            DocumentTypeChoices.DOCUMENT,
        )

        # File contents should be saved
        self.assertEqual(
            bytes(document.data),
            file_content,
        )

        # Document should be linked to the license
        self.assertTrue(
            self.license.documents.filter(
                pk=document.pk
            ).exists()
        )

        # Verify response
        self.assertEqual(
            response.data["id"],
            document.pk,
        )
