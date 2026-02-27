from django.test import TestCase
from django.test import Client
from django.urls import reverse
from licensing.models import (
    Actor,
    License,
    LicenseSequence,
    LicenseRelation,
    LicenseDocument,
    ActorTypeChoices,
    SexChoices,
    LicenseStatusChoices,
    ReportStatusChoices,
    LicenseRoleChoices,
    DocumentTypeChoices,
    LicenseCommunication,
    CommunicationStatusChoices,
)
from .utils import create_user
import datetime
from django.core import mail
from unittest.mock import patch
from licensing.rest import LicenseSequenceViewSet
from licensing.communication_service import CommunicationService
from licensing.license_card_service import LicenseCardService
import io
import zipfile


class _EmailTestBase(TestCase):
    """
    Shared setup + helpers for email batch-sending tests.
    """
    def setUp(self):
        self.client = Client()
        self.user_with_access = create_user(
            "userwithaccess",
            "pwd",
            [
                "change_licensesequence",
                "view_licensesequence",
                "view_actor",
            ]
        )
        self.user_without_access = create_user("userwithoutaccess", "pwd")

        self.actors = [
            Actor.objects.create(
                full_name=name,
                email=f"{name.lower()}@example.com",
                sex=SexChoices.NOT_APPLICABLE,
                type=ActorTypeChoices.STATION,
                created_by=self.user_with_access,
                updated_by=self.user_with_access
            )
            for name in ["Adam", "Bertil", "Carl", "Daniel"]
        ]

        self.license_sequences = [
            LicenseSequence.objects.create(
                mnr=mnr,
                status=LicenseStatusChoices.ACTIVE,
                created_by=self.user_with_access,
                updated_by=self.user_with_access,
            )
            for mnr in ["0001", "0002", "0003", "0004"]
        ]

        self.licenses = [
            License.objects.create(
                sequence=seq,
                version=0,
                report_status=ReportStatusChoices.YES,
                starts_at=datetime.date.today(),
                ends_at=datetime.date.today(),
                created_by=self.user_with_access,
                updated_by=self.user_with_access,
            )
            for seq in self.license_sequences
        ]

        for (actor, lic) in zip(self.actors, self.licenses):
            LicenseRelation.objects.create(
                actor=actor,
                license=lic,
                role=LicenseRoleChoices.RINGER,
                mednr="R001",
                created_by=self.user_with_access,
                updated_by=self.user_with_access,
            )
        for (actor, lic) in zip(self.actors, reversed(self.licenses)):
            LicenseRelation.objects.create(
                actor=actor,
                license=lic,
                role=LicenseRoleChoices.ASSOCIATE_RINGER,
                mednr="H001",
                created_by=self.user_with_access,
                updated_by=self.user_with_access,
            )

    def _license_name(self, lic, actor):
        return f"{lic.sequence.mnr}-{actor.id}-test.pdf"

    def _add_license_documents(self, actors, licenses):
        for (actor, lic) in zip(actors, licenses):
            LicenseDocument.objects.create(
                is_current=True,
                actor=actor,
                license=lic,
                reference=self._license_name(lic, actor),
                data=b"b44df00d",
                type=DocumentTypeChoices.LICENSE,
                created_by=self.user_with_access,
                updated_by=self.user_with_access,
            )
        for (actor, lic) in zip(actors, reversed(licenses)):
            LicenseDocument.objects.create(
                is_current=True,
                actor=actor,
                license=lic,
                reference=self._license_name(lic, actor),
                data=b"b44df00d",
                type=DocumentTypeChoices.LICENSE,
                created_by=self.user_with_access,
                updated_by=self.user_with_access,
            )

    def _with_access(self):
        self.client.login(username="userwithaccess", password="pwd")


