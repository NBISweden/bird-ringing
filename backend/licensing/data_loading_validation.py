class ColumnValidator:
    def __init__(self, required=False, validator=None):
        self.required = required
        self.validator = validator

    def get_errors(self, value):
        if value is None and self.required:
            return ["Missing column"]
        if self.validator is not None:
            try:
                self.validator(value)
            except ValueError as e:
                return [str(e)]
        return []


class RowValidator:
    columns = None

    def __init__(self, columns=None):
        self.columns = (
            self.columns
            if columns is None
            else columns
        )

        self.columns = (
            dict()
            if self.columns is None
            else self.columns
        )

    def get_errors(self, row):
        errors = []
        for (key, validator) in self.columns.items():
            value = row.get(key)
            errors.extend([
                (key, error)
                for error in validator.get_errors(value)
            ])

        return errors
    
    def get_references(self, row):
        return []
    
    def get_required_references(self, row):
        return []


class ArtlistaRowValidator(RowValidator):
    columns = {
        "SVnamn": ColumnValidator(required=True),
        "VetKod": ColumnValidator(required=True),
        "VetNamn": ColumnValidator(required=True)
    }

    def get_references(self, row):
        return [("species", row["VetKod"])]


def enum_validator(enum_as_set):
    validation_set = set(enum_as_set)
    def _enum_validator(value):
        if value not in validation_set:
            raise ValueError(f"Value {value} is not {validation_set}")
    
    return _enum_validator


class MaerkareRowValidator(RowValidator):
    columns = {
        "Mnr": ColumnValidator(required=True),
        "PriSta": ColumnValidator(required=True, validator=enum_validator({"P", "S"})),
        "Spr": ColumnValidator(validator=enum_validator({"SV", "EN"})),
    }

    def get_references(self, row):
        return [("mnr", row["Mnr"])]
    
    def get_required_references(self, row):
        return [
            (ref, ("mnr", row[ref]))
            for ref in ["AdrMnr", "AssMnr1", "AssMnr2", "AssMnr3"]
            if ref in row
        ]


class MarkAssRowValidator(RowValidator):
    columns = {
        "ENamn": ColumnValidator(required=True),
        "FNamn": ColumnValidator(required=True),
        "Mednr": ColumnValidator(required=True),
        "Mnr": ColumnValidator(required=True),
    }

    def get_references(self, row):
        return [("markass", row["Mnr"], row["Mednr"])]

    def get_required_references(self, row):
        return [("Mnr", ("mnr", row["Mnr"]))]


class MarkAssYrRowValidator(RowValidator):
    columns = {
        "Ar": ColumnValidator(required=True),
        "Mednr": ColumnValidator(required=True),
        "Mnr": ColumnValidator(required=True),
    }

    def get_required_references(self, row):
        return [
            ("Mnr", ("mnr", row["Mnr"])),
            (("Mnr", "Mednr"), ("markass", row["Mnr"], row["Mednr"]))
        ]


class TillstandRowValidator(RowValidator):
    columns = {
        "license_mnr": ColumnValidator(required=True),
        "type_code": ColumnValidator(required=True),
    }

    def get_required_references(self, row):
        species_refs = [
            ("species_codes", ("species", code))
            for code in row.get("species_codes").split(";")
        ]
        property_refs = [
            ("property_codes", ("permission_property", code))
            for code in row.get("property_codes").split(";")
        ]
        return [
            ("license_mnr", ("mnr", row["license_mnr"])),
            *species_refs,
            *property_refs,
        ]


class TillstPropRowValidator(RowValidator):
    columns = {
        "name": ColumnValidator(required=True),
        "property_code": ColumnValidator(required=True),
    }

    def get_references(self, row):
        return [("permission_property", row["property_code"])]

    def get_required_references(self, row):
        return [
            *(
                [("related_type_code", ("permission_type", row["related_type_code"]))]
                if "related_type_code" in row else []
            ),
        ]


class TillstTypRowValidator(RowValidator):
    columns = {
        "name": ColumnValidator(required=True),
        "type_code": ColumnValidator(required=True),
    }

    def get_references(self, row):
        return [("permission_type", row["type_code"])]



class CollectionValidator:
    def __init__(self, table_validators):
        self._table_validators = table_validators
    
    def get_errors(self, tables):
        errors = []
        references = set()
        required_references = []
        for (key, validator) in self._table_validators.items():
            table = tables[key]
            for index, entry in enumerate(table):
                errors.extend([
                    (key, index, column, error)
                    for (column, error) in validator.get_errors(entry)
                ])
                references.update(validator.get_references(entry))
                required_references.extend([
                    (key, index, reference)
                    for reference in validator.get_required_references(entry)
                ])

        for (key, index, (context, reference)) in required_references:
            if reference not in references:
                errors.append((key, index, context, f"Missing reference {reference}"))

        return errors


def get_collection_validator():
    return CollectionValidator({
        "Artlista": ArtlistaRowValidator(),
        "Maerkare": MaerkareRowValidator(),
        "MarkAss": MarkAssRowValidator(),
        "MarkAssYr": MarkAssYrRowValidator(),
        "Tillstand": TillstandRowValidator(),
        "TillstProp": TillstPropRowValidator(),
        "TillstTyp": TillstTypRowValidator(),
    })