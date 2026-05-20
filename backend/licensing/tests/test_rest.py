from django.test import TestCase
from django.test import Client, override_settings
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
from licensing.message_builder import RingerBundleMessageBuilder
from .utils import create_user, get_fingerprint
import datetime
from django.core import mail
from unittest.mock import patch
from licensing.rest.core import LicenseSequenceViewSet
from licensing.communication_service import CommunicationService
from licensing.license_card_service import LicenseCardService
import io
import zipfile
import tempfile
from pathlib import Path
from django.utils.text import slugify
from django.utils.translation import gettext as _


class _EmailTestBase(TestCase):
    """
    Shared setup + helpers for email batch-sending tests.
    """
    def setUp(self):
        zip_file_suffix = RingerBundleMessageBuilder.parse_bundle_suffix(_("helpers-documents"))
        self.bundle_suffix = f"-{zip_file_suffix}.zip"
        self.client = Client(HTTP_ACCEPT_LANGUAGE="en")
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
                sex=SexChoices.UNDISCLOSED,
                type=ActorTypeChoices.PERSON,
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

        for seq in self.license_sequences:
            License.objects.create(
                sequence=seq,
                version=0,
                report_status=ReportStatusChoices.YES,
                starts_at=datetime.date.today(),
                ends_at=datetime.date.today(),
                created_by=self.user_with_access,
                updated_by=self.user_with_access,
            )

        self.licenses = [
            seq.commit(seq.current)
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
        rel = lic.actors.filter(actor=actor).get()
        mednr = "" if rel.role == LicenseRoleChoices.RINGER else f"-{rel.mednr}"
        return f"license-{lic.sequence.mnr}{mednr}-{slugify(actor.full_name)}.pdf"

    def _add_license_documents(self, actors, licenses):
        for (actor, lic) in zip(actors, licenses):
            lic.documents.add(
                LicenseDocument.objects.create(
                    license_sequence=lic.sequence,
                    actor=actor,
                    reference=self._license_name(lic, actor),
                    data=b"b44df00d",
                    type=DocumentTypeChoices.LICENSE,
                    created_by=self.user_with_access,
                    updated_by=self.user_with_access,
                    is_permanent=False,
                    fingerprint=get_fingerprint(actor.id, lic.id)
                )
            )
        for (actor, lic) in zip(actors, reversed(licenses)):
            lic.documents.add(
                LicenseDocument.objects.create(
                    license_sequence=lic.sequence,
                    actor=actor,
                    reference=self._license_name(lic, actor),
                    data=b"b44df00d",
                    type=DocumentTypeChoices.LICENSE,
                    created_by=self.user_with_access,
                    updated_by=self.user_with_access,
                    is_permanent=False,
                    fingerprint=get_fingerprint(actor.id, lic.id)
                )
            )

    def _with_access(self):
        self.client.login(username="userwithaccess", password="pwd")


@override_settings(COMMUNICATION_LANGUAGE_CODE="en")
class LicenseDocumentEmailTests(_EmailTestBase):
    def test_fail_when_missing_license_documents(self):
        self._with_access()
        test_mnr = "0002"
        url = self._send_mail_url([test_mnr], True)
        response = self.client.put(url)
        self.assertEqual(response.status_code, 400)
        sequence = LicenseSequence.objects.filter(mnr=test_mnr).get()
        actor_relation = sequence.latest.actors.filter(actor=self.actors[2]).get()
        self.assertEqual(
            {"detail": f"No license card document available for: {test_mnr}:{actor_relation.mednr}"},
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
                "ringer_bundle_messages_sent": 2,
            }, 
            response.json(),
            "All licenses are prepared and sent"
        )
    
    def test_send_only_to_actors_with_email(self):
        # We need a non-empty email for the ringer so bundling can still be sent out.
        self.actors[2].email = ""
        self.actors[2].save()
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
                        "actor_id": self.actors[2].id,
                        "mnr": "0002",
                        "reason": "missing_email",
                    }
                ],
                "ringer_bundle_messages_sent": 2,
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
        actor_messages = [
            m for m in mail.outbox
            if not any(filename.endswith(self.bundle_suffix) for (filename, _data, _mimetype) in m.attachments)
        ]

        bundle_messages = [
            m for m in mail.outbox
            if any(filename.endswith(self.bundle_suffix) for (filename, _data, _mimetype) in m.attachments)
        ]

        actor_license_combos = list(zip([*self.actors, *self.actors], [*self.licenses, *reversed(self.licenses)]))
        self.assertEqual(
            sorted([
                message.body
                for message in actor_messages
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
                for message in actor_messages
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
                for message in actor_messages
            ], key=lambda a: a[0]),
            sorted([
                [(self._license_name(lic, actor), "application/pdf")]
                for (actor, lic) in actor_license_combos
            ], key=lambda a: a[0]),
            "Make sure that the license documents are attached"
        )

        # Assert bundle emails exist (one per license in this request)
        self.assertEqual(len(self.licenses), len(bundle_messages), "Expected one ringer bundle e-mail per license.")

        # Assert that all expected documents are included in the bundles (bundle skips ringers)
        card_service = LicenseCardService()
        licenses_by_mnr = {lic.sequence.mnr: lic for lic in self.licenses}
        for msg in bundle_messages:
            self.assertEqual(1, len(msg.attachments))

            zip_filename, data, mimetype = msg.attachments[0]
            self.assertTrue(zip_filename.endswith(self.bundle_suffix))
            self.assertEqual("application/zip", mimetype)

            mnr = zip_filename.split(self.bundle_suffix)[0]
            self.assertIn(mnr, licenses_by_mnr)
            lic = licenses_by_mnr[mnr]

            expected_names = sorted(
                card_service.make_license_card_filename(lic, rel.actor)
                for rel in lic.actors.filter(role=LicenseRoleChoices.ASSOCIATE_RINGER).select_related("actor")
            )

            with zipfile.ZipFile(io.BytesIO(data), "r") as zf:
                names = sorted(zf.namelist())

            self.assertEqual(
                expected_names,
                names,
                f"Unexpected bundle ZIP contents for mnr {mnr}.",
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

    def test_batch_bundle_reports_failure(self):
        self._with_access()
        self._add_license_documents(self.actors, self.licenses)

        url = self._send_mail_url(["0001", "0002"], True)
        original_send = CommunicationService.send_email_messages

        def send_side_effect(self, messages, *args, **kwargs):
            if kwargs.get("try_message") == "Tried to send ringer bundle e-mail":
                return [{"to": ["ringer@example.com"], "details": "SMTP failed"}]
            return original_send(self, messages, *args, **kwargs)

        with patch.object(CommunicationService, "send_email_messages", new=send_side_effect):
            resp = self.client.put(url)

        self.assertEqual(resp.status_code, 422)
        self.assertEqual(
            {
                "messages_sent": 4,
                "failed_messages": [],
                "skipped_messages": [],
                "ringer_bundle_failed_messages": [{"to": ["ringer@example.com"], "details": "SMTP failed"}],
            },
            resp.json(),
        )

    def test_batch_bundle_connect_error(self):
        self._with_access()
        self._add_license_documents(self.actors, self.licenses)

        url = self._send_mail_url(["0001", "0002"], True)
        original_send = CommunicationService.send_email_messages

        def send_side_effect(self, messages, *args, **kwargs):
            if kwargs.get("try_message") == "Tried to send ringer bundle e-mail":
                raise OSError("connection failed")
            return original_send(self, messages, *args, **kwargs)

        with patch.object(CommunicationService, "send_email_messages", new=send_side_effect):
            resp = self.client.put(url)

        self.assertEqual(resp.status_code, 503)

        body = resp.json()
        self.assertEqual(4, body["messages_sent"])
        self.assertEqual([], body["failed_messages"])
        self.assertEqual([], body["skipped_messages"])
        self.assertEqual("Failed to connect to mail server", body["ringer_bundle_error"])

    def test_communication_log_was_added(self):
        self._add_license_documents(self.actors, self.licenses)
        self._with_access()
        url = self._send_mail_url([lic.sequence.mnr for lic in self.licenses], True)
        response = self.client.put(url)
        self.assertEqual(response.status_code, 200)
        
        for (actor, lic) in zip(self.actors, self.licenses):
            expected = 2 if lic.actors.filter(actor=actor, role=LicenseRoleChoices.RINGER).exists() else 1
            self.assertEqual(
                expected,
                LicenseCommunication.objects.filter(actor=actor, license=lic).count(),
                "Make sure that communications are tracked for both individual and bundle e-mails."
            )
            communications = LicenseCommunication.objects.order_by("created_at").filter(actor=actor, license=lic)

            for communication in communications:
                self.assertIn(
                    communication.note,
                    {"E-mail with license sent", "Ringer bundle e-mail sent"},
                )
                self.assertEqual(
                    communication.status,
                    CommunicationStatusChoices.SENT
                )

    def test_batch_include_card_skips_station_ringer_individual_but_sends_bundle(self):
        self._with_access()
        self._add_license_documents(self.actors, self.licenses)

        # Pick one license and make its ringer a STATION
        license = next(lic for lic in self.licenses if lic.sequence.mnr == "0002")
        ringer_rel = license.actors.filter(role=LicenseRoleChoices.RINGER).select_related("actor").get()
        ringer_actor = ringer_rel.actor
        ringer_actor.type = ActorTypeChoices.STATION
        ringer_actor.sex = SexChoices.NOT_APPLICABLE
        ringer_actor.save(update_fields=["type", "sex"])

        url = self._send_mail_url(["0002"], include_card=True)
        resp = self.client.put(url)
        self.assertEqual(resp.status_code, 200)

        body = resp.json()
        # License 0002 has two relations (ringer + associate)
        # Individual emails should be 1 (associate only) if station ringer is skipped.
        self.assertEqual(1, body["messages_sent"])
        self.assertEqual([], body["failed_messages"])
        self.assertEqual([], body["skipped_messages"])

        # Bundle should still be sent
        self.assertEqual(1, body["ringer_bundle_messages_sent"])

        # Verify station ringer did NOT receive an individual email (PDF attachment),
        # but did receive a bundle email (ZIP attachment)
        bundle_msgs = [
            m for m in mail.outbox
            if any(fn.endswith(self.bundle_suffix) for (fn, _data, _mime) in m.attachments)
        ]
        self.assertEqual(1, len(bundle_msgs))
        self.assertEqual([ringer_actor.email], bundle_msgs[0].to)

        individual_msgs = [
            m for m in mail.outbox
            if not any(fn.endswith(self.bundle_suffix) for (fn, _data, _mime) in m.attachments)
        ]
        # Only the associate should get an individual message in this request
        self.assertEqual(1, len(individual_msgs))
        self.assertNotEqual([ringer_actor.email], individual_msgs[0].to)

    def _send_mail_url(self, mnrs: list[str], include_card: bool = False, include_permit = False):
        params = [
            *(["include_card"] if include_card else []),
            *(["include_permit"] if include_permit else [])
        ]
        return reverse("licensesequence-send-license-emails") + f"?mnrs={','.join(mnrs)}&{'&'.join(params)}"

@override_settings(COMMUNICATION_LANGUAGE_CODE="en")
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

    def test_selected_only_station_ringer_is_rejected_when_include_card(self):
        self._with_access()
        self._add_license_documents(self.actors, self.licenses)

        license_obj = next(lic for lic in self.licenses if lic.sequence.mnr == "0002")

        # Make the ringer on this license a STATION
        ringer_rel = license_obj.actors.filter(role=LicenseRoleChoices.RINGER).select_related("actor").get()
        ringer_actor = ringer_rel.actor
        ringer_actor.type = ActorTypeChoices.STATION
        ringer_actor.sex = SexChoices.NOT_APPLICABLE
        ringer_actor.save(update_fields=["type", "sex"])

        url = self._send_mail_url_for_actors(
            mnr=license_obj.sequence.mnr,
            actor_ids=[ringer_actor.id],
            include_card=True,
        )
        with patch.object(LicenseSequenceViewSet, "get_queryset", self._plain_licensesequence_queryset):
            resp = self.client.put(url)

        self.assertEqual(resp.status_code, 400)
        self.assertEqual({"detail": "Selected ringers are skipped by card policy."}, resp.json())

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

@override_settings(COMMUNICATION_LANGUAGE_CODE="en")
class LicenseDocumentEmailNotifyRingerTests(_EmailTestBase):
    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        cls._tmpdir = tempfile.TemporaryDirectory()
        cls._card_template = Path(cls._tmpdir.name) / "license-card-template.svg"
        cls._card_template.write_text(
            """<svg xmlns="http://www.w3.org/2000/svg" width="400" height="200">
           <rect width="100%" height="100%" fill="white"/>
           <text x="20" y="40">{{ text_placeholder }}</text>
           </svg>""",
            encoding="utf-8",
        )
        cls._override = override_settings(
            LICENSING_CARD_TEMPLATE=str(cls._card_template)
        )
        cls._override.enable()

    @classmethod
    def tearDownClass(cls):
        cls._override.disable()
        cls._tmpdir.cleanup()
        super().tearDownClass()

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
        self.assertTrue(filename.endswith(self.bundle_suffix))
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
        card_service.get_or_create_license_card_document(lic=license_obj, actor=ringer_actor, created_by=self.user_with_access, updated_by=self.user_with_access)

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
        card_service.get_or_create_license_card_document(lic=license_obj, actor=ringer_actor, created_by=self.user_with_access, updated_by=self.user_with_access)

        ringer_actor.email = ""
        ringer_actor.save(update_fields=["email"])

        url = self._send_mail_url_for_actors(mnr=license_obj.sequence.mnr, actor_ids=[helper_actor.id], include_card=True, notify_ringer=True)

        with patch.object(LicenseSequenceViewSet, "get_queryset", self._plain_licensesequence_queryset):
            resp = self.client.put(url)

        self.assertEqual(resp.status_code, 400)
        self.assertEqual(
            {
                "detail": f"No email address available for ringer on license {license_obj.sequence.mnr}.",
            },
            resp.json(),
        )

        self.assertEqual(0, len(mail.outbox))
        self.assertEqual(0, LicenseCommunication.objects.filter(license=license_obj).count())

    def test_notify_ringer_fails_if_helper_missing_document(self):
        self._with_access()

        license_obj = next(lic for lic in self.licenses if lic.sequence.mnr == "0002")
        helper_actor = self.actors[2]
        ringer_actor = self.actors[1]

        # Only create ringer document so that helper has no document.
        card_service = LicenseCardService()
        card_service.get_or_create_license_card_document(lic=license_obj, actor=ringer_actor, created_by=self.user_with_access, updated_by=self.user_with_access)

        url = self._send_mail_url_for_actors(mnr=license_obj.sequence.mnr, actor_ids=[helper_actor.id], include_card=True, notify_ringer=True)

        with patch.object(LicenseSequenceViewSet, "get_queryset", self._plain_licensesequence_queryset):
            resp = self.client.put(url)

        helper_actor_relation = license_obj.actors.filter(actor=helper_actor).get()
        self.assertEqual(resp.status_code, 400)
        self.assertEqual(
            {
                "detail": f"No license card document available for: {license_obj.sequence.mnr}:{helper_actor_relation.mednr}",
            },
            resp.json(),
        )

        self.assertEqual(0, len(mail.outbox))
        self.assertEqual(0, LicenseCommunication.objects.filter(license=license_obj).count())

    def test_notify_ringer_sends_bundle_to_station_ringer(self):
        self._with_access()

        license_obj = next(lic for lic in self.licenses if lic.sequence.mnr == "0002")
        helper_actor = self.actors[2]

        # Ensure helper has a card doc (bundle needs it)
        card_service = LicenseCardService()
        card_service.get_or_create_license_card_document(
            lic=license_obj,
            actor=helper_actor,
            created_by=self.user_with_access,
            updated_by=self.user_with_access
        )

        # Make ringer a STATION (but keep email)
        ringer_rel = license_obj.actors.filter(role=LicenseRoleChoices.RINGER).select_related("actor").get()
        ringer_actor = ringer_rel.actor
        ringer_actor.type = ActorTypeChoices.STATION
        ringer_actor.sex = SexChoices.NOT_APPLICABLE
        ringer_actor.save(update_fields=["type", "sex"])

        url = self._send_mail_url_for_actors(
            mnr=license_obj.sequence.mnr,
            actor_ids=[helper_actor.id],
            include_card=True,
            notify_ringer=True,
        )

        with patch.object(LicenseSequenceViewSet, "get_queryset", self._plain_licensesequence_queryset):
            resp = self.client.put(url)

        self.assertEqual(resp.status_code, 200)
        self.assertEqual("sent", resp.json()["ringer_bundle_message"])

        # Ensure the bundle went to the (station) ringer
        bundle_msgs = [
            m for m in mail.outbox
            if any(fn.endswith(self.bundle_suffix) for (fn, _data, _mime) in m.attachments)
        ]
        self.assertEqual(1, len(bundle_msgs))
        self.assertEqual([ringer_actor.email], bundle_msgs[0].to)

    def _send_mail_url_for_actors(self, *, mnr: str, actor_ids: list[int], include_card: bool = False, include_permit: bool = False, notify_ringer: bool = False) -> str:
        params = [
            f"actor_ids={','.join(str(actor_id) for actor_id in actor_ids)}",
            *(["include_card"] if include_card else []),
            *(["include_permit"] if include_permit else []),
            *(["notify_ringer"] if notify_ringer else []),
        ]
        query = "&".join(params)
        return f"/api/license_sequence/{mnr}/send-license-emails/?{query}"