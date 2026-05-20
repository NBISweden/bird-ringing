from django.test import TestCase
import datetime
from licensing.models import MonthDay


class TestMonthDay(TestCase):
    def setUp(self):
        self.period = (
            datetime.date(day=1, month=6, year=2000),
            datetime.date(day=1, month=6, year=2001),
        )

    def test_get_period__starts_before_ends_inside_single_year(self):
        local_starts_at = MonthDay(day=1, month=5)
        local_ends_at = MonthDay(day=1, month=7)
        (starts_at, ends_at) = MonthDay.get_period(
            self.period,
            (local_starts_at, local_ends_at)
        )

        self.assertEqual(
            starts_at.year,
            ends_at.year,
            "Expect period to end during the same year"
        )
        self.assertEqual(
            (starts_at.day, starts_at.month, ends_at.day, ends_at.month),
            (local_starts_at.day, local_starts_at.month, local_ends_at.day, local_ends_at.month),
            "Expect days and months to be the same as original MonthDay input"
        )
    
    def test_get_period__starts_before_ends_inside_two_year(self):
        local_starts_at = MonthDay(day=1, month=5)
        local_ends_at = MonthDay(day=1, month=4)
        (starts_at, ends_at) = MonthDay.get_period(
            self.period,
            (local_starts_at, local_ends_at)
        )

        self.assertEqual(
            ends_at.year - starts_at.year,
            1,
            "The difference between the year number is 1"
        )
        self.assertEqual(
            (starts_at.day, starts_at.month, ends_at.day, ends_at.month),
            (local_starts_at.day, local_starts_at.month, local_ends_at.day, local_ends_at.month),
            "Expect days and months to be the same as original MonthDay input"
        )
    
    def test_get_period__undefined_edges_are_same_as_full_period(self):
        local_starts_at = MonthDay(day=1, month=5)
        (starts_at, ends_at) = MonthDay.get_period(
            self.period,
            (local_starts_at, None)
        )

        self.assertEqual(
            ends_at,
            self.period[1],
            "Expect end to be the same as for full period"
        )

        local_ends_at = MonthDay(day=1, month=6)
        (starts_at, ends_at) = MonthDay.get_period(
            self.period,
            (None, local_ends_at)
        )

        self.assertEqual(
            starts_at,
            self.period[0],
            "Expect start to be the same as for full period"
        )
    
    def test_get_period__starts_and_ends_outside_full_period(self):
        local_starts_at = MonthDay(day=1, month=5)
        local_ends_at = MonthDay(day=1, month=4)
        (starts_at, ends_at) = MonthDay.get_period(
            (
                datetime.date(day=1, month=6, year=2000),
                datetime.date(day=1, month=3, year=2001),
            ),
            (local_starts_at, local_ends_at)
        )

        self.assertEqual(
            starts_at,
            local_starts_at.as_date(starts_at.year),
            "Expect start to use the first year"
        )

        self.assertEqual(
            ends_at,
            local_ends_at.as_date(ends_at.year),
            "Expect end to use the second year"
        )
    
    def get_period__ends_after_starts_inside(self):
        local_starts_at = MonthDay(day=1, month=8)
        local_ends_at = MonthDay(day=1, month=7)
        (starts_at, ends_at) = MonthDay.get_period(
            self.period,
            (local_starts_at, local_ends_at)
        )

        self.assertEqual(
            ends_at.year - starts_at.year,
            1,
            "The difference between the year number is 1"
        )
        self.assertEqual(
            (starts_at.day, starts_at.month, ends_at.day, ends_at.month),
            (local_starts_at.day, local_starts_at.month, local_ends_at.day, local_ends_at.month),
            "Expect days and months to be the same as original MonthDay input"
        )

        self.assertTrue(
            starts_at >= self.period[0] and starts_at <= self.period[1],
            "Expect start to be inside full period"
        )

        self.assertTrue(
            ends_at > self.period[1],
            "Expect end to be after the end of the full period"
        )
