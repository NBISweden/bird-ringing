from django.template.loader import render_to_string
from django.core.mail import EmailMultiAlternatives, EmailAttachment
from django.core import mail
from django.conf import settings as django_settings
from typing import Iterable
from django.template import Template, Context


class MessageBuilder:
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
    ) -> EmailMultiAlternatives:
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
