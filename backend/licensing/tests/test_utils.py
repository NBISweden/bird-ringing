import datetime

from django.test import TestCase, override_settings

from licensing.utils import get_default_license_end_date


class GetDefaultLicenseEndDateTests(TestCase):
    def test_uses_project_defaults(self):
        self.assertEqual(
            get_default_license_end_date(datetime.date(2026, 1, 1)),
            datetime.date(2027, 2, 28),
        )

    @override_settings(LICENSING_DEFAULT_END_MONTH_DAY="03-15")
    def test_respects_month_day_override(self):
        self.assertEqual(
            get_default_license_end_date(datetime.date(2026, 1, 1)),
            datetime.date(2027, 3, 15),
        )

    @override_settings(LICENSING_DEFAULT_END_YEAR_OFFSET=2)
    def test_respects_year_offset_override(self):
        self.assertEqual(
            get_default_license_end_date(datetime.date(2026, 1, 1)),
            datetime.date(2028, 2, 28),
        )

    @override_settings(
        LICENSING_DEFAULT_END_YEAR_OFFSET=0,
        LICENSING_DEFAULT_END_MONTH_DAY="12-31",
    )
    def test_zero_offset_keeps_same_year(self):
        self.assertEqual(
            get_default_license_end_date(datetime.date(2026, 1, 1)),
            datetime.date(2026, 12, 31),
        )