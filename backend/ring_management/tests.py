from django.core.exceptions import ValidationError
from django.forms.models import inlineformset_factory
from django.test import TestCase
from rest_framework.test import APIClient

from licensing.tests.utils import create_user
from ring_management.admin import RingSequenceInlineFormSet
from ring_management.models import (
    RingVariant,
    RingMaterial,
    RingTypeCode,
    RingSpecification,
    RingSeries,
    RingOrder,
    RingSequence,
    RingSequenceStatusChoices,
)


class RingTestData:
    """
    Creates the ring specification and series shared by the tests.
    """

    def create_ring_data(self, user):
        self.tracking = {"created_by": user, "updated_by": user}
        self.specification = RingSpecification.objects.create(
            name="Size 2, aluminium, round",
            type_code=RingTypeCode.objects.create(name="2"),
            variant=RingVariant.objects.create(name="round"),
            material=RingMaterial.objects.create(name="aluminium"),
            diameter=5.0,
            thickness=0.5,
            weight=0.1,
            height=4.0,
            **self.tracking,
        )
        self.series_d4 = self._create_series("D", 4, is_euring=True)
        # Prints the same ring numbers as series_d4
        self.series_d4_other = self._create_series("D", 4, is_euring=False)
        self.series_d5 = self._create_series("D", 5, is_euring=True)
        self.order = RingOrder.objects.create(**self.tracking)

    def _create_series(self, prefix, number_of_digits, is_euring):
        return RingSeries.objects.create(
            prefix=prefix,
            number_of_digits=number_of_digits,
            is_euring=is_euring,
            has_web_address=False,
            **self.tracking,
        )

    def create_sequence(self, series, start_number, end_number):
        return RingSequence.objects.create(
            order=self.order,
            series=series,
            specification=self.specification,
            start_number=start_number,
            end_number=end_number,
            **self.tracking,
        )


class RingSequenceModelTests(RingTestData, TestCase):
    def setUp(self):
        self.create_ring_data(create_user("user", "pwd"))

    def test_ring_numbers_and_quantity(self):
        sequence = self.create_sequence(self.series_d4, 1, 100)

        self.assertEqual(sequence.first_ring_number, "D0001")
        self.assertEqual(sequence.last_ring_number, "D0100")
        self.assertEqual(sequence.quantity, 100)
        self.assertEqual(sequence.status, RingSequenceStatusChoices.PRE_ORDER)

    def test_start_number_must_be_at_least_one(self):
        with self.assertRaises(ValidationError) as context:
            self.create_sequence(self.series_d4, 0, 10)

        self.assertIn("start_number", context.exception.message_dict)

    def test_end_number_must_not_be_lower_than_start_number(self):
        with self.assertRaises(ValidationError) as context:
            self.create_sequence(self.series_d4, 10, 9)

        self.assertIn("end_number", context.exception.message_dict)

    def test_end_number_must_fit_series(self):
        with self.assertRaises(ValidationError) as context:
            self.create_sequence(self.series_d4, 9000, 10000)

        self.assertIn("end_number", context.exception.message_dict)

    def test_end_number_filling_all_digits_is_valid(self):
        sequence = self.create_sequence(self.series_d4, 9000, 9999)

        self.assertEqual(sequence.last_ring_number, "D9999")

    def test_overlap_with_existing_sequence_is_rejected(self):
        self.create_sequence(self.series_d4, 1, 100)

        with self.assertRaises(ValidationError) as context:
            self.create_sequence(self.series_d4, 50, 150)

        self.assertIn("start_number", context.exception.message_dict)
        self.assertEqual(RingSequence.objects.count(), 1)

    def test_overlap_with_series_printing_same_numbers_is_rejected(self):
        self.create_sequence(self.series_d4, 1, 100)

        with self.assertRaises(ValidationError):
            self.create_sequence(self.series_d4_other, 100, 100)

    def test_same_prefix_with_different_digits_does_not_overlap(self):
        self.create_sequence(self.series_d4, 1, 100)
        self.create_sequence(self.series_d5, 1, 100)

        self.assertEqual(RingSequence.objects.count(), 2)

    def test_adjacent_sequences_do_not_overlap(self):
        self.create_sequence(self.series_d4, 1, 100)
        self.create_sequence(self.series_d4, 101, 200)

        self.assertEqual(RingSequence.objects.count(), 2)

    def test_editing_sequence_does_not_overlap_itself(self):
        sequence = self.create_sequence(self.series_d4, 1, 100)

        sequence.end_number = 50
        sequence.save()

        sequence.refresh_from_db()
        self.assertEqual(sequence.end_number, 50)


