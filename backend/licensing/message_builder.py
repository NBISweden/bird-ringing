from django.template.loader import render_to_string
from django.core.mail import EmailMultiAlternatives, EmailAttachment, EmailMessage
from django.conf import settings as django_settings
from typing import Iterable
from django.template import Template, Context
from licensing.license_card_service import LicenseCardService
from licensing.permit_service import PermitService
from licensing.utils import zip_bytes_from_files
from licensing.models import (
    Actor,
    License,
    LicenseRelation,
    DocumentTypeChoices,
    LicenseRoleChoices,
)
import datetime
import mimetypes


class MessageBuilder:
    """
    The MessageBuilder aims to be a generic way to group things
    related to creating EmailMessages. It handles templates for
    subject and content and allows for attechments.
    """
    def __init__(
        self,
        subject: str,
        from_addr: str,
        template_path: str,
        html_template_path: str = None,
    ):
        self.subject = subject
        self.from_addr = from_addr
        self.template_path = template_path
        self.html_template_path = html_template_path
    
    def get_message(
        self,
        to_addr: str,
        params: dict,
        attachments: Iterable[EmailAttachment],
        from_addr: str | None = None
    ) -> EmailMessage:
        msg = EmailMultiAlternatives(
            subject=self.apply_str_template(self.subject, params),
            body=self.apply_template(self.template_path, params),
            from_email=self.from_addr if from_addr is None else from_addr,
            to=[to_addr],
        )
        if self.html_template_path is not None:
            msg.attach_alternative(self.apply_template(self.html_template_path, params), "text/html")
        for attachment in attachments:
            msg.attach(attachment.filename, attachment.content, attachment.mimetype)
        return msg

    def apply_template(self, template_path: str, params: dict[str, str]) -> str:
        return render_to_string(template_path, context=params)
    
    def apply_str_template(self, template_str: str, params: dict[str, str]) -> str:
        return Template(template_str).render(Context(params))
    
    @staticmethod
    def from_licensing_settings(settings=django_settings):
        try:
            return MessageBuilder(
                settings.LICENSING_EMAIL_SUBJECT,
                settings.LICENSING_EMAIL_FROM_ADDR,
                settings.LICENSING_EMAIL_TEMPLATE,
                getattr(settings, "LICENSING_EMAIL_HTML_TEMPLATE"),
            )
        except (FileNotFoundError, AttributeError, TypeError) as e:
            raise ValueError(f"Failed to configure message builder: {e}")


class LicenseAndPermitMessageBuilder:
    """
    The LicenseAndPermitMessageBuilder builds messages specifically
    related to sending license and permit documents.
    """
    def __init__(self, message_builder: MessageBuilder, card_service: LicenseCardService):
        self.message_builder = message_builder
        self.card_service = card_service
    
    def get_message(self, lic: License, relation: LicenseRelation, include_card: bool = False, include_permit: bool = False) -> EmailMessage:
        email = relation.actor.email
        if not email:
            raise ValueError(f"No email address available for {lic.sequence.mnr}:{relation.mednr}")

        card_document = self.card_service.get_license_card_document(lic=lic, actor=relation.actor)
        card_attachment = None
        if card_document is None and include_card:
            raise ValueError(f"No license card document available for {lic.sequence.mnr}:{relation.mednr}")

        elif include_card:
            (mimetype, _encoding) = mimetypes.guess_type(card_document.reference)
            card_attachment = (
                EmailAttachment(
                    content=card_document.data,
                    mimetype=mimetype,
                    filename=card_document.reference
                ),
                DocumentTypeChoices(card_document.type).label
            )

        permit_attachment = None
        attachments = [
            *([] if card_attachment is None else [card_attachment]),
            *([] if permit_attachment is None else [permit_attachment])
        ]
        return self.message_builder.get_message(
            to_addr=email,
            params={
                "mnr": lic.sequence.mnr,
                "name": relation.actor.full_name,
                "date": datetime.date.today().isoformat(),
                "attachments": [
                    (document_type, attachment.filename)
                    for (attachment, document_type) in attachments
                ]
            },
            attachments=[
                attachment
                for (attachment, _document_type) in attachments
            ],
        )

class RingerBundleMessageBuilder:
    """
    Build a single email to the license ringer with a ZIP containing selected non-ringers' docs.
    Returns:
      - EmailMessage if a bundle could be built and ringer has email
      - None if no ringer email or nothing to bundle
    """

    def __init__(self, message_builder: MessageBuilder, card_service: LicenseCardService, permit_service: PermitService | None = None):
        self.message_builder = message_builder
        self.card_service = card_service
        self.permit_service = permit_service or PermitService()

    def build_message(self, *, lic: License, ringer_actor: Actor, relations: list[LicenseRelation], include_card: bool,
        include_permit: bool,
    ) -> EmailMessage | None:

        ringer_email = (ringer_actor.email or "").strip()
        if not ringer_email:
            return None

        files: list[tuple[str, bytes]] = []

        for rel in relations:
            if rel.role == LicenseRoleChoices.RINGER:
                continue

            if include_card:
                card_doc = self.card_service.get_license_card_document(lic=lic, actor=rel.actor)
                if card_doc and card_doc.data:
                    filename = self.card_service.make_license_card_filename(lic, rel.actor)
                    files.append((f"{filename}", bytes(card_doc.data)))

            if include_permit:
                permit_doc = self.permit_service.get_permit_document(lic=lic, actor=rel.actor)
                if permit_doc and permit_doc.data:
                    filename = self.permit_service.make_permit_filename(lic, rel.actor)
                    files.append((f"{filename}", bytes(permit_doc.data)))

        if not files:
            return None

        zip_bytes = zip_bytes_from_files(files)
        zip_filename = f"{lic.sequence.mnr}-helpers-documents.zip"

        zip_attachment = EmailAttachment(
            filename=zip_filename,
            content=zip_bytes,
            mimetype="application/zip",
        )

        return self.message_builder.get_message(
            to_addr=ringer_email,
            params={
                "mnr": lic.sequence.mnr,
                "name": ringer_actor.full_name,
                "date": datetime.date.today().isoformat(),
                "attachments": [("bundle", zip_filename)],
            },
            attachments=[zip_attachment],
        )
