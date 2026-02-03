from licensing import models
from django.db import transaction
from django.db.models import Max
from django.contrib.auth.models import User
from django.core.management.base import BaseCommand
import datetime
from django.utils.timezone import make_aware
import csv
import logging


logger = logging.getLogger(__name__)


class CSVLoader:
    """
    The purpose of the CSVLoader is to abstract the use of loaded data so that
    the system can focus on the naming of the data rather than on where it is
    or which format it is provided in.

    The loader will read csv files using a path_format, provided by the user,
    to find the correct file to read for a given name.
    """

    def __init__(self, path_format: str):
        self._path_format = path_format

    def get_dict_list(self, id: str):
        path = self._path_format.format(id=id)
        with open(path, "r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            return [self._null_to_none(row) for row in reader]

    def _null_to_none(self, row):
        return {key: value for key, value in row.items() if value != "NULL"}


class Command(BaseCommand):
    help = "Load data from CSV"

    def add_arguments(self, parser):
        parser.add_argument(
            "--path_format", type=str, default="./mock_data/example/br-ex-{id}.csv"
        )
        parser.add_argument(
            "--current_year", type=int, default=datetime.date.today().year
        )

        # default is to SKIP legacy permission creation from Maerkare columns,
        # we can refactor/remove this later
        parser.add_argument(
            "--include_legacy_permissions",
            action="store_true",
            help="Also create legacy permissions from Maerkare columns Mistnet/Ljud/Trap (default: skipped).",
        )

    def handle(self, *args, **options):
        loader = CSVLoader(options.get("path_format"))
        self.current_year = options.get("current_year")

        self.permit_type_map = {}
        self.permit_property_map = {}

        # default skip legacy permissions unless explicitly included (can be refactored later)
        self.include_legacy_permissions = bool(options.get("include_legacy_permissions"))

        with transaction.atomic():
            self.load_permission_types()
            self.load_species(loader.get_dict_list("Artlista"))
            self.load_ringers_and_licenses(loader.get_dict_list("Maerkare"))
            self.load_helpers(
                loader.get_dict_list("MarkAss"), loader.get_dict_list("MarkAssYr")
            )

            self.load_permit_types(loader.get_dict_list("TillstTyp"))
            self.load_permit_properties(loader.get_dict_list("TillstProp"))
            self.load_license_permits(loader.get_dict_list("Tillstand"))

    def load_permission_types(self):
        permission_types = [
            ("Mistnet", "Licensen tillåter användande av nät."),
            ("Ljud", "Licensen tillåter användande av ljud."),
            ("Trap", "Licensen tillåter användande av fällor."),
        ]
        current_user = self.get_current_user()

        for name, description in permission_types:
            models.LicensePermissionType.objects.get_or_create(
                created_by=current_user,
                updated_by=current_user,
                name=name,
                description=description,
            )

    def load_ringers_and_licenses(self, ringer_license_entries: list[dict]):
        license_ringer_mnr_map = dict()
        for ringer_license_data in ringer_license_entries:
            mnr = ringer_license_data["Mnr"]
            try:
                ringer_actor = self.load_ringer(ringer_license_data)
                license = self.load_license(ringer_license_data)
                license_ringer_mnr_map[mnr] = (ringer_actor, license)
            except (KeyError, ValueError) as e:
                logger.warning(
                    f"Failed to load ringer and/or license {mnr}: {type(e).__name__}, {str(e)}"
                )

        current_user = self.get_current_user()
        relations = list(self.get_ringer_relations(ringer_license_entries))
        for license_mnr, ringer_mnr, role, mednr in relations:
            try:
                logger.info("Importing:", license_mnr, ringer_mnr, role, mednr)
                license = license_ringer_mnr_map[license_mnr][1]
                actor = license_ringer_mnr_map[ringer_mnr][0]
                models.LicenseRelation.objects.get_or_create(
                    created_by=current_user,
                    updated_by=current_user,
                    license=license,
                    actor=actor,
                    role=role,
                    mednr=mednr,
                )
            except KeyError as e:
                logger.warning(
                    f"Missing for license: {license_mnr} {ringer_mnr}: {type(e).__name__}, {str(e)}"
                )

    def get_ringer_relations(self, ringer_license_entries: list[dict]):
        roles_and_keys = [
            (models.LicenseRoleChoices.RINGER, "Mnr", "R000"),
            *[
                (models.LicenseRoleChoices.ASSOCIATE, ass_id, f"A00{i}")
                for i, ass_id in enumerate(["AssMnr1", "AssMnr2", "AssMnr3"])
            ],
            (models.LicenseRoleChoices.COMMUNICATION, "AdrMnr", "ADRM"),
        ]

        for ringer_license_data in ringer_license_entries:
            license_mnr = ringer_license_data["Mnr"]
            for role, key, mednr in roles_and_keys:
                type = ringer_license_data["PriSta"]
                if key in ringer_license_data and type in {"S", "P"}:
                    ringer_mnr = ringer_license_data[key]
                    yield (license_mnr, ringer_mnr, role, mednr)

    def load_ringer(self, ringer_data: dict):
        current_user = self.get_current_user()
        type = {
            "S": models.ActorTypeChoices.STATION,
            "P": models.ActorTypeChoices.PERSON,
        }[ringer_data["PriSta"]]

        sex_choice = {"M": models.SexChoices.MALE, "F": models.SexChoices.FEMALE}.get(
            ringer_data.get("Sex"), models.SexChoices.UNDISCLOSED
        )
        sex = (
            models.SexChoices.NOT_APPLICABLE
            if type == models.ActorTypeChoices.STATION
            else sex_choice
        )
        birth_date = self._parse_birth_date(ringer_data.get("Fyr"))
        first_name = ringer_data.get("Fnamn", "")
        last_name = ringer_data.get("Enamn", "")
        language = self._parse_language(ringer_data.get("Spr"))
        (actor, _created) = models.ActorImport.objects.get_updated_or_create_item(
            created_by=current_user,
            updated_by=current_user,
            full_name=" ".join([v for v in (first_name, last_name) if v]),
            first_name=first_name,
            last_name=last_name,
            type=type,
            sex=sex,
            birth_date=birth_date,
            language=language,
            phone_number1=ringer_data.get("Telhem", ""),
            phone_number2=ringer_data.get("Telarb", ""),
            email=ringer_data.get("Email", ""),
            alternative_email="",
            address=ringer_data.get("Adress1", "")
            + " "
            + ringer_data.get("Adress2", ""),
            co_address=ringer_data.get("Adress3", ""),
            postal_code=ringer_data.get("Postnr", ""),
            city=ringer_data.get("Ort", ""),
            country="",
        )
        return actor.item

    def load_license(self, license_data: dict):
        current_user = self.get_current_user()

        licdatum = license_data.get("LicDatum")
        created_at = (
            self._parse_date(licdatum)
            if licdatum
            else make_aware(datetime.datetime.now())
        )
        status = {
            "Aktiv": models.LicenseStatusChoices.ACTIVE,
            "Ej aktiv": models.LicenseStatusChoices.INACTIVE,
            "Avslutad": models.LicenseStatusChoices.TERMINATED,
        }[license_data.get("Status", "Ej aktiv")]
        mnr = license_data["Mnr"]
        (seq, _s_created) = (
            models.LicenseSequenceImport.objects.get_updated_or_create_item(
                created_by=current_user,
                updated_by=current_user,
                mnr=mnr,
                status=status,
            )
        )
        current_year = (
            self.current_year
            if status == models.LicenseStatusChoices.ACTIVE
            else int(license_data.get("Startyr", datetime.date.today().year))
        )
        starts_at = datetime.date(year=current_year, month=2, day=1)
        ends_at = datetime.date(year=current_year + 1, month=1, day=31)
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
        (license, _l_created) = models.LicenseImport.objects.get_updated_or_create_item(
            created_at=created_at,
            updated_at=created_at,
            created_by=current_user,
            updated_by=current_user,
            version=0,
            sequence=seq.item,
            location=location,
            description=description,
            report_status=report_status,
            starts_at=starts_at,
            ends_at=ends_at,
        )

        # legacy permissions are skipped by default (can be enabled with flag),
        # we can refactor/remove this later
        if self.include_legacy_permissions:
            permission_types = [
                models.LicensePermissionType.objects.get(name=permission_type_name)
                for permission_type_name in ["Mistnet", "Ljud", "Trap"]
                if license_data.get(permission_type_name, "N") == "J"
            ]
            for permission_type in permission_types:
                if not license.item.permissions.filter(type=permission_type).exists():
                    models.LicensePermission.objects.create(
                        license=license.item,
                        created_at=created_at,
                        updated_at=created_at,
                        created_by=current_user,
                        updated_by=current_user,
                        type=permission_type,
                        description="",
                        location="",
                    )

        document_reference = license_data.get("Mappnamn")
        if document_reference:
            models.LicenseDocument.objects.get_or_create(
                created_by=current_user,
                updated_by=current_user,
                actor=None,
                license=license.item,
                type=models.DocumentTypeChoices.DOCUMENT,
                data=None,
                reference=document_reference,
            )

        return license.item

    def load_species(self, species: list[dict]):
        current_user = self.get_current_user()
        for s in species:
            models.SpeciesImport.objects.get_updated_or_create_item(
                created_by=current_user,
                updated_by=current_user,
                name=s["SVnamn"],
                scientific_code=s["VetKod"],
                scientific_name=s["VetNamn"],
            )

    def load_helpers(self, helper_entries: list[dict], helper_year_entries: list[dict]):
        year_dict = dict()
        for helper_year in helper_year_entries:
            year_str = helper_year["Ar"]
            year_str = "1996" if year_str == "<97" else year_str
            key = self._get_helper_key(helper_year)
            year_list = year_dict.get(key, [])
            year_list.append(int(year_str))
            year_dict[key] = year_list

        helper_map = {
            self._get_helper_key(helper_data): self.load_helper(helper_data)
            for helper_data in helper_entries
        }

        helper_relations = sorted(
            list(self.get_helper_relations(helper_year_entries)), key=lambda e: e[1]
        )

        current_user = self.get_current_user()
        for helper_key, year in helper_relations:
            (mnr, mednr) = helper_key
            helper = helper_map[helper_key]

            base_license = models.License.objects.get(sequence__mnr=mnr, version=0)
            last_version = models.License.objects.filter(sequence__mnr=mnr).aggregate(
                last_version=Max("version", default=0)
            )["last_version"]
            license = (
                models.License.objects.filter(
                    sequence__mnr=mnr, starts_at__year=year
                ).first()
                if year is not None
                else base_license
            )
            if license is None:
                base_license.starts_at = datetime.date(year=year, month=1, day=1)
                base_license.ends_at = datetime.date(year=year, month=12, day=31)
                license = base_license.copy_to_new_version(
                    last_version + 1,
                    include_documents=False,
                )
            if not license.actors.filter(actor=helper).exists():
                models.LicenseRelation.objects.get_or_create(
                    created_by=current_user,
                    updated_by=current_user,
                    license=license,
                    actor=helper,
                    mednr=mednr,
                    role=models.LicenseRoleChoices.HELPER,
                )

    def get_helper_relations(self, helper_year_entries: list[dict]):
        for helper_year in helper_year_entries:
            year_str = helper_year["Ar"]
            year_str = "1996" if year_str == "<97" else year_str
            yield (self._get_helper_key(helper_year), int(year_str))

    def load_helper(self, helper_data: dict):
        current_user = self.get_current_user()
        birth_date = self._parse_birth_date(helper_data.get("Fyr"))
        first_name = helper_data["FNamn"]
        last_name = helper_data["ENamn"]
        sex = {
            "F": models.SexChoices.FEMALE,
            "M": models.SexChoices.MALE,
        }.get(helper_data.get("Sex"), models.SexChoices.UNDISCLOSED)
        (actor, _created) = models.ActorImport.objects.get_or_create_item(
            created_by=current_user,
            updated_by=current_user,
            type=models.ActorTypeChoices.PERSON,
            birth_date=birth_date,
            full_name=" ".join([first_name, last_name]),
            first_name=first_name,
            last_name=last_name,
            sex=sex,
            description=helper_data.get("Fritext", ""),
        )
        return actor.item

    def get_current_user(self):
        user, _created = User.objects.get_or_create(username="legacy_importer")
        return user

    def _parse_language(self, value: str | None):
        return {"SV": models.LanguageChoices.SV, "EN": models.LanguageChoices.EN}.get(
            value, models.LanguageChoices.UNKNOWN
        )

    def _parse_birth_date(self, value: str | None):
        return datetime.date(year=int(value), day=1, month=1) if value else None

    def _get_helper_key(self, helper_data: dict):
        return (helper_data["Mnr"], helper_data["Mednr"])

    def _parse_date(self, date_str: str):
        # Ex. 1999-03-15 00:00:00.000
        return make_aware(datetime.datetime.strptime(date_str, "%Y-%m-%d %H:%M:%S.%f"))

    def load_permit_types(self, entries: list[dict]):
        current_user = self.get_current_user()
        for row in entries:
            type_code = row["type_code"].strip()
            obj = models.LicensePermissionType.objects.create(
                created_by=current_user,
                updated_by=current_user,
                name=(row.get("name") or "").strip(),
                description=(row.get("description") or "").strip(),
            )
            self.permit_type_map[type_code] = obj

    def load_permit_properties(self, entries: list[dict]):
        current_user = self.get_current_user()
        for row in entries:
            property_code = row["property_code"].strip()
            related_type_code = (row.get("related_type_code") or "").strip()
            related_type = (
                self.permit_type_map.get(related_type_code) if related_type_code else None
            )

            obj = models.LicensePermissionProperty.objects.create(
                created_by=current_user,
                updated_by=current_user,
                related_type=related_type,
                name=(row.get("name") or "").strip(),
                description=(row.get("description") or "").strip(),
            )
            self.permit_property_map[property_code] = obj

    def load_license_permits(self, entries: list[dict]):
        current_user = self.get_current_user()

        for row in entries:
            license_mnr = row["license_mnr"].strip()
            type_code = row["type_code"].strip()

            license = models.License.objects.get(sequence__mnr=license_mnr, version=0)
            permission_type = self.permit_type_map[type_code]

            perm = models.LicensePermission.objects.create(
                created_by=current_user,
                updated_by=current_user,
                license=license,
                type=permission_type,
                starts_at=self._parse_date_only(row.get("starts_at")),
                ends_at=self._parse_date_only(row.get("ends_at")),
                location=(row.get("location") or "").strip(),
                description=(row.get("description") or "").strip(),
            )

            prop_raw = (row.get("property_codes") or "").strip()
            prop_codes = [c.strip() for c in prop_raw.split(";") if c.strip()]
            if prop_codes:
                perm.properties.set([self.permit_property_map[c] for c in prop_codes])

            species_raw = (row.get("species_codes") or "").strip()
            species_codes = [c.strip() for c in species_raw.split(";") if c.strip()]
            if species_codes:
                qs = models.Species.objects.filter(scientific_code__in=species_codes)
                perm.species_list.set(qs)

    def _parse_date_only(self, value: str | None):
        if not value:
            return None
        value = value.strip()
        if not value:
            return None
        return datetime.datetime.strptime(value, "%Y-%m-%d").date()