class RingSeriesModelTests(RingTestData, TestCase):
    def setUp(self):
        self.create_ring_data(create_user("user", "pwd"))

    def test_numbering_of_series_with_sequences_cannot_change(self):
        self.create_sequence(self.series_d4, 1, 100)

        for field, value in [("prefix", "E"), ("number_of_digits", 3)]:
            with self.subTest(field=field):
                series = RingSeries.objects.get(pk=self.series_d4.pk)
                setattr(series, field, value)

                with self.assertRaises(ValidationError) as context:
                    series.save()

                self.assertIn(field, context.exception.message_dict)

    def test_other_properties_of_series_with_sequences_can_change(self):
        self.create_sequence(self.series_d4, 1, 100)

        self.series_d4.has_web_address = True
        self.series_d4.save()

        self.series_d4.refresh_from_db()
        self.assertTrue(self.series_d4.has_web_address)

    def test_numbering_of_series_without_sequences_can_change(self):
        self.series_d4.prefix = "E"
        self.series_d4.number_of_digits = 3
        self.series_d4.save()

        self.series_d4.refresh_from_db()
        self.assertEqual(self.series_d4.prefix, "E")


class RingSequenceInlineFormSetTests(RingTestData, TestCase):
    FormSet = inlineformset_factory(
        RingOrder,
        RingSequence,
        formset=RingSequenceInlineFormSet,
        fields=["series", "specification", "start_number", "end_number", "status"],
        extra=0,
    )

    def setUp(self):
        self.create_ring_data(create_user("user", "pwd"))

    def test_overlapping_new_sequences_are_rejected(self):
        formset = self._formset([
            {"series": self.series_d4, "start_number": 1, "end_number": 100},
            {"series": self.series_d4_other, "start_number": 50, "end_number": 60},
        ])

        self.assertFalse(formset.is_valid())
        self.assertEqual(len(formset.non_form_errors()), 1)

    def test_separate_new_sequences_are_accepted(self):
        formset = self._formset([
            {"series": self.series_d4, "start_number": 1, "end_number": 100},
            {"series": self.series_d4, "start_number": 101, "end_number": 200},
        ])

        self.assertTrue(formset.is_valid())

    # A row about to be deleted can’t cause an overlap error if both rows are new. This does not cover
    # the more probable case when deleting existing sequence and adding a new one that would overlap with it.
    def test_deleted_sequences_are_ignored(self):
        formset = self._formset([
            {"series": self.series_d4, "start_number": 1, "end_number": 100},
            {"series": self.series_d4, "start_number": 50, "end_number": 60, "DELETE": "on"},
        ])

        self.assertTrue(formset.is_valid())

    def _formset(self, rows):
        prefix = "sequences"
        data = {
            f"{prefix}-TOTAL_FORMS": len(rows),
            f"{prefix}-INITIAL_FORMS": 0,
            f"{prefix}-MIN_NUM_FORMS": 0,
            f"{prefix}-MAX_NUM_FORMS": 1000,
        }
        for i, row in enumerate(rows):
            data.update({
                f"{prefix}-{i}-series": row["series"].pk,
                f"{prefix}-{i}-specification": self.specification.pk,
                f"{prefix}-{i}-start_number": row["start_number"],
                f"{prefix}-{i}-end_number": row["end_number"],
                f"{prefix}-{i}-status": RingSequenceStatusChoices.PRE_ORDER,
            })
            if "DELETE" in row:
                data[f"{prefix}-{i}-DELETE"] = row["DELETE"]

        return self.FormSet(data, instance=self.order, prefix=prefix)


