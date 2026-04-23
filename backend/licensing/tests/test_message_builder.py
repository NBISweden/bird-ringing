from django.test import TestCase
from licensing.message_builder import RingerBundleMessageBuilder
from unittest.mock import patch
import os


class TestParseBundleSuffix(TestCase):
    def test_parser_should_replace_illegal_characters(self):
        variants = (
            ("a/file/with/a/path/file", "a-file-with-a-path-file"),
            ("a-file-with-an-extension.zip", "a-file-with-an-extension-zip"),
        )
        for value, expectation in variants:
            self.assertEqual(
                RingerBundleMessageBuilder.parse_bundle_suffix(value),
                expectation,
                "invalid characters should be replaced with '-'"
            )

    def test_parser_should_leave_swedish_characters(self):
        variants = [
            "en-fil-som-innehåller-märkvärdiga-svenska-bokstäver",
            "medhjälparlicenser-dokument"
        ]
        for value in variants:
            self.assertEqual(
                RingerBundleMessageBuilder.parse_bundle_suffix(value),
                value,
                "the value should be unchanged"
            )