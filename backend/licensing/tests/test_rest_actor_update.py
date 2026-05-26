from django.test import TestCase
from rest_framework.test import APIClient
from licensing.models import (
    Actor,
    ActorTypeChoices,
    SexChoices,
)
from .utils import create_user


class ActorUpdateTests(TestCase):
    def setUp(self):
        self.client = APIClient(HTTP_ACCEPT_LANGUAGE="en")
        self.user_with_access = create_user(
            "userwithaccess",
            "pwd",
            [
                "view_actor",
                "add_actor",
                "change_actor"
            ]
        )
        self.user_without_access = create_user("userwithoutaccess", "pwd")

    def test_actor_update(self):
        actors = [
            Actor.objects.create(
                full_name=name,
                first_name=name,
                email=f"{name.lower()}@example.com",
                sex=SexChoices.UNDISCLOSED,
                type=ActorTypeChoices.PERSON,
                created_by=self.user_with_access,
                updated_by=self.user_with_access
            )
            for name in ["Adam", "Bertil", "Carl", "Daniel"]
        ]

        self._with_access()
        for actor in actors:
            current_response = self.client.get(f"/api/actor/{actor.id}/", format="json")
            self.assertEqual(current_response.status_code, 200, "Getting actor data should succeed.")
            previous = current_response.json()
            previous.pop("previous_license_relations")
            previous.pop("updated_at")

            last_name = "Persson"
            update = {
                **previous,
                "last_name": last_name,
                "full_name": f"{actor.first_name} {last_name}",
            }
            update_response = self.client.put(
                f"/api/actor/{actor.id}/",
                data=update,
                format="json"
            )
            self.assertEqual(update_response.status_code, 200, "Updating actor data should succeed.")

            updated_response = self.client.get(f"/api/actor/{actor.id}/", format="json")
            self.assertEqual(updated_response.status_code, 200, "Getting updated actor data should succeed.")

            updated = updated_response.json()
            updated.pop("previous_license_relations")
            updated.pop("updated_at")
            self.assertEqual(
                update,
                updated,
                "The update and the updated actor should be the same."
            )
        
    def test_actor_create(self):
        actors = [
            {
                "full_name": name,
                "first_name": name,
                "email": f"{name.lower()}@example.com",
                "sex": "undisclosed",
                "type": "person",
                "language": "sv"
            }
            for name in ["Adam", "Bertil", "Carl", "Daniel"]
        ]

        self._with_access()
        for actor in actors:
            response = self.client.post(
                "/api/actor/",
                data=actor,
                format="json"
            )
            self.assertEqual(response.status_code, 201, "Adding new actor should succeed as created.")
            created = response.json()

            fetched_response = self.client.get(f"/api/actor/{created['id']}/", format="json")
            self.assertEqual(fetched_response.status_code, 200, "Getting created actor data should succeed.")
            fetched = {
                key: value
                for key, value in fetched_response.json().items()
                if value and key not in {"previous_license_relations", "updated_at", "id"}
            }
            self.assertEqual(actor, fetched, "The created actor should equal the posted data.")

    def test_actor_create_fail(self):
        actors = [
            (
                {
                    "full_name": "Adam",
                    "email": "adam@example.com",
                    "sex": "non_valid_sex",
                    "type": "person",
                    "language": "sv"
                },
                {
                    "sex": ["Choice, 'non_valid_sex', is not valid."]
                }
            ),
            (
                {
                    "full_name": "Bertil",
                    "email": "bertil@example.com",
                    "sex": "undisclosed",
                    "type": "person",
                    "language": "non_valid_lang"
                },
                {
                    "language": ["Choice, 'non_valid_lang', is not valid."]
                }
            ),
            (
                {
                    "full_name": "Station A",
                    "email": "station@example.com",
                    "sex": "not_applicable",
                    "type": "non_valid_type",
                    "language": "sv"
                },
                {
                    "type": ["Choice, 'non_valid_type', is not valid."]
                }
            ),
            (
                {
                    "email": "station@example.com",
                    "sex": "not_applicable",
                    "type": "station",
                    "language": "sv"
                },
                {
                    "full_name": ["This field is required."]
                }
            ),
            # The frontend used to send "unspecified" / "n/a" instead of the
            # actual enum names "undisclosed" / "not_applicable". These
            # cases pin the backend's rejection of those values so the
            # frontend stays honest.
            (
                {
                    "full_name": "Cecilia",
                    "email": "cecilia@example.com",
                    "sex": "unspecified",
                    "type": "person",
                    "language": "sv"
                },
                {
                    "sex": ["Choice, 'unspecified', is not valid."]
                }
            ),
            (
                {
                    "full_name": "Disa",
                    "email": "disa@example.com",
                    "sex": "n/a",
                    "type": "person",
                    "language": "sv"
                },
                {
                    "sex": ["Choice, 'n/a', is not valid."]
                }
            ),
            # The placeholder "-" used to leak from the form selects.
            (
                {
                    "full_name": "Erik",
                    "email": "erik@example.com",
                    "sex": "undisclosed",
                    "type": "-",
                    "language": "sv"
                },
                {
                    "type": ["Choice, '-', is not valid."]
                }
            ),
            # Invalid email format must be rejected.
            (
                {
                    "full_name": "Filip",
                    "email": "not-an-email",
                    "sex": "undisclosed",
                    "type": "person",
                    "language": "sv"
                },
                {
                    "email": ["Enter a valid email address."]
                }
            ),
        ]

        self._with_access()
        for (actor, expected_error) in actors:
            response = self.client.post(
                "/api/actor/",
                data=actor,
                format="json"
            )
            self.assertEqual(response.status_code, 400, f"Posting {actor} should fail with 400.")
            result = response.json()
            self.assertEqual(expected_error, result, "The result should be equal to the expected error.")

    def test_actor_create_with_minimal_fields(self):
        """The BRC requirement: gender, country, birth_date and birth_year
        must be allowed to be empty. The backend still requires sex (the
        frontend defaults to 'undisclosed'/'not_applicable' on type change),
        so this test sends only the truly required fields plus that
        auto-defaulted sex value."""
        self._with_access()
        minimal = {
            "full_name": "Gabriella",
            "first_name": "Gabriella",
            "type": "person",
            "sex": "undisclosed",
            "email": "gabriella@example.com",
        }
        response = self.client.post("/api/actor/", data=minimal, format="json")
        self.assertEqual(response.status_code, 201, response.content)
        created = response.json()

        # Fields the user did not provide should come back as their
        # database defaults.
        self.assertEqual(created["last_name"], "")
        self.assertEqual(created["country"], "")
        self.assertIsNone(created["birth_date"])
        self.assertIsNone(created["birth_year"])
        self.assertEqual(created["language"], "unknown")
        self.assertEqual(created["phone_number1"], "")
        self.assertEqual(created["description"], "")

    def test_actor_create_station(self):
        """A station actor uses sex='not_applicable' (matching the frontend's
        auto-default on type change)."""
        self._with_access()
        station = {
            "full_name": "Falsterbo Bird Observatory",
            "first_name": "Falsterbo Bird Observatory",
            "type": "station",
            "sex": "not_applicable",
            "email": "info@falsterbo.example.com",
            "city": "Falsterbo",
        }
        response = self.client.post("/api/actor/", data=station, format="json")
        self.assertEqual(response.status_code, 201, response.content)
        created = response.json()
        self.assertEqual(created["type"], "station")
        self.assertEqual(created["sex"], "not_applicable")

    def test_actor_update_patch_partial(self):
        """The frontend uses PATCH for the edit-actor flow, so this is the
        critical update path. Only the patched fields should change; the
        others must be left untouched."""
        actor = Actor.objects.create(
            full_name="Hanna",
            first_name="Hanna",
            email="hanna@example.com",
            city="Stockholm",
            sex=SexChoices.UNDISCLOSED,
            type=ActorTypeChoices.PERSON,
            created_by=self.user_with_access,
            updated_by=self.user_with_access,
        )

        self._with_access()
        response = self.client.patch(
            f"/api/actor/{actor.id}/",
            data={"city": "Göteborg"},
            format="json",
        )
        self.assertEqual(response.status_code, 200, response.content)

        actor.refresh_from_db()
        self.assertEqual(actor.city, "Göteborg")
        # Unrelated fields must be untouched.
        self.assertEqual(actor.full_name, "Hanna")
        self.assertEqual(actor.email, "hanna@example.com")
        self.assertEqual(actor.sex, SexChoices.UNDISCLOSED)

    def test_actor_create_unauthenticated(self):
        """No login -> the create endpoint must refuse."""
        response = self.client.post(
            "/api/actor/",
            data={
                "full_name": "Ivar",
                "type": "person",
                "sex": "undisclosed",
            },
            format="json",
        )
        self.assertIn(response.status_code, (401, 403))
        self.assertFalse(Actor.objects.filter(full_name="Ivar").exists())

    def test_actor_update_without_permission(self):
        """A logged-in user without change_actor permission must not be able
        to PATCH an actor."""
        actor = Actor.objects.create(
            full_name="Johanna",
            first_name="Johanna",
            email="johanna@example.com",
            sex=SexChoices.UNDISCLOSED,
            type=ActorTypeChoices.PERSON,
            created_by=self.user_with_access,
            updated_by=self.user_with_access,
        )

        self.client.login(username="userwithoutaccess", password="pwd")
        response = self.client.patch(
            f"/api/actor/{actor.id}/",
            data={"city": "Malmö"},
            format="json",
        )
        self.assertIn(response.status_code, (401, 403))

        actor.refresh_from_db()
        self.assertEqual(actor.city, "")

    def _with_access(self):
        self.client.login(username="userwithaccess", password="pwd")