class RingOrderRestTests(RingTestData, TestCase):
    def setUp(self):
        self.client = APIClient(HTTP_ACCEPT_LANGUAGE="en")
        self.user_with_access = create_user(
            "userwithaccess",
            "pwd",
            [
                "view_ringorder",
                "add_ringorder",
                "view_ringsequence",
            ],
        )
        self.user_without_access = create_user("userwithoutaccess", "pwd")
        # Permissions are checked before the HTTP method, so this user is
        # needed to show that a method itself is not allowed
        create_user(
            "userwithallaccess",
            "pwd",
            [
                f"{action}_{model}"
                for action in ["view", "add", "change", "delete"]
                for model in ["ringorder", "ringsequence"]
            ],
        )
        self.create_ring_data(self.user_with_access)

    def test_ring_order_create(self):
        self._with_access()

        response = self._post_order([
            self._sequence_payload(self.series_d4, 1, 100),
            self._sequence_payload(self.series_d5, 1, 10000),
        ], note="Annual pre-order")

        self.assertEqual(response.status_code, 201, response.json())

        created = response.json()
        self.assertEqual(created["note"], "Annual pre-order")
        self.assertEqual(len(created["sequences"]), 2)

        first, second = created["sequences"]
        self.assertEqual(first["first_ring_number"], "D0001")
        self.assertEqual(first["last_ring_number"], "D0100")
        self.assertEqual(first["end_number"], 100)
        self.assertEqual(first["quantity"], 100)
        self.assertEqual(first["status"], "pre_order")
        self.assertEqual(second["first_ring_number"], "D00001")
        self.assertEqual(second["last_ring_number"], "D10000")

        order = RingOrder.objects.get(pk=created["id"])
        self.assertEqual(order.sequences.count(), 2)
        self.assertEqual(order.created_by, self.user_with_access)
        self.assertEqual(order.sequences.first().created_by, self.user_with_access)

    def test_ring_order_create_overlapping_existing_sequence(self):
        self.create_sequence(self.series_d4, 1, 100)
        self._with_access()

        response = self._post_order([
            self._sequence_payload(self.series_d4, 50, 10),
        ])

        self.assertEqual(response.status_code, 400)
        self.assertIn("start_number", response.json()["sequences"][0])
        self.assertEqual(RingOrder.objects.count(), 1)

    def test_ring_order_create_overlapping_sequences_in_request(self):
        self._with_access()

        response = self._post_order([
            self._sequence_payload(self.series_d4, 1, 100),
            self._sequence_payload(self.series_d4_other, 50, 10),
        ])

        self.assertEqual(response.status_code, 400)
        self.assertIn("start_number", response.json()["sequences"][1])
        self.assertEqual(RingSequence.objects.count(), 0)
        self.assertEqual(RingOrder.objects.count(), 1)

    def test_ring_order_create_exceeding_series_digits(self):
        self._with_access()

        response = self._post_order([
            self._sequence_payload(self.series_d4, 9990, 20),
        ])

        self.assertEqual(response.status_code, 400)
        self.assertIn("quantity", response.json()["sequences"][0])

    def test_ring_order_create_failing_when_saving(self):
        series_d20 = self._create_series("X", 20, is_euring=True)
        self._with_access()

        response = self._post_order([
            self._sequence_payload(self.series_d4, 1, 100),
            self._sequence_payload(series_d20, 1, 2 ** 63),
        ])

        self.assertEqual(response.status_code, 400)
        errors = response.json()["sequences"]
        self.assertEqual(errors[0], {})
        self.assertIn("quantity", errors[1])
        self.assertEqual(RingSequence.objects.count(), 0)
        self.assertEqual(RingOrder.objects.count(), 1)

    def test_ring_order_create_with_invalid_numbers(self):
        self._with_access()

        for start_number, quantity, field in [(0, 10, "start_number"), (1, 0, "quantity")]:
            with self.subTest(start_number=start_number, quantity=quantity):
                response = self._post_order([
                    self._sequence_payload(self.series_d4, start_number, quantity),
                ])

                self.assertEqual(response.status_code, 400)
                self.assertIn(field, response.json()["sequences"][0])

    def test_ring_order_create_without_sequences(self):
        self._with_access()

        response = self._post_order([])

        self.assertEqual(response.status_code, 400)
        self.assertIn("sequences", response.json())

    def test_ring_order_without_access(self):
        self._without_access()

        self.assertEqual(self.client.get("/api/ring_order/").status_code, 403)
        self.assertEqual(self.client.get("/api/ring_sequence/").status_code, 403)
        response = self._post_order([
            self._sequence_payload(self.series_d4, 1, 100),
        ])
        self.assertEqual(response.status_code, 403)

    def test_ring_order_change_and_delete_not_allowed(self):
        self._with_all_access()
        url = f"/api/ring_order/{self.order.pk}/"

        self.assertEqual(self.client.put(url, {}, format="json").status_code, 405)
        self.assertEqual(self.client.patch(url, {}, format="json").status_code, 405)
        self.assertEqual(self.client.delete(url).status_code, 405)

    def test_ring_sequence_read_only(self):
        sequence = self.create_sequence(self.series_d4, 1, 100)
        self._with_all_access()

        response = self.client.get("/api/ring_sequence/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual([item["id"] for item in response.json()], [sequence.pk])

        response = self.client.post(
            "/api/ring_sequence/",
            self._sequence_payload(self.series_d4, 200, 10),
            format="json",
        )
        self.assertEqual(response.status_code, 405)

    def test_ring_series_numbering_change_with_sequences(self):
        self.create_sequence(self.series_d4, 1, 100)
        create_user("userwithseriesaccess", "pwd", ["change_ringseries"])
        self.client.login(username="userwithseriesaccess", password="pwd")
        url = f"/api/ring_series/{self.series_d4.pk}/"

        response = self.client.patch(url, {"number_of_digits": 3}, format="json")
        self.assertEqual(response.status_code, 400)
        self.assertIn("number_of_digits", response.json())

        response = self.client.patch(url, {"has_web_address": True}, format="json")
        self.assertEqual(response.status_code, 200)

    def _with_access(self):
        self.client.login(username="userwithaccess", password="pwd")

    def _with_all_access(self):
        self.client.login(username="userwithallaccess", password="pwd")

    def _without_access(self):
        self.client.login(username="userwithoutaccess", password="pwd")

    def _post_order(self, sequences, note=""):
        return self.client.post(
            "/api/ring_order/",
            data={"note": note, "sequences": sequences},
            format="json",
        )

    def _sequence_payload(self, series, start_number, quantity):
        return {
            "series_id": series.pk,
            "specification_id": self.specification.pk,
            "start_number": start_number,
            "quantity": quantity,
        }
