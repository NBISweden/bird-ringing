from licensing import models
from django.db import transaction
from django.contrib.auth.models import User
from django.core.management.base import BaseCommand
import datetime
from django.utils.timezone import make_aware
import csv
import logging
import re
from dataclasses import dataclass


logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class BirthParsed:
    birth_date: datetime.date | None
    birth_year: int | None


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
            return [self._clean_data(row) for row in reader]

    def _clean_data(self, row):
        return {key: value.strip() for key, value in row.items() if value != "NULL" and key is not None}


def log_action(func):
    def _func(self, *args, **kwargs):
        self.stdout.write(f"{func.__name__}")
        return func(self, *args, **kwargs)
    return _func


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
        loader = (
            options["loader"]
            if "loader" in options
            else CSVLoader(options.get("path_format"))
        )
        self.current_year = options.get("current_year")

        # default skip legacy permissions unless explicitly included (can be refactored later)
        self.include_legacy_permissions = bool(options.get("include_legacy_permissions"))

        with transaction.atomic():
            ringer_license_entries = loader.get_dict_list("Maerkare")
            self.species_map = self.load_species(loader.get_dict_list("Artlista"))
            ringer_map = self.load_ringers(ringer_license_entries)
            self.load_licenses(ringer_license_entries)
            permit_types_data = [
                *loader.get_dict_list("TillstTyp"),
                *(self._get_legacy_permission_types() if self.include_legacy_permissions else [])
            ]
            self.permit_type_map = self.load_permit_types(permit_types_data)
            self.permit_property_map = self.load_permit_properties(loader.get_dict_list("TillstProp"))
            permit_data = [
                *loader.get_dict_list("Tillstand"),
                *(self._get_legacy_permit_data(ringer_license_entries) if self.include_legacy_permissions else [])
            ]
            self.load_license_permits(
                permit_data,
                self.species_map,
                self.permit_type_map,
                self.permit_property_map
            )
            associate_ringer_map = self.load_associate_ringers(loader.get_dict_list("MarkAss"))
            relations = self.get_relations(ringer_license_entries, loader.get_dict_list("MarkAssYr"))
            self.load_relations({**ringer_map, **associate_ringer_map}, relations)
            for sequence_import in models.LicenseSequenceImport.objects.all():
                current = sequence_import.item.current
                (license_import, _created) = models.LicenseImport.objects.get_or_commit(current, f"commit-{datetime.datetime.now().isoformat()}")
                self.stdout.write(f"Import: {license_import.key}")

    @log_action
    def load_ringers(self, ringer_license_entries: list[dict]):
        ringer_map = dict()
        for ringer_license_data in ringer_license_entries:
            mnr = ringer_license_data["Mnr"]
            try:
                ringer_actor = self.load_ringer(ringer_license_data)
                ringer_map[mnr] = ringer_actor
            except (KeyError, ValueError) as e:
                logger.warning(
                    f"Failed to load ringer {mnr}: {type(e).__name__}, {str(e)}"
                )
        return ringer_map

    @log_action
    def load_licenses(self, ringer_license_entries: list[dict]):
        license_map = dict()
        for ringer_license_data in ringer_license_entries:
            mnr = ringer_license_data["Mnr"]
            try:
                license = self.load_license(ringer_license_data)
                license_map[mnr] = license
            except (KeyError, ValueError) as e:
                logger.warning(
                    f"Failed to load license {mnr}: {type(e).__name__}, {str(e)}"
                )
        return license_map

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
        birth_info = self._parse_birth_date_or_year(ringer_data.get("Fyr"))
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
            birth_date=birth_info.birth_date,
            birth_year=birth_info.birth_year,
            language=language,
            phone_number1=ringer_data.get("Telhem", ""),
            phone_number2=ringer_data.get("Telarb", ""),
            email=ringer_data.get("Email", ""),
            alternative_email="",
            address=(
                ringer_data.get("Adress1", "")
                + " "
                + ringer_data.get("Adress2", "")
            ),
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
        (starts_at, ends_at) = self._parse_period_from_year(current_year)
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

        document_reference = license_data.get("Mappnamn")
        if document_reference:
            (document, _created) = models.LicenseDocument.objects.get_or_create(
                created_by=current_user,
                updated_by=current_user,
                actor=None,
                type=models.DocumentTypeChoices.DOCUMENT,
                data=None,
                reference=document_reference,
                is_permanent=True,
            )

            license.item.documents.set([document])

        return license.item

    @log_action
    def load_species(self, species: list[dict]):
        current_user = self.get_current_user()
        species_map = dict()
        for s in species:
            code = s["VetKod"]
            (obj, _created) = models.SpeciesImport.objects.get_updated_or_create_item(
                created_by=current_user,
                updated_by=current_user,
                name=s["SVnamn"],
                scientific_code=code,
                scientific_name=s["VetNamn"],
            )
            species_map[code] = obj.item
        return species_map

    @log_action
    def load_associate_ringers(self, associate_ringer_entries: list[dict]):
        associate_ringer_map = {
            self._get_associate_ringer_key(associate_ringer_data): self.load_associate_ringer(associate_ringer_data)
            for associate_ringer_data in associate_ringer_entries
        }
        return associate_ringer_map

    @log_action
    def load_relations(self, actor_map: dict, relations: list):
        grouped_relations = dict()
        for relation in relations:
            mnr, actor_key, role, mednr, year = relation
            actor = actor_map[actor_key]
            relation_list = grouped_relations.get((mnr, year), [])
            relation_list.append((actor, role, mednr))
            grouped_relations[(mnr, year)] = relation_list

        for (mnr, year), relations in sorted(grouped_relations.items(), key=lambda i: i[0][1]):
            base_license = models.LicenseSequence.objects.get(mnr=mnr).current
            year_delta = base_license.ends_at.year - base_license.starts_at.year
            base_license.starts_at = self._replace_year(base_license.starts_at, year)
            base_license.ends_at = self._replace_year(base_license.ends_at, year + year_delta)
            base_license.save()
            for permission in base_license.permissions.all():
                if permission.ends_at and permission.starts_at:
                    perm_year_delta = permission.ends_at.year - permission.starts_at.year
                    permission.starts_at = self._replace_year(permission.starts_at, year)
                    permission.ends_at = self._replace_year(permission.ends_at, year + perm_year_delta)
                    permission.save()
            (license_import, created) = models.LicenseImport.objects.get_or_commit(base_license, f"commit-{year}")
            if created:
                lic = license_import.item
                self._apply_relations(lic, relations)

        for sequence_import in models.LicenseSequenceImport.objects.all():
            seq = sequence_import.item
            lic = seq.current
            relations = grouped_relations.get((seq.mnr, lic.starts_at.year))
            if relations:
                self._apply_relations(lic, relations)

    @log_action
    def get_relations(self, ringer_license_entries: list[dict], associate_ringer_year_entries: list[dict]):
        associate_ringer_relations = [
            self.get_associate_ringer_relation(entry)
            for entry in associate_ringer_year_entries
        ]
        ringer_relations = [
            relation
            for entry in ringer_license_entries
            for relation in self.get_ringer_relations(
                entry,
                set([
                    *[rel[-1] for rel in associate_ringer_relations if rel[0] == entry["Mnr"]],
                    self.current_year
                ])
            )
        ]
        
        return [
            *ringer_relations,
            *associate_ringer_relations,
        ]

    def get_ringer_relations(self, ringer_license_data: dict, years: set):
        roles_and_keys = [
            (models.LicenseRoleChoices.RINGER, "Mnr", "R000"),
            *[
                (models.LicenseRoleChoices.AFFILIATE, ass_id, f"A00{i}")
                for i, ass_id in enumerate(["AssMnr1", "AssMnr2", "AssMnr3"])
            ],
            (models.LicenseRoleChoices.COMMUNICATION, "AdrMnr", "ADRM"),
        ]

        license_mnr = ringer_license_data["Mnr"]
        for role, key, mednr in roles_and_keys:
            type = ringer_license_data["PriSta"]
            if key in ringer_license_data and type in {"S", "P"}:
                ringer_mnr = ringer_license_data[key]
                for year in years:
                    yield (license_mnr, ringer_mnr, role, mednr, year)

    def get_associate_ringer_relation(self, associate_ringer_year_data: dict):
        year_str = associate_ringer_year_data["Ar"]
        year_str = "1996" if year_str == "<97" else year_str
        associate_ringer_key = self._get_associate_ringer_key(associate_ringer_year_data)
        mnr, mednr = associate_ringer_key
        return (mnr, associate_ringer_key, models.LicenseRoleChoices.ASSOCIATE_RINGER, mednr, int(year_str))

    def load_associate_ringer(self, associate_ringer_data: dict):
        current_user = self.get_current_user()
        birth_info = self._parse_birth_date_or_year(associate_ringer_data.get("Fyr"))
        first_name = associate_ringer_data["FNamn"]
        last_name = associate_ringer_data["ENamn"]
        sex = {
            "F": models.SexChoices.FEMALE,
            "M": models.SexChoices.MALE,
        }.get(associate_ringer_data.get("Sex"), models.SexChoices.UNDISCLOSED)
        (actor, _created) = models.ActorImport.objects.get_or_create_item(
            created_by=current_user,
            updated_by=current_user,
            type=models.ActorTypeChoices.PERSON,
            birth_date=birth_info.birth_date,
            birth_year=birth_info.birth_year,
            full_name=" ".join([first_name, last_name]),
            first_name=first_name,
            last_name=last_name,
            sex=sex,
            description=associate_ringer_data.get("Fritext", ""),
        )
        return actor.item

    def get_current_user(self):
        user, _created = User.objects.get_or_create(username="legacy_importer")
        return user

    @log_action
    def load_permit_types(self, entries: list[dict]):
        current_user = self.get_current_user()
        permit_type_map = dict()
        for row in entries:
            type_code = row.get("type_code", "")
            if not type_code:
                raise ValueError(f"TillstTyp import error: missing type_code in row={row}")

            name = row.get("name", "")
            if not name:
                raise ValueError(
                    f"TillstTyp import error: missing required name for type_code={type_code} (row={row})"
                )

            (obj, _created) = models.LicensePermissionType.objects.get_or_create(
                created_by=current_user,
                updated_by=current_user,
                name=name,
                description=row.get("description", ""),
            )
            permit_type_map[type_code] = obj
        return permit_type_map

    @log_action
    def load_permit_properties(self, entries: list[dict]):
        current_user = self.get_current_user()
        permit_property_map = dict()
        for row in entries:
            property_code = row.get("property_code", "")
            if not property_code:
                raise ValueError(f"TillstProp import error: missing property_code in row={row}")

            name = row.get("name", "")
            if not name:
                raise ValueError(
                    f"TillstProp import error: missing required name for property_code={property_code} (row={row})"
                )

            related_type_code = row.get("related_type_code", "")
            related_type = self.permit_type_map.get(related_type_code) if related_type_code else None

            (obj, _created) = models.LicensePermissionProperty.objects.get_or_create(
                created_by=current_user,
                updated_by=current_user,
                related_type=related_type,
                name=name,
                description=row.get("description", ""),
            )
            permit_property_map[property_code] = obj
        return permit_property_map

    @log_action
    def load_license_permits(
        self,
        entries: list[dict],
        species_map: dict,
        permit_type_map: dict,
        permit_property_map: dict,
    ):
        current_user = self.get_current_user()

        license_permission_map = dict()
        for row in entries:
            license_mnr = row["license_mnr"]
            permission_list = license_permission_map.get(license_mnr, [])
            permission_list.append(row)
            license_permission_map[license_mnr] = permission_list

        for license_mnr, license_entries in license_permission_map.items():
            license = models.License.objects.get(sequence__mnr=license_mnr, version=0)
            license.permissions.all().delete()
            for row in license_entries:
                type_code = row["type_code"]
                permission_type = permit_type_map[type_code]

                perm = models.LicensePermission.objects.create(
                    created_by=current_user,
                    updated_by=current_user,
                    license=license,
                    type=permission_type,
                    starts_at=self._parse_date_only(row.get("starts_at")),
                    ends_at=self._parse_date_only(row.get("ends_at")),
                    location=row.get("location", ""),
                    description=row.get("description", ""),
                )

                prop_raw = row.get("property_codes", "")
                prop_codes = [c for c in prop_raw.split(";") if c]
                if prop_codes:
                    perm.properties.set([permit_property_map[c] for c in prop_codes])

                species_raw = row.get("species_codes", "")
                species_codes = [c for c in species_raw.split(";") if c]
                if species_codes:
                    try:
                        perm.species_list.set([species_map[sc] for sc in species_codes])
                    except KeyError as e:
                        raise ValueError(
                            "Tillstand import error: unknown species_codes not present in database. "
                            f"license_mnr={license_mnr}, type_code={type_code}, missing={str(e)}, "
                            f"provided={species_codes}"
                        )

    def _apply_relations(self, lic, relations):
        if relations:
            current_user = self.get_current_user()
            lic.actors.all().delete()
            for actor, role, mednr in relations:
                models.LicenseRelation.objects.get_or_create(
                    created_by=current_user,
                    updated_by=current_user,
                    license=lic,
                    actor=actor,
                    mednr=mednr,
                    role=role,
                )

    def _parse_language(self, value: str | None):
        return {"SV": models.LanguageChoices.SV, "EN": models.LanguageChoices.EN}.get(
            value, models.LanguageChoices.UNKNOWN
        )

    def _parse_birth_date_or_year(self, value: str | None) -> BirthParsed:
        """
        Accepts:
          - "YYYY" (year only)
          - common date variants with separators: '-', '/', ':', '.', whitespace
        """
        if not value:
            return BirthParsed(None, None)

        s = str(value).strip()
        if not s:
            return BirthParsed(None, None)

        # year only
        if re.fullmatch(r"\d{4}", s):
            return BirthParsed(birth_date=None, birth_year=int(s))

        # normalize separators to "-"
        s = re.sub(r"[./:\s]+", "-", s).strip("-")

        allowed_formats = ["%Y-%m-%d", "%d-%m-%Y"]

        last_err: Exception | None = None
        for fmt in allowed_formats:
            try:
                dt = datetime.datetime.strptime(s, fmt).date()
                return BirthParsed(birth_date=dt, birth_year=dt.year)
            except ValueError as e:
                last_err = e

        raise ValueError(f"Invalid Fyr format: {value!r} (normalized={s!r}).") from last_err

    def _get_associate_ringer_key(self, associate_ringer_data: dict):
        return (associate_ringer_data["Mnr"], associate_ringer_data["Mednr"])

    def _parse_date(self, date_str: str):
        # Ex. 1999-03-15 00:00:00.000
        return make_aware(datetime.datetime.strptime(date_str, "%Y-%m-%d %H:%M:%S.%f"))
    
    def _parse_period_from_year(self, year):
        starts_at = datetime.date(year=year, month=2, day=1)
        ends_at = datetime.date(year=year + 1, month=1, day=31)
        return (starts_at, ends_at)
    
    def _get_legacy_permission_types(self):
        permission_types = [
            ("Mistnet", "Licensen tillåter användande av nät."),
            ("Ljud", "Licensen tillåter användande av ljud."),
            ("Trap", "Licensen tillåter användande av fällor."),
        ]
        return [
            {
                "name": name,
                "type_code": name.lower(),
                "description": description
            }
            for name, description in permission_types
        ]
    
    def _get_legacy_permit_data(self, license_entries: list[dict]):
        permission_types = [
            entry["name"]
            for entry in self._get_legacy_permission_types()
        ]
        permission_entries = [
            {
                "license_mnr": license_data["Mnr"],
                "type_code": permission_type_name.lower(),
            }
            for license_data in license_entries
            for permission_type_name in permission_types
            if license_data.get(permission_type_name, "N") == "J"
        ]
        return permission_entries
    
    def _replace_year(self, original: datetime.date, year: int):
        try:
            return original.replace(year=year)
        except ValueError:
            return (original - datetime.timedelta(days=1)).replace(year=year)

    def _parse_date_only(self, value: str | None):
        if not value:
            return None
        value = value.strip()
        if not value:
            return None
        return datetime.datetime.strptime(value, "%Y-%m-%d").date()