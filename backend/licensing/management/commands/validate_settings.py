from django.core.management.base import BaseCommand, CommandError
from django.conf import settings
from django.core import mail
from django.template import loader, TemplateDoesNotExist
import itertools
from pathlib import Path


class Command(BaseCommand):
    help = "Validates settings before starting the system"

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.settings = settings

    def handle(self, *args, **options):
        errors = list(itertools.chain(
            self.validate_attributes(),
            self.validate_mail_settings(),
            self.validate_templates(),
        ))
        for error in errors:
            self.stdout.write(f"ERROR: {error}")

        if len(errors) > 0:
            raise CommandError(f"There were errors while validating the config: {', '.join(errors)}")

    def validate_attributes(self):
        attributes = [
            "LICENSING_CARD_TEMPLATE",
            "LICENSING_CARD_TEMPLATE_BACK",
            "LICENSING_PERMIT_TEMPLATE_DOCX",
            "DOCX2PDF_URL",
            "LICENSING_EMAIL_SUBJECT",
            "LICENSING_EMAIL_TEMPLATE",
            "LICENSING_EMAIL_FROM_ADDR",
            "TEMPLATES_DIR",
        ]
        for attribute in attributes:
            if not hasattr(self.settings, attribute):
                yield f"{attribute} is not set"
            elif not getattr(self.settings, attribute):
                yield f"{attribute} can not be empty or 'None'"

    def validate_templates(self):
        django_templates = [
            "LICENSING_EMAIL_TEMPLATE",
            "LICENSING_EMAIL_HTML_TEMPLATE",
        ]
        for template_attribute in django_templates:
            template_name = getattr(self.settings, template_attribute, None)
            if template_name:
                try:
                    loader.select_template([template_name])
                except TemplateDoesNotExist:
                    yield f"Failed to load template: '{template_name}'"

        template_path_attributes = [
            "LICENSING_CARD_TEMPLATE",
            "LICENSING_CARD_TEMPLATE_BACK",
            "LICENSING_PERMIT_TEMPLATE_DOCX"
        ]
        for path_attribute in template_path_attributes:
            template_path = getattr(self.settings, path_attribute, None)
            if template_path:
                if not self._file_exists(template_path):
                    yield f"Configured template file, for {path_attribute}, not found: {template_path}"

    def validate_mail_settings(self):
        try:
            with mail.get_connection(fail_silently=False) as connection:
                if hasattr(connection, "connection"):
                    connection.connection.ehlo_or_helo_if_needed()
        except Exception as e:
            yield f"Unable to connect to mail server: {str(e)}"


    def _file_exists(self, path):
        path_file = Path(path)
        return path_file.is_file()