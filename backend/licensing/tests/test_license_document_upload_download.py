from django.contrib.auth.models import User
from django.core.files.uploadedfile import SimpleUploadedFile
from django.urls import reverse
from rest_framework.test import APITestCase
from rest_framework import status
from licensing.models import (
    License,
    LicenseDocument,
    LicenseSequence,
    LicenseStatusChoices,
    ReportStatusChoices,
    DocumentTypeChoices,
)
from licensing.utils import default_document_copy_policy


class LicenseDocumentUploadDownloadTests(APITestCase):

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

    def test_upload_accepts_supported_file_signatures(self):
        cases = [
            ("document.pdf", b"%PDF-1.4\nTest document\n", status.HTTP_201_CREATED),
            ("image.jpg", b"\xff\xd8\xff\xe0est", status.HTTP_201_CREATED),
            ("image.png", b"\x89PNG\r\n\x1a\n" + b"test", status.HTTP_201_CREATED),
            ("invalid.pdf", b"plain text", status.HTTP_400_BAD_REQUEST),
        ]

        for filename, file_data, expected_status in cases:
            with self.subTest(filename=filename):
                uploaded_file = SimpleUploadedFile(
                    filename,
                    file_data,
                    content_type="application/octet-stream",
                )
    
                response = self.client.post(
                    self.url,
                    {"file": uploaded_file},
                    format="multipart",
                )
    
                self.assertEqual(response.status_code, expected_status, response.data)
                self.assertEqual(
                    LicenseDocument.objects.filter(
                        license_sequence=self.sequence,
                        reference=filename,
                    ).exists(),
                    expected_status == status.HTTP_201_CREATED,
                    )    

    def test_download_serves_pdf(self):
        file_data = b"%PDF-1.4\nTest document\n"
        document = LicenseDocument.objects.create(
            license_sequence=self.sequence,
            actor=None,
            is_permanent=True,
            type=DocumentTypeChoices.DOCUMENT,
            reference="test-document.pdf",
            data=file_data,
            created_by=self.user,
            updated_by=self.user,
        )
        self.license.documents.add(document)

        response = self.client.get(
            f"/api/license_sequence/{self.sequence.license_number}/"
            f"document-download/{document.pk}/"
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response["Content-Type"], "application/pdf")
        self.assertEqual(
            response["Content-Disposition"],
            'inline; filename="test-document.pdf"',
        )
        self.assertEqual(b"".join(response.streaming_content), file_data)

    def test_download_returns_404_when_document_is_not_linked_to_latest(self):
        document = LicenseDocument.objects.create(
            license_sequence=self.sequence,
            actor=None,
            is_permanent=True,
            type=DocumentTypeChoices.DOCUMENT,
            reference="unlinked.pdf",
            data=b"%PDF-1.4\nTest document\n",
            created_by=self.user,
            updated_by=self.user,
        )

        response = self.client.get(
            f"/api/license_sequence/{self.sequence.license_number}/"
            f"document-download/{document.pk}/"
        )

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)


    def test_uploaded_document_remains_after_license_update(self):
        # Create a committed license version so current and latest differ
        self.sequence.commit(self.license, default_document_copy_policy)
        self.sequence.refresh_from_db()

        self.assertNotEqual(
            self.sequence.current.pk,
            self.sequence.latest.pk,
        )

        uploaded_file = SimpleUploadedFile(
            "test-document.pdf",
            b"%PDF-1.4\nTest document\n",
            content_type="application/pdf",
        )

        response = self.client.post(
            self.url,
            {"file": uploaded_file},
            format="multipart",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        document_id = response.data["id"]

        # The uploaded document must belong to the current license
        self.assertTrue(
            self.sequence.current.documents.filter(pk=document_id).exists()
        )

        # And the latest committed license
        self.sequence.refresh_from_db()
        self.assertTrue(
            self.sequence.latest.documents.filter(pk=document_id).exists()
        )

        # Make an edit
        update_url = reverse(
            "licensesequence-detail",
            kwargs={"license_number": self.sequence.license_number},
        )

        response = self.client.patch(
            update_url,
            {"latest": {"description": "Updated description"}},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.sequence.refresh_from_db()

        self.assertEqual(
            self.sequence.latest.description,
            "Updated description",
        )

        # The uploaded document must still exist on latest
        self.assertTrue(
            self.sequence.latest.documents.filter(pk=document_id).exists()
        )

    def test_upload_document_keeps_existing_permit(self):
        # Create a committed license version
        self.sequence.commit(self.license, default_document_copy_policy)
        self.sequence.refresh_from_db()

        self.assertNotEqual(
            self.sequence.current.pk,
            self.sequence.latest.pk,
        )

        # Create an existing permit linked to latest
        permit = LicenseDocument.objects.create(
            license_sequence=self.sequence,
            actor=None,
            is_permanent=False,
            type=DocumentTypeChoices.PERMIT,
            reference="existing-permit.pdf",
            data=b"%PDF-1.4\nExisting permit\n",
            created_by=self.user,
            updated_by=self.user,
        )
        self.sequence.latest.documents.add(permit)

        # Upload a new document
        uploaded_file = SimpleUploadedFile(
            "test-document.pdf",
            b"%PDF-1.4\nTest document\n",
            content_type="application/pdf",
        )

        response = self.client.post(
            self.url,
            {"file": uploaded_file},
            format="multipart",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_201_CREATED,
            response.data,
        )

        document_id = response.data["id"]

        self.sequence.refresh_from_db()

        # The uploaded document should exist on current and latest
        self.assertTrue(
            self.sequence.current.documents.filter(pk=document_id).exists()
        )
        self.assertTrue(
            self.sequence.latest.documents.filter(pk=document_id).exists()
        )

        # The existing permit should still be linked to latest
        self.assertTrue(
            self.sequence.latest.documents.filter(pk=permit.pk).exists()
        )


    def test_uploaded_document_remains_after_edit_with_existing_permit(self):
        # Create an existing permanent document
        existing_document = LicenseDocument.objects.create(
            license_sequence=self.sequence,
            actor=None,
            is_permanent=True,
            type=DocumentTypeChoices.DOCUMENT,
            reference="existing-document.pdf",
            data=b"%PDF-1.4\nExisting document\n",
            created_by=self.user,
            updated_by=self.user,
        )
        self.license.documents.add(existing_document)

        # Create a committed license version
        self.sequence.commit(self.license, default_document_copy_policy)
        self.sequence.refresh_from_db()

        # Create an existing permit on latest
        permit = LicenseDocument.objects.create(
            license_sequence=self.sequence,
            actor=None,
            is_permanent=False,
            type=DocumentTypeChoices.PERMIT,
            reference="existing-permit.pdf",
            data=b"%PDF-1.4\nExisting permit\n",
            created_by=self.user,
            updated_by=self.user,
        )
        self.sequence.latest.documents.add(permit)

        # Upload a new PNG document
        uploaded_file = SimpleUploadedFile(
            "screenshot.png",
            b"\x89PNG\r\n\x1a\nTest image",
            content_type="image/png",
        )

        response = self.client.post(
            self.url,
            {"file": uploaded_file},
            format="multipart",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        document_id = response.data["id"]
        self.sequence.refresh_from_db()

        # Both documents and the permit should exist after upload
        self.assertTrue(
            self.sequence.current.documents.filter(pk=document_id).exists()
        )
        self.assertTrue(
            self.sequence.latest.documents.filter(pk=document_id).exists()
        )
        self.assertTrue(
            self.sequence.latest.documents.filter(pk=permit.pk).exists()
        )

        # Edit the license description
        update_url = reverse(
            "licensesequence-detail",
            kwargs={"license_number": self.sequence.license_number},
        )

        response = self.client.patch(
            update_url,
            {"latest": {"description": "Updated description"}},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)

        self.sequence.refresh_from_db()

        # Both permanent documents must remain
        self.assertTrue(
            self.sequence.latest.documents.filter(pk=existing_document.pk).exists()
        )
        self.assertTrue(
            self.sequence.latest.documents.filter(pk=document_id).exists(),
            "The newly uploaded document disappeared after editing the license.",
        )

        # The old permit should not be carried over
        self.assertFalse(
            self.sequence.latest.documents.filter(pk=permit.pk).exists()
        )