class LicenseDocumentEmailTests(_EmailTestBase):
    def test_fail_when_missing_license_documents(self):
        self._with_access()
        test_mnr = "0002"
        url = self._send_mail_url([test_mnr], True)
        response = self.client.put(url)
        self.assertEqual(response.status_code, 400)
        self.assertEqual(
            {"detail": f"No license card document available for {test_mnr}:R001"}, 
            response.json(),
            "The action fails if there are missing documents"
        )

    def test_successful_email(self):
        self._add_license_documents(self.actors, self.licenses)
        self._with_access()
        url = self._send_mail_url(["0001", "0002"], True)
        response = self.client.put(url)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            {
                "messages_sent": 4,
                "failed_messages": [],
                "skipped_messages": [],
            }, 
            response.json(),
            "All licenses are prepared and sent"
        )
    
    def test_send_only_to_actors_with_email(self):
        self.actors[0].email = ""
        self.actors[0].save()
        self._add_license_documents(self.actors, self.licenses)
        self._with_access()
        url = self._send_mail_url(["0001", "0002"], True)
        response = self.client.put(url)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            {
                "messages_sent": 3,
                "failed_messages": [],
                "skipped_messages": [
                    {
                        "actor_id": self.actors[0].id,
                        "mnr": "0001",
                        "reason": "missing_email",
                    }
                ],
            }, 
            response.json(),
            "Users without email are ignored when batch sending"
        )

    def test_message_content(self):
        self._add_license_documents(self.actors, self.licenses)
        self._with_access()
        url = self._send_mail_url([lic.sequence.mnr for lic in self.licenses], True)
        response = self.client.put(url)
        self.assertEqual(response.status_code, 200)
        today_str = str(datetime.date.today())

        actor_license_combos = list(zip([*self.actors, *self.actors], [*self.licenses, *reversed(self.licenses)]))
        self.assertEqual(
            sorted([
                message.body
                for message in mail.outbox
            ]),
            sorted([
                f"{lic.sequence.mnr} {actor.full_name} {today_str}  license: {self._license_name(lic, actor)}"
                for (actor, lic) in actor_license_combos
            ]),
            "Make sure that the basic message content follows the given template"
        )

        self.assertEqual(
            sorted([
                (alternative.content, alternative.mimetype)
                for message in mail.outbox
                for alternative in message.alternatives
            ]),
            sorted([
                (
                    f"<em>{lic.sequence.mnr}</em> <em>{actor.full_name}</em> <em>{today_str}</em><ul><li>license: {self._license_name(lic, actor)}</li></ul>",
                    "text/html"
                )
                for (actor, lic) in actor_license_combos
            ]),
            "Make sure that the html message follows the given template"
        )

        self.assertEqual(
            sorted([
                [(filename, mimetype) for (filename, _data, mimetype) in message.attachments]
                for message in mail.outbox
            ], key=lambda a: a[0]),
            sorted([
                [(self._license_name(lic, actor), "application/pdf")]
                for (actor, lic) in actor_license_combos
            ], key=lambda a: a[0]),
            "Make sure that the license documents are attached"
        )
    
    def test_fail_with_no_mnrs(self):
        self._add_license_documents(self.actors, self.licenses)
        self._with_access()
        url = self._send_mail_url([], True)
        response = self.client.put(url)
        self.assertEqual(response.status_code, 400)
        self.assertEqual(
            {"mnrs": "mnrs is required (comma-separated)."},
            response.json(),
        )
    
    def test_fail_with_bad_mnrs(self):
        self._add_license_documents(self.actors, self.licenses)
        self._with_access()
        test_mnr = "1337"
        url = self._send_mail_url([test_mnr], True)
        response = self.client.put(url)
        self.assertEqual(response.status_code, 400)
        self.assertEqual(
            {"mnrs": f"Unknown mnr(s): {test_mnr}"},
            response.json(),
        )
    
    def test_communication_log_was_added(self):
        self._add_license_documents(self.actors, self.licenses)
        self._with_access()
        url = self._send_mail_url([lic.sequence.mnr for lic in self.licenses], True)
        response = self.client.put(url)
        self.assertEqual(response.status_code, 200)
        
        for (actor, lic) in zip(self.actors, self.licenses):
            self.assertEqual(
                1,
                LicenseCommunication.objects.filter(actor=actor, license=lic).count(),
                "Make sure that there is exactly one communication object per actor and license combination."
            )
            communications = LicenseCommunication.objects.order_by("created_at").filter(actor=actor, license=lic)
            
            for communication in communications:
                self.assertEqual(
                    communication.note,
                    "E-mail with license sent"
                )
                self.assertEqual(
                    communication.status,
                    CommunicationStatusChoices.SENT
                )

    def _send_mail_url(self, mnrs: list[str], include_card: bool = False, include_permit = False):
        params = [
            *(["include_card"] if include_card else []),
            *(["include_permit"] if include_permit else [])
        ]
        return reverse("licensesequence-send-license-emails") + f"?mnrs={','.join(mnrs)}&{'&'.join(params)}"

