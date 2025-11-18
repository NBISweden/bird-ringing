from licensing import models
from django.db import transaction
from django.contrib.auth.models import User
from django.core.management.base import BaseCommand
import json
import datetime
import csv


class CSVLoader:
    def __init__(self, path_format: str):
        self._path_format = path_format

    def get_dict_list(self, id: str):
        path = self._path_format.format(id=id)
        with open(path, "r") as f:
            reader = csv.DictReader(f)
            return [
                self._null_to_none(row)
                for row in reader
            ]

    def _null_to_none(self, row):
        return {
            key: value
            for key, value in row.items()
            if value != "NULL"
        }


class Command(BaseCommand):
    help = 'Load data from CSV'

    def add_arguments(self, parser):
        parser.add_argument(
            "--path_format",
            type=str,
            default="./mock_data/example/br-ex-{id}.csv"
        )

    def handle(self, *args, **options):
        loader = CSVLoader(options.get("path_format"))
        user = self.get_current_user()
        with transaction.atomic():
            self.load_permission_types()
            self.load_species(loader.get_dict_list("Artlista"))
            self.load_ringers_and_licenses(loader.get_dict_list("Maerkare"))


    def load_permission_types(self):
        permission_types = [
            (
                "Mistnet",
                "Licensen tillåter användande av nät."
            ),
            (
                "Ljud",
                "Licensen tillåter användande av ljud."
            ),
            (
                "Trap",
                "Licensen tillåter användande av fällor."
            )
        ]
        current_user = self.get_current_user()

        for name, description in permission_types:
            models.LicensePermissionType.objects.get_or_create(
                created_by=current_user,
                updated_by=current_user,
                name=name,
                description=description
            )
    
    def load_ringers_and_licenses(self, ringers: list[dict]):
        current_user = self.get_current_user()
        for ringer in ringers:
            type = {
                "S": models.ActorTypeChoices.STATION,
                "P": models.ActorTypeChoices.PERSON
            }[ringer["PriSta"]]
            sex = (
                models.SexChoices.NOT_APPLICABLE
                if type == models.ActorTypeChoices.STATION
                else models.SexChoices.UNDISCLOSED
            )
            birth_date = (
                datetime.date(year=int(ringer["Fyr"]))
                if "Fyr" in ringer
                else None
            )
            first_name=ringer.get("Fnamn", "")
            last_name=ringer.get("Enamn", "")
            (actor, _created) = models.ActorImport.objects.get_or_create_item(
                created_by=current_user,
                updated_by=current_user,
                full_name=" ".join([v for v in (first_name, last_name) if v]),
                first_name=first_name,
                last_name=last_name,
                type=type,
                sex=sex,
                birth_date=birth_date,
                language=models.LanguageChoices.SV,

                phone_number1=ringer.get("Telhem", ""),
                phone_number2=ringer.get("Telarb", ""),

                email=ringer.get("Email", ""),
                alternative_email="",

                address=ringer.get("Adress1", "") + " " + ringer.get("Adress2", ""),
                co_address=ringer.get("Adress3", ""),
                postal_code=ringer.get("Postnr", ""),
                city=ringer.get("Ort", ""),
                country="",
            )

        for license_data in ringers:
            status = {
                "Aktiv": models.LicenseStatusChoices.ACTIVE,
                "Ej aktiv": models.LicenseStatusChoices.INACTIVE,
                "Avslutad": models.LicenseStatusChoices.TERMINATED,
            }[license_data.get("Status", "Ej aktiv")]
            (seq, _s_created) = models.LicenseSequenceImport.objects.get_or_create_item(
                created_by=current_user,
                updated_by=current_user,
                mnr=license_data["Mnr"],
                status=status,
            )
            current_year = int(license_data.get("Startyr", datetime.date.today().year))
            starts_at = datetime.date(year=current_year, month=1, day=1)
            ends_at = datetime.date(year=current_year, month=12, day=31)
            description = license_data.get("Noteringar", "")
            report_status = (
                models.ReportStatusChoices.YES
                if "Slutredov" in license_data
                else (
                    models.ReportStatusChoices.INCOMPLETE
                    if "Lastredov" in license_data
                    else models.ReportStatusChoices.NO
                )
            )
            location = license_data.get("Greenwich", "")
            (license, _l_created) = models.LicenseImport.objects.get_or_create_item(
                created_by=current_user,
                updated_by=current_user,
                version=0,
                sequence=seq.item,
                location=location,
                description=description,
                report_status=report_status,
                starts_at=starts_at,
                ends_at=ends_at
            )

            permission_types = [
                models.LicensePermissionType.objects.get(name=permission_type_name)
                for permission_type_name in ["Mistnet", "Ljud", "Trap"]
                if license_data.get(permission_type_name, "N") == "J"
            ]
            for permission_type in permission_types:
                if not license.item.permissions.filter(type=permission_type).exists():
                    models.LicensePermission.objects.create(
                        license=license.item,
                        created_by=current_user,
                        updated_by=current_user,
                        type=permission_type,
                        description="",
                        location="",
                    )

    def load_species(self, species: list[dict]):
        current_user = self.get_current_user()
        for s in species:
            models.SpeciesImport.objects.get_or_create_item(
                created_by=current_user,
                updated_by=current_user,
                name=s["SVnamn"],
                scientific_code=s["VetKod"],
                scientific_name=s["VetNamn"],
            )
    
    def get_current_user(self):
        user, _created = User.objects.get_or_create(username="legacy_importer")
        return user

    def _parse_date(self, date_str):
        # 1999-03-15 00:00:00.000
        return datetime.datetime.strptime(date_str, "%Y-%m-%d %H:%M:%S.%f")
