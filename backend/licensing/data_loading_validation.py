import re
import datetime
import csv


class ColumnValidator:
    def __init__(self, required=False, validator=None):
        self.required = required
        self.validator = validator

    def get_errors(self, value):
        if value is None and self.required:
            return ["Missing column"]
        if self.validator is not None and value is not None:
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


def year_validator(value):
    if value == "<97":
        return
    int(value)


def birth_date_or_year_validator(value: str | None):
    """
    Accepts:
        - "YYYY" (year only)
        - common date variants with separators: '-', '/', ':', '.', whitespace
    """
    if not value:
        return

    s = str(value).strip()
    if not s:
        return

    # year only
    if re.fullmatch(r"\d{4}", s):
        return

    # normalize separators to "-"
    s = re.sub(r"[./:\s]+", "-", s).strip("-")

    allowed_formats = ["%Y-%m-%d", "%d-%m-%Y"]

    last_err: Exception | None = None
    for fmt in allowed_formats:
        try:
            datetime.datetime.strptime(s, fmt).date()
            return
        except ValueError as e:
            last_err = e

    raise ValueError(f"Invalid Fyr format: {value!r} (normalized={s!r}).") from last_err


class MaerkareRowValidator(RowValidator):
    columns = {
        "Mnr": ColumnValidator(required=True),
        "PriSta": ColumnValidator(required=True, validator=enum_validator({"P", "S"})),
        "Spr": ColumnValidator(validator=enum_validator({"SV", "EN"})),
        "Fyr": ColumnValidator(validator=birth_date_or_year_validator),
    }

    def get_references(self, row):
        return [("mnr", row["Mnr"])]

    def get_required_references(self, row):
        return [
            (ref, ("mnr", row[ref]))
            for ref in ["AdrMnr", "AssMnr1", "AssMnr2", "AssMnr3"]
            if ref in row
        ]


class MedhjRowValidator(RowValidator):
    columns = {
        "ENamn": ColumnValidator(required=True),
        "FNamn": ColumnValidator(required=True),
        "Mednr": ColumnValidator(required=True),
        "Mnr": ColumnValidator(required=True),
        "Fyr": ColumnValidator(validator=birth_date_or_year_validator),
        "Role": ColumnValidator(validator=enum_validator({"A", "O", "R"})),
    }

    def get_references(self, row):
        return [("markass", row["Mnr"], row["Mednr"])]

    def get_required_references(self, row):
        return [("Mnr", ("mnr", row["Mnr"]))]


class MarkAssYrRowValidator(RowValidator):
    columns = {
        "Ar": ColumnValidator(required=True, validator=year_validator),
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
            for code in row.get("species_codes", "").split(";")
            if code
        ]
        property_refs = [
            ("property_codes", ("permission_property", code))
            for code in row.get("property_codes", "").split(";")
            if code
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

                try:
                    references.update(validator.get_references(entry))
                    required_references.extend([
                        (key, index, reference)
                        for reference in validator.get_required_references(entry)
                    ])

                except KeyError:
                    pass

        for (key, index, (context, reference)) in required_references:
            if reference not in references:
                errors.append((key, index, context, f"Missing reference {reference}"))

        return errors


class CSVLoader:
    """
    The purpose of the CSVLoader is to abstract the use of loaded data so that
    the system can focus on the naming of the data rather than on where it is
    or which format it is provided in.

    The loader will read csv files using a path_format, provided by the user,
    to find the correct file to read for a given name.
    """

    def __init__(self, path_format: str, dialect: str = "excel"):
        self._path_format = path_format
        self._dialect = dialect

    def get_dict_list(self, id: str):
        path = self._path_format.format(id=id)
        with open(path, "r", encoding="utf-8") as f:
            reader = csv.DictReader(f, dialect=self._dialect)
            return [self._clean_data(row) for row in reader]

    def __getitem__(self, id: str):
        return self.get_dict_list(id)

    def _clean_data(self, row):
        return {
            key: value.strip()
            for key, value in row.items()
            if value != "NULL" and key is not None and value is not None
        }


def get_collection_validator():
    return CollectionValidator({
        "Artlista": ArtlistaRowValidator(),
        "Maerkare": MaerkareRowValidator(),
        "Medhj": MedhjRowValidator(),
        "MarkAssYr": MarkAssYrRowValidator(),
        "Tillstand": TillstandRowValidator(),
        "TillstProp": TillstPropRowValidator(),
        "TillstTyp": TillstTypRowValidator(),
    })


def validate(loader):
    validator = get_collection_validator()
    errors = validator.get_errors(loader)
    for (key, index, column, error) in errors:
        with_line = f" on line {index + 2}" if index is not None else ""
        with_column = f" in column {column}" if column is not None else ""
        print(f"Error in {key}{with_line}{with_column}: {error}")
    if len(errors) > 0:
        exit(1)


if __name__ == "__main__":
    import sys
    import os

    csv.register_dialect("nrm", delimiter=";")
    if len(sys.argv) > 1:
        dialect = sys.argv[2] if len(sys.argv) > 2 else "excel"
        loader = CSVLoader(sys.argv[1], dialect)

        validate(loader)
    else:
        filename = os.path.basename(__file__)
        dialect_names = csv.list_dialects()
        print(
            f"{filename}: \n"
            "Description:\n"
            "This script tries to validate a set of files to be loaded into the Bird ringing system. "
            "It expects to be supplied with a complete set of files as described by 'docs/licensing-files.md'. "
            "The files are expected to be located in the same folder and follow a consistent naming pattern "
            "described by the example 'data/{id}.csv' where '{id}' will be replaced by the table id from 'docs/licensing-files.md'."
            "\n\n"
            f"Usage: python {filename} <path_format> (dialect)\n"
            "- path_format: Should follow the example 'data/{id}.csv'\n"
            f"- dialect(optional): {' | '.join(dialect_names)}\n"
            "\n"
            f"Example usage: python {filename} data/{{id}}.csv\n"
            f"Example usage: python {filename} data/{{id}}.csv nrm"
        )
        exit(1)
