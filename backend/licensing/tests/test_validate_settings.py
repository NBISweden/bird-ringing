from django.test import TestCase
from licensing.management.commands.validate_settings import Command
from unittest.mock import patch
import os


class TestValidateSettings(TestCase):
    def setUp(self):
        self.command = Command()
        self.command.stdout = open(os.devnull, "w")

    @patch("django.template.loader.select_template")
    def test_all_settings_exist(self, mock_select_template):
        class MockSettings:
            LICENSING_CARD_TEMPLATE = "mock"
            LICENSING_CARD_TEMPLATE_BACK = "mock"
            LICENSING_PERMIT_TEMPLATE_DOCX = "mock"
            DOCX2PDF_URL = "mock"
            LICENSING_EMAIL_SUBJECT = "mock"
            LICENSING_EMAIL_TEMPLATE = "mock"
            LICENSING_EMAIL_FROM_ADDR = "mock"
            TEMPLATES_DIR = "mock"

        mock_select_template.return_value = True
        
        self.command.settings = MockSettings()
        with patch.object(self.command, "_file_exists", TestValidateSettings.always_true):
            self.command.handle()
    
    def test_missing_settings_attribute(self):
        class MockSettings:
            pass
        
        self.command.settings = MockSettings()
        errors = list(self.command.validate_attributes())
        self.assertEqual(7, len(errors), "Has one error per missing required setting")

    def test_failed_to_load_template(self):
        class MockSettings:
            LICENSING_EMAIL_TEMPLATE = "mock.txt"
            LICENSING_EMAIL_HTML_TEMPLATE = "mock.html"
        
        self.command.settings = MockSettings()
        errors = list(self.command.validate_templates())
        self.assertEqual(
            errors,
            [
                "Failed to load template: 'mock.txt'",
                "Failed to load template: 'mock.html'",
            ]
        )
    
    def test_failed_to_read_template_file(self):
        class MockSettings:
            LICENSING_CARD_TEMPLATE = "a"
            LICENSING_CARD_TEMPLATE_BACK = "b"
            LICENSING_PERMIT_TEMPLATE_DOCX = "c"
        
        self.command.settings = MockSettings()
        errors = list(self.command.validate_templates())
        self.assertEqual(
            errors,
            [
                "Configured template file, for 'LICENSING_CARD_TEMPLATE' (LICENSE_CARD_FILE), not found: 'a'",
                "Configured template file, for 'LICENSING_PERMIT_TEMPLATE_DOCX' (PERMIT_TEMPLATE_FILE), not found: 'c'"
            ]
        )
    
    @staticmethod
    def always_true(*args):
        return True