class LicenseDocumentEmailSelectedActorsTests(_EmailTestBase):
    # We patch get_queryset() to a plain queryset for these tests to avoid postgres specific anotations
    # like StringAgg(distinct=True) that fail with sqlite.
    @staticmethod
    def _plain_licensesequence_queryset(_self):
        return LicenseSequence.objects.all()

    def test_success_only_selected_actor_ids(self):
        self._add_license_documents(self.actors, self.licenses)
        self._with_access()

        license_obj = next(lic for lic in self.licenses if lic.sequence.mnr == "0002")
        selected_actor_ids = [self.actors[1].id, self.actors[2].id]

        url = self._send_mail_url_for_actors(mnr=license_obj.sequence.mnr, actor_ids=selected_actor_ids, include_card=True)
        with patch.object(LicenseSequenceViewSet, "get_queryset", self._plain_licensesequence_queryset):
            resp = self.client.put(url)

        self.assertEqual(resp.status_code, 200)
        self.assertEqual(
            {
                "messages_sent": 2,
                "failed_messages": [],
                "skipped_messages": [],
            },
            resp.json(),
        )

        self.assertEqual(2, LicenseCommunication.objects.filter(license=license_obj).count())
        self.assertEqual(sorted(LicenseCommunication.objects.filter(license=license_obj).values_list("actor_id", flat=True)),
            sorted(selected_actor_ids),
        )
        self.assertEqual(2, len(mail.outbox))

    def test_fail_if_actor_not_on_license(self):
        self._add_license_documents(self.actors, self.licenses)
        self._with_access()

        license_obj = next(lic for lic in self.licenses if lic.sequence.mnr == "0002")
        invalid_actor_id = self.actors[0].id

        url = self._send_mail_url_for_actors(mnr=license_obj.sequence.mnr, actor_ids=[invalid_actor_id], include_card=True)
        with patch.object(LicenseSequenceViewSet, "get_queryset", self._plain_licensesequence_queryset):
            resp = self.client.put(url)

        self.assertEqual(resp.status_code, 400)
        self.assertEqual({"detail": f"Actor(s) not on license: {invalid_actor_id}."}, resp.json())
        self.assertEqual(0, len(mail.outbox))
        self.assertEqual(0, LicenseCommunication.objects.filter(license=license_obj).count())

    def test_fail_when_actor_ids_missing(self):
        self._add_license_documents(self.actors, self.licenses)
        self._with_access()

        license_obj = next(lic for lic in self.licenses if lic.sequence.mnr == "0002")

        url = f"/api/license_sequence/{license_obj.sequence.mnr}/send-license-emails/?include_card"
        with patch.object(LicenseSequenceViewSet, "get_queryset", self._plain_licensesequence_queryset):
            resp = self.client.put(url)

        self.assertEqual(resp.status_code, 400)
        self.assertEqual({"actor_ids": "actor_ids is required (comma-separated)."}, resp.json())

    def _send_mail_url_for_actors(self, *, mnr: str, actor_ids: list[int],
        include_card: bool = False,
        include_permit: bool = False,
    ) -> str:
        params = [
            f"actor_ids={','.join(str(actor_id) for actor_id in actor_ids)}",
            *(["include_card"] if include_card else []),
            *(["include_permit"] if include_permit else []),
        ]
        query = "&".join(params)
        return f"/api/license_sequence/{mnr}/send-license-emails/?{query}"

