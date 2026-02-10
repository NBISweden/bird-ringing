from django.test import SimpleTestCase
from unittest.mock import patch
import tempfile
import os

from bird_ringing.helpers import (
    get_secret_from_file,
    strtobool,
    parse_single_row_csv,
    parse_csv_from_env,
)


class GetSecretFromFileTests(SimpleTestCase):
    def test_reads_file_successfully(self):
        with tempfile.NamedTemporaryFile(mode="w", delete=False) as tf:
            tf.write("my-secret\n")
            path = tf.name

        with patch.dict(os.environ, {"SECRET_FILE": path}):
            self.assertEqual(get_secret_from_file("SECRET_FILE"), "my-secret")

        os.remove(path)

    def test_returns_default_if_missing(self):
        self.assertEqual(
            get_secret_from_file("NO_SUCH_VAR", default="fallback"), "fallback"
        )

    def test_returns_none_if_file_missing(self):
        with patch.dict(os.environ, {"SECRET_FILE": "/bad/path"}):
            self.assertIsNone(get_secret_from_file("SECRET_FILE"))


class StrtoboolTests(SimpleTestCase):
    def test_strtobool(self):
        self.assertTrue(strtobool("true"))
        self.assertTrue(strtobool("True"))
        self.assertFalse(strtobool("false"))
        self.assertFalse(strtobool("False"))
        self.assertTrue(strtobool(True))
        self.assertFalse(strtobool(False))
        with self.assertRaises(ValueError):
            strtobool("abc")


class ParseCSVTest(SimpleTestCase):
    def test_parse_single_row_csv(self):
        self.assertEqual(parse_single_row_csv(""), [])
        self.assertEqual(parse_single_row_csv(",,,"), [])
        self.assertEqual(parse_single_row_csv(" , , ,"), [])
        self.assertEqual(parse_single_row_csv("abc, cde, efg"), ["abc", "cde", "efg"])
        self.assertEqual(parse_single_row_csv("abc, cde, efg\nhij, klm, nop"), ["abc", "cde", "efg"])


class ParseCSVFromENV(SimpleTestCase):
    def test_parse_csv_from_env(self):
        with patch.dict(os.environ, {"__ALLOWED_HOSTS": "target_a, , target_b"}):
            self.assertEqual(parse_csv_from_env("__ALLOWED_HOSTS", ["default"]), ["target_a", "target_b"])

        with patch.dict(os.environ, {"__ALLOWED_HOSTS": ""}):
            self.assertEqual(parse_csv_from_env("__ALLOWED_HOSTS", ["default"]), ["default"])