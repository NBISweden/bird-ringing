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
        ]

        self._with_access()
        for (actor, expected_error) in actors:
            response = self.client.post(
                "/api/actor/",
                data=actor,
                format="json"
            )
            self.assertEqual(response.status_code, 400, "Adding new actor should succeed as created.")
            result = response.json()
            self.assertEqual(expected_error, result, "The result should be equal to the expected error.")
            
            

    def _with_access(self):
        self.client.login(username="userwithaccess", password="pwd")