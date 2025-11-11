from licensing import models
from django.db import transaction
from django.contrib.auth.models import User
from django.core.management.base import BaseCommand
import json
import datetime


class Command(BaseCommand):
    help = 'Load mock data from json'

    def add_arguments(self, parser):
        parser.add_argument(
            "--cleardata",
            action='store_true'
        )

    def handle(self, *args, **options):
        with transaction.atomic():
            if options["cleardata"]:
                models.License.objects.all().delete()
                models.LicenseSequence.objects.all().delete()
                models.LicensePermissionType.objects.all().delete()
                models.Actor.objects.all().delete()
            self.load_actors("./mock_data/actors.json")
            self.load_species("./mock_data/species.json")
            self.load_permission_types()
            self.load_licenses("./mock_data/licenses.json")
    
    def load_permission_types(self):
        permission_types = [
            (
                "General",
                "A general permission type describing things not yet modeled in the system."
            )
        ]
        current_user = User.objects.get()

        for name, description in permission_types:
            models.LicensePermissionType.objects.create(
                created_by=current_user,
                updated_by=current_user,
                name=name,
                description=description
            )
    
    def load_licenses(self, path: str):
        licenses = self._load_json(path)
        current_user = User.objects.get()
        general_permission_type = models.LicensePermissionType.objects.get(name="General")
        for (key, license) in licenses.items():
            ls = models.LicenseSequence.objects.create(
                created_by=current_user,
                updated_by=current_user,
                mnr=license["mnr"],
                status=1
            )

            license_obj = models.License.objects.create(
                created_by=current_user,
                updated_by=current_user,
                version=0,
                sequence=ls,
                location=license["region"],
                description=license["description"],
                report_status=1,
                starts_at=self._parse_date(license["startsAt"]).date(),
                ends_at=self._parse_date(license["expiresAt"]).date(),
            )

            permission_description = "\n".join([
                f"- {p}"
                for p in license.get("permissions", [])
            ])

            models.LicensePermission.objects.create(
                created_by=current_user,
                updated_by=current_user,
                license=license_obj,
                description=permission_description,
                type=general_permission_type,
            )


    def load_actors(self, path: str):
        actors = self._load_json(path)
        current_user = User.objects.get()
        for (key, actor) in actors.items():
            type_mapping = {
                "Person": 0,
                "Organization": 1,
            }
            sex_mapping = {
                "Male": 1,
                "Female": 2,
                "Undisclosed": 3,
                "N/A": 4
            }
            type = type_mapping[actor["type"]]
            models.Actor.objects.create(
                created_by=current_user,
                updated_by=current_user,
                full_name=actor["name"],
                type=type,
                sex=sex_mapping[actor["sex"]],
                birth_date=datetime.datetime.now() if type == 0 else None,
                language=1,
            )
    
    def load_species(self, path: str):
        species = self._load_json(path)
        current_user = User.objects.get()
        for (key, s) in species.items():
            models.Species.objects.create(
                created_by=current_user,
                updated_by=current_user,
                name=s["name"],
                scientific_code=s["scientificCode"],
                scientific_name=s["scientificName"],
            )

    def _parse_date(self, date_str):
        return datetime.datetime.strptime(date_str, "%Y-%m-%dT%H:%M:%S.%fZ")

    def _load_json(self, path: str):
        with open(path, "r") as f:
            return json.load(f)