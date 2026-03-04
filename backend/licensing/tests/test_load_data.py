from django.test import TestCase
from licensing import models
from licensing.management.commands.load_data import Command
import datetime
import os


class TestLoadData(TestCase):
    def setUp(self):
        current_year = 2025
        self.command = Command()
        self.command.stdout = open(os.devnull, "w") # Disable output
        self.command.current_year = current_year

        self.species_data = [
            {
                "SVnamn": f"{s}-sv-namn",
                "VetKod": f"{s}-vet-kod",
                "VetNamn": f"{s}-vet-namn",
            }
            for s in ["a", "b", "c"]
        ]

        self.permit_type_data = [
            {
                "type_code": f"{pt}-type_code",
                "name": f"{pt}-name",
                "description": f"{pt}-description",
            }
            for pt in ["a", "b", "c"]
        ]

        self.permit_property_data = [
            {
                "property_code": f"{pp}-property_code",
                "name": f"{pp}-name",
                "description": f"{pp}-description",
            }
            for pp in ["a", "b", "c"]
        ]

        statuses = ["Aktiv", "Ej aktiv", "Avslutad"]
        slutredov = ["Yes", None]
        lastredov = ["Yes", None]
        years = ["1996", "2015", "2025", None]
        self.license_data = [
            {
                "Mnr": str(mnr).zfill(4),
                "Licdatum": "1999-01-01",
                "Status": statuses[mnr % len(statuses)],
                "Noteringar": f"notes-{mnr}",
                "Greenwich": f"location-{mnr}",
                "Mappnamn": f"ref-{mnr}",
                **self._dict_if_value("Slutredov", slutredov[mnr % len(slutredov)]),
                **self._dict_if_value("Lastredov", lastredov[mnr % len(lastredov)]),
                **self._dict_if_value("Startyr", years[mnr % len(years)]),
            }
            for mnr in range(1, 10)
        ]
        prista = ["S", "P"]
        sex = ["M", "F", None]
        self.ringer_data = [
            {
                "Mnr": entry["Mnr"],
                "PriSta": prista[index % len(prista)],
                "Fnamn": f"fnamn-{entry['Mnr']}",
                "Enamn": f"enamn-{entry['Mnr']}",
                "Spr": "SV",
                "Telhem": "+46012345",
                "Telarb": "+46543210",
                "Email": f"{entry['Mnr']}@example.local",
                "Adress1": "",
                "Adress2": "",
                "Adress3": "",
                "Postnr": "12345",
                **self._dict_if_value("Sex", sex[index % len(sex)]),
                **self._dict_if_value("Fyr", years[index % len(years)]),
            }
            for index, entry in enumerate(self.license_data)
        ]
        permit_type_codes = [
            pt["type_code"]
            for pt in self.permit_type_data
        ]
        permit_property_codes = [
            pp["property_code"]
            for pp in self.permit_property_data
        ]
        species_codes = [
            s["VetKod"]
            for s in self.species_data
        ]

        self.permit_data = [
            {
                "license_mnr": ld["Mnr"],
                "type_code": permit_type_codes[index % len(permit_type_codes)],
                "starts_at": str(datetime.date(year=int(ld.get('Startyr', current_year)), month=3, day=1) + datetime.timedelta(days=-1)),
                "ends_at": f"{ld.get('Startyr', current_year)}-10-01",
                "description": f"description-{ld['Mnr']}",
                "species_codes": ";".join(species_codes),
                "property_codes": ";".join(permit_property_codes),
            }
            for index, ld in enumerate(self.license_data)
        ]
        self.associate_ringer_data = [
            {
                "Mednr": str(index).zfill(4),
                "Mnr": self.license_data[index % len(self.license_data)]["Mnr"],
                "FNamn": f"associate-ringer-fnamn-{index}",
                "ENamn": f"associate-ringer-enamn-{index}",
                "Fritext": f"associate-ringer-{index}-fritext",
                **self._dict_if_value("Fyr", years[index % len(years)]),
                **self._dict_if_value("Sex", sex[index % len(sex)]),
            }
            for index in range(1, 10)
        ]
        associate_ringer_years = ["<97", "1999", "2015", "2025"]

        self.associate_ringer_year_data = [
            {
                "Ar": year,
                "Mnr": associate_ringer["Mnr"],
                "Mednr": associate_ringer["Mednr"],
            }
            for associate_ringer in self.associate_ringer_data
            for year in associate_ringer_years
        ]
    
    def test_load_species_data(self):
        self.assertTrue(len(self.species_data) > 0)
        self.command.load_species(self.species_data)

        self.assertEqual(
            [
                (s.name, s.scientific_code, s.scientific_name)
                for s in models.Species.objects.all().order_by("scientific_code")
            ],
            [
                (s["SVnamn"], s["VetKod"], s["VetNamn"])
                for s in self.species_data
            ]
        )
    
    def test_load_ringers(self):
        self.assertTrue(len(self.ringer_data) > 0)
        self.command.load_ringers(self.ringer_data)

        self.assertEqual(
            [
                (
                    r.first_name,
                    r.last_name,
                    r.email,
                )
                for r in models.Actor.objects.all().order_by("id")
            ],
            [
                (r['Fnamn'], r['Enamn'], r['Email'])
                for r in self.ringer_data
            ]
        )

    def test_load_licenses(self):
        self.assertTrue(len(self.license_data) > 0)
        self.command.load_licenses(self.license_data)

        self.assertEqual(
            [
                (
                    lic.version,
                    lic.sequence.mnr,
                    lic.location,
                    lic.description,
                    tuple(doc.reference for doc in lic.documents.all()),
                )
                for lic in models.License.objects.all().order_by("id")
            ],
            [
                (
                    0,
                    lic["Mnr"],
                    lic.get("Greenwich", ""),
                    lic.get("Noteringar", ""),
                    (lic["Mappnamn"],),
                )
                for lic in self.license_data
            ]
        )

    def test_load_permit_types(self):
        self.assertTrue(len(self.permit_type_data) > 0)
        permit_type_map = self.command.load_permit_types(self.permit_type_data)

        self.assertEqual(
            permit_type_map,
            {
                pt["type_code"]: models.LicensePermissionType.objects.get(name=pt["name"])
                for pt in self.permit_type_data
            }
        )
    
    def test_load_permit_properties(self):
        self.assertTrue(len(self.permit_property_data) > 0)
        permit_property_map = self.command.load_permit_properties(self.permit_property_data)

        self.assertEqual(
            permit_property_map,
            {
                pp["property_code"]: models.LicensePermissionProperty.objects.get(name=pp["name"])
                for pp in self.permit_property_data
            }
        )
    
    def test_load_license_permits(self):
        self.assertTrue(len(self.species_data) > 0)
        self.assertTrue(len(self.ringer_data) > 0)
        self.assertTrue(len(self.license_data) > 0)
        self.assertTrue(len(self.permit_type_data) > 0)
        self.assertTrue(len(self.permit_property_data) > 0)

        species_map = self.command.load_species(self.species_data)
        self.command.load_licenses(self.license_data)
        permit_type_map = self.command.load_permit_types(self.permit_type_data)
        permit_property_map = self.command.load_permit_properties(self.permit_property_data)
        self.command.load_license_permits(
            self.permit_data,
            species_map,
            permit_type_map,
            permit_property_map
        )

        permit_type_map = {
            pt["type_code"]: pt
            for pt in self.permit_type_data
        }
        self.assertEqual(
            [
                (
                    lic.sequence.mnr,
                    tuple((
                        perm.type,
                        tuple(
                            prop
                            for prop in perm.properties.all().order_by("id")
                        ),
                        tuple(
                            species
                            for species in perm.species_list.all().order_by("id")
                        )
                    ) for perm in lic.permissions.all().order_by("id"))
                )
                for lic in models.License.objects.all().order_by("id")
            ],
            [
                (
                    p["license_mnr"],
                    ((
                        models.LicensePermissionType.objects.get(name=permit_type_map[p["type_code"]]["name"]),
                        tuple(
                            models.LicensePermissionProperty.objects.get(name=pp["name"])
                            for pp in self.permit_property_data
                        ),
                        tuple(
                            models.Species.objects.get(name=species["SVnamn"])
                            for species in self.species_data
                        )
                    ),)
                )
                for p in self.permit_data
            ]
        )

    def test_load_associate_ringers(self):
        self.assertTrue(len(self.associate_ringer_data) > 0)
        self.command.load_associate_ringers(self.associate_ringer_data)

        self.assertEqual(
            [
                (
                    r.first_name,
                    r.last_name,
                )
                for r in models.Actor.objects.all().order_by("id")
            ],
            [
                (r['FNamn'], r['ENamn'])
                for r in self.associate_ringer_data
            ]
        )
    
    def test_get_relations(self):
        ringer_data = [
            {
                "Mnr": "0001",
                "PriSta": "S",
                "AssMnr1": "0002",
                "AssMnr2": "0003",
            },
            {
                "Mnr": "0002",
                "PriSta": "P",
                "AssMnr1": "0001",
                "AssMnr2": "0003",
            }
        ]
        associate_ringer_year_data = [
            {
                "Ar": "1998",
                "Mnr": "0001",
                "Mednr": "0002",
            },
            {
                "Ar": "<97",
                "Mnr": "0001",
                "Mednr": "0002",
            }
        ]
        relations = self.command.get_relations(ringer_data, associate_ringer_year_data)

        self.assertEqual(
            relations,
            [
                ("0001", "0001", models.LicenseRoleChoices.RINGER, "R000", 2025),
                ("0001", "0001", models.LicenseRoleChoices.RINGER, "R000", 1996),
                ("0001", "0001", models.LicenseRoleChoices.RINGER, "R000", 1998),
                ("0001", "0002", models.LicenseRoleChoices.AFFILIATE, "A000", 2025),
                ("0001", "0002", models.LicenseRoleChoices.AFFILIATE, "A000", 1996),
                ("0001", "0002", models.LicenseRoleChoices.AFFILIATE, "A000", 1998),
                ("0001", "0003", models.LicenseRoleChoices.AFFILIATE, "A001", 2025),
                ("0001", "0003", models.LicenseRoleChoices.AFFILIATE, "A001", 1996),
                ("0001", "0003", models.LicenseRoleChoices.AFFILIATE, "A001", 1998),
                ("0002", "0002", models.LicenseRoleChoices.RINGER, "R000", 2025),
                ("0002", "0001", models.LicenseRoleChoices.AFFILIATE, "A000", 2025),
                ("0002", "0003", models.LicenseRoleChoices.AFFILIATE, "A001", 2025),
                ("0001", ("0001", "0002"), models.LicenseRoleChoices.ASSOCIATE_RINGER, "0002", 1998),
                ("0001", ("0001", "0002"), models.LicenseRoleChoices.ASSOCIATE_RINGER, "0002", 1996),
            ]
        )
    
    def test_load_relations(self):
        self.assertTrue(len(self.species_data) > 0)
        self.assertTrue(len(self.ringer_data) > 0)
        self.assertTrue(len(self.license_data) > 0)
        self.assertTrue(len(self.permit_type_data) > 0)
        self.assertTrue(len(self.permit_property_data) > 0)
        self.assertTrue(len(self.associate_ringer_data) > 0)
        self.assertTrue(len(self.associate_ringer_year_data) > 0)

        species_map = self.command.load_species(self.species_data)
        self.command.load_licenses(self.license_data)
        permit_type_map = self.command.load_permit_types(self.permit_type_data)
        permit_property_map = self.command.load_permit_properties(self.permit_property_data)
        self.command.load_license_permits(
            self.permit_data,
            species_map,
            permit_type_map,
            permit_property_map
        )

        ringer_map = self.command.load_ringers(self.ringer_data)
        associate_ringer_map = self.command.load_associate_ringers(self.associate_ringer_data)
        relations = self.command.get_relations(self.ringer_data, self.associate_ringer_year_data)
        self.assertTrue(len(relations) > 0)
        self.command.load_relations({**ringer_map, **associate_ringer_map}, relations)

        for sequence in models.LicenseSequence.objects.all():
            self.assertFalse(sequence.latest.version == 0)
            latest_dump = sequence.latest.dump()
            self.assertEqual(
                sequence.current.dump(),
                latest_dump,
                "Make sure that latest is equal to current"
            )

            for lic in models.License.objects.filter(sequence=sequence).exclude(version=0):
                self.assertEqual(
                    self._filter_license_dump(latest_dump),
                    self._filter_license_dump(lic.dump()),
                    "Make sure that all license content is the same except starts_at and ends_at"
                )
    
    def test_handle_import_same_data(self):
        self.command.handle(
            loader=self._get_loader(),
            current_year=self.command.current_year
        )

        license_dumps = [
            lic.dump()
            for lic in models.License.objects.all().order_by("id")
        ]

        self.command.handle(
            loader=self._get_loader(),
            current_year=self.command.current_year
        )
        
        next_license_dumps = [
            lic.dump()
            for lic in models.License.objects.all().order_by("id")
        ]

        self.assertEqual(
            license_dumps,
            next_license_dumps,
            "All license instances should be unchanged when loading the same data twice"
        )
    
    def test_handle_import_multiple_years(self):
        self.command.handle(
            loader=self._get_loader(),
            current_year=self.command.current_year
        )

        license_dumps = self._get_license_dump()

        self.command.handle(
            loader=self._get_loader(),
            current_year=self.command.current_year + 1
        )
        
        next_license_dumps = self._get_license_dump()

        self.assertEqual(
            license_dumps,
            next_license_dumps[0:len(license_dumps)],
            "All previous license instances should be unchanged when data with a new year"
        )

        for seq in models.LicenseSequence.objects.all():
            other_instances = list(models.License.objects.exclude(starts_at__year=self.command.current_year).filter(sequence=seq))
            latest_dump = seq.latest.dump()
            for lic in other_instances:
                self.assertEqual(
                    self._filter_license_dump(latest_dump),
                    self._filter_license_dump(lic.dump()),
                    "A licenses sharing similar data over different years should be comparable"
                )
    
    def test_handle_import_multiple_years_with_change(self):
        self.command.handle(
            loader=self._get_loader(),
            current_year=self.command.current_year
        )

        license_dumps = self._get_license_dump()

        self.command.handle(
            loader=self._get_loader({
                "Maerkare": [
                    {**lic, **ring, "Noteringar": lic["Noteringar"] + "-change"}
                    for (ring, lic) in zip(self.ringer_data, self.license_data)
                ],
            }),
            current_year=self.command.current_year + 1
        )
        
        next_license_dumps = self._get_license_dump()

        self.assertEqual(
            license_dumps,
            next_license_dumps[0:len(license_dumps)],
            "All previous license instances should be unchanged when data with a new year"
        )

        for seq in models.LicenseSequence.objects.all():
            other_instances = list(models.License.objects.exclude(starts_at__year=self.command.current_year).filter(sequence=seq))
            latest_dump = seq.latest.dump()
            for lic in other_instances:
                self.assertNotEqual(
                    self._filter_license_dump(latest_dump),
                    self._filter_license_dump(lic.dump()),
                    "Licenses with changes loaded at different times should not be comparable"
                )

    def test_handle_import_updated_permit(self):
        self.command.handle(
            loader=self._get_loader(),
            current_year=self.command.current_year
        )

        for seq in models.LicenseSequence.objects.all():
            query = models.License.objects.filter(sequence=seq, starts_at__year=self.command.current_year).order_by("version")
            self.assertEqual(
                query.count(),
                2,
                "Expect there to be exactly 2 variants. 'current' and 'latest' instance for current_year"
            )
            [current, latest] = list(query)
            self.assertEqual(
                [current.version, latest.version],
                [0, seq.latest.version]
            )

        self.command.handle(
            loader=self._get_loader({
                "Tillstand": [
                    {**entry, "description": entry["description"] + "-change"}
                    for entry in self.permit_data
                ],
            }),
            current_year=self.command.current_year
        )

        for seq in models.LicenseSequence.objects.all():
            query = models.License.objects.filter(sequence=seq, starts_at__year=self.command.current_year).order_by("version")
            self.assertEqual(
                query.count(),
                3,
                "Expect there to be exactly 3 variants. 'current', 'latest' and the initially loaded instance for current_year"
            )
            [current, previous, latest] = list(query)
            self.assertEqual(
                [current.version, previous.version],
                [0, latest.version - 1]
            )

    def test_handle_import_with_legacy_permits(self):
        legacy_permissions = {
            "Mistnet": "J",
            "Ljud": "J",
            "Trap": "J"
        }
        legacy_perm_tag = "legacy-permissions"
        self.command.handle(
            loader=self._get_loader({
                "Maerkare": [
                    {
                        **lic,
                        **ring,
                        **(legacy_permissions if index % 2 else {}),
                        "Noteringar": (legacy_perm_tag if index % 2 else "")
                    }
                    for index, (ring, lic) in enumerate(zip(self.ringer_data, self.license_data))
                ],
            }),
            current_year=self.command.current_year,
            include_legacy_permissions=True
        )

        for permission_type_name in legacy_permissions.keys():
            permission_type = models.LicensePermissionType.objects.filter(name=permission_type_name).first()
            self.assertNotEqual(
                None,
                permission_type,
                "Make sure all permission types were created"
            )
        
        permission_type_names = set(legacy_permissions.keys())

        licenses_with_legacy_permissions_query = models.License.objects.filter(description=legacy_perm_tag)
        self.assertFalse(licenses_with_legacy_permissions_query.count() == 0)
        for lic in licenses_with_legacy_permissions_query:
            permissions = lic.permissions.filter(type__name__in=permission_type_names)
            lic_permission_type_names = set(perm.type.name for perm in permissions)
            self.assertEqual(
                permission_type_names,
                lic_permission_type_names,
                "All legacy permission types should be represented all licenses have a tagged description"
            )
        
        licenses_without_legacy_permissions_query = models.License.objects.exclude(description=legacy_perm_tag)
        self.assertFalse(licenses_without_legacy_permissions_query.count() == 0)
        for lic in licenses_without_legacy_permissions_query:
            permissions = lic.permissions.filter(type__name__in=permission_type_names)
            lic_permission_type_names = set(perm.type.name for perm in permissions)
            self.assertEqual(
                set(),
                lic_permission_type_names,
                "No legacy permissions are assigned to licenses without a tegged description"
            )

    def _get_license_dump(self):
        return [
            lic.dump()
            for lic in models.License.objects.exclude(version=0).order_by("id")
        ]
    
    def _get_loader(self, data: dict = None):
        data = {} if data is None else data
        return DictLoader({
            "Artlista": self.species_data,
            "Maerkare": [
                {**lic, **ring}
                for (ring, lic) in zip(self.ringer_data, self.license_data)
            ],
            "TillstTyp": self.permit_type_data,
            "TillstProp": self.permit_property_data,
            "MarkAss": self.associate_ringer_data,
            "MarkAssYr": self.associate_ringer_year_data,
            "Tillstand": self.permit_data,
            **data,
        })

    def _dict_if_value(self, key: str, value):
        return {} if value is None else {key: value}
    
    def _filter_license_dump(self, license_dump):
        (location, description, report_status, _s, _e, documents, permissions) = license_dump

        clean_permissions = [
            self._filter_permission_dump(permission)
            for permission in permissions
        ]

        return (
            location,
            description,
            report_status,
            documents,
            clean_permissions
        )
    
    def _filter_permission_dump(self, permission_dump):
        (p_type, location, description, _s, _e, species, properties) = permission_dump
        return (
            p_type,
            location,
            description,
            species,
            properties
        )


class DictLoader():
    def __init__(self, data: dict):
        self._data = data

    def get_dict_list(self, id: str):
        return self._data[id]