class LicenseDocumentEmailNotifyRingerTests(_EmailTestBase):
    @staticmethod
    def _plain_licensesequence_queryset(_self):
        return LicenseSequence.objects.all()

    def test_notify_ringer_sends_bundle_email(self):
        self._with_access()

        license_obj = next(lic for lic in self.licenses if lic.sequence.mnr == "0002")
        helper_actor = self.actors[2]
        ringer_actor = self.actors[1]

        # Create license-card documents using the service to match production expectations
        card_service = LicenseCardService()
        card_service.get_or_create_license_card_document(lic=license_obj, actor=helper_actor, created_by=self.user_with_access, updated_by=self.user_with_access)
        card_service.get_or_create_license_card_document(lic=license_obj, actor=ringer_actor, created_by=self.user_with_access, updated_by=self.user_with_access)

        url = self._send_mail_url_for_actors(mnr=license_obj.sequence.mnr, actor_ids=[helper_actor.id], include_card=True, notify_ringer=True)

        with patch.object(LicenseSequenceViewSet, "get_queryset", self._plain_licensesequence_queryset):
            resp = self.client.put(url)

        self.assertEqual(resp.status_code, 200)
        self.assertEqual(
            {
                "messages_sent": 1,
                "failed_messages": [],
                "skipped_messages": [],
                "ringer_bundle_message": "sent",
            },
            resp.json(),
        )

        # helper + ringer bundle
        self.assertEqual(2, len(mail.outbox))

        bundle_messages = [msg for msg in mail.outbox if msg.to == [ringer_actor.email]]
        self.assertEqual(1, len(bundle_messages))

        bundle_msg = bundle_messages[0]
        self.assertEqual(1, len(bundle_msg.attachments))

        filename, data, mimetype = bundle_msg.attachments[0]
        self.assertTrue(filename.endswith("-helpers-documents.zip"))
        self.assertEqual("application/zip", mimetype)

        with zipfile.ZipFile(io.BytesIO(data), "r") as zf:
            names = zf.namelist()

        self.assertGreaterEqual(len(names), 1)

    def test_notify_ringer_reports_failure(self):
        self._with_access()

        license_obj = next(lic for lic in self.licenses if lic.sequence.mnr == "0002")
        helper_actor = self.actors[2]
        ringer_actor = self.actors[1]

        card_service = LicenseCardService()
        card_service.get_or_create_license_card_document(lic=license_obj, actor=helper_actor, created_by=self.user_with_access, updated_by=self.user_with_access)

        url = self._send_mail_url_for_actors(mnr=license_obj.sequence.mnr, actor_ids=[helper_actor.id], include_card=True, notify_ringer=True)

        original_send = CommunicationService.send_email_messages

        def send_side_effect(self, messages, *args, **kwargs):
            if kwargs.get("try_message") == "Tried to send ringer bundle e-mail":
                return [{"to": [ringer_actor.email], "details": "SMTP failed"}]
            return original_send(self, messages, *args, **kwargs)

        with (
            patch.object(LicenseSequenceViewSet, "get_queryset", self._plain_licensesequence_queryset),
            patch.object(CommunicationService, "send_email_messages", new=send_side_effect),
        ):
            resp = self.client.put(url)

        self.assertEqual(resp.status_code, 422)
        self.assertEqual(
            {
                "messages_sent": 1,
                "failed_messages": [],
                "skipped_messages": [],
                "ringer_bundle_failed_messages": [{"to": [ringer_actor.email], "details": "SMTP failed"}],
            },
            resp.json(),
        )

    def test_notify_ringer_fails_if_ringer_missing_email(self):
        self._with_access()

        license_obj = next(lic for lic in self.licenses if lic.sequence.mnr == "0002")
        helper_actor = self.actors[2]
        ringer_actor = self.actors[1]

        card_service = LicenseCardService()
        card_service.get_or_create_license_card_document(lic=license_obj, actor=helper_actor, created_by=self.user_with_access, updated_by=self.user_with_access)

        ringer_actor.email = ""
        ringer_actor.save(update_fields=["email"])

        url = self._send_mail_url_for_actors(mnr=license_obj.sequence.mnr, actor_ids=[helper_actor.id], include_card=True, notify_ringer=True)

        with patch.object(LicenseSequenceViewSet, "get_queryset", self._plain_licensesequence_queryset):
            resp = self.client.put(url)

        self.assertEqual(resp.status_code, 400)
        self.assertEqual(
            {
                "messages_sent": 1,
                "failed_messages": [],
                "skipped_messages": [],
                "detail": f"No email address available for ringer on license {license_obj.sequence.mnr}.",
            },
            resp.json(),
        )

    def _send_mail_url_for_actors(self, *, mnr: str, actor_ids: list[int], include_card: bool = False, include_permit: bool = False, notify_ringer: bool = False) -> str:
        params = [
            f"actor_ids={','.join(str(actor_id) for actor_id in actor_ids)}",
            *(["include_card"] if include_card else []),
            *(["include_permit"] if include_permit else []),
            *(["notify_ringer"] if notify_ringer else []),
        ]
        query = "&".join(params)
        return f"/api/license_sequence/{mnr}/send-license-emails/?{query}"