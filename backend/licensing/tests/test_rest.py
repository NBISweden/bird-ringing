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


class LicenseDocumentEmailTests(TestCase):
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
        self.user_without_access = create_user(
            "userwithoutaccess",
            "pwd"
        )

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
                role=LicenseRoleChoices.HELPER,
                mednr="H001",
                created_by=self.user_with_access,
                updated_by=self.user_with_access,
            )

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
                "messages_prepared": 4,
                "failed_messages": [],
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
                "messages_prepared": 3,
                "failed_messages": [],
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

    def _send_mail_url(self, mnrs: list[str], include_card: bool = False, include_permit = False):
        params = [
            *(["include_card"] if include_card else []),
            *(["include_permit"] if include_permit else [])
        ]
        return reverse("licensesequence-send-license-emails") + f"?mnrs={','.join(mnrs)}&{'&'.join(params)}"

    def _with_access(self):
        self.client.login(username="userwithaccess", password="pwd")