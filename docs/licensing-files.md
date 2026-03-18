# Data files for licensing

The licensing system requires a number of files stored using the [CSV format](https://en.wikipedia.org/wiki/Comma-separated_values). The files and their required content will be described below. The expectations are driven by the needs of the management command `load_data`.

The following table contains the required files with their id, description and an example filename expected when the command `load_data` is supplied with the flag `--path_format=/bird-ringing-data/{id}.csv`

| File id | File name | Description |
|:------- | :-------- | :---------- |
| Artlista | `/bird-ringing-data/Artlista.csv` | A list of species entries. |
| Maerkare | `/bird-ringing-data/Maerkare.csv` | A list of ringers, stations and affiliate ringers. |
| MarkAss | `/bird-ringing-data/MarkAss.csv` | A list of associate ringers. |
| MarkAssYr | `/bird-ringing-data/MarkAssYr.csv` | A list of years of activity for associate ringers. |
| Tillstand | `/bird-ringing-data/Tillstand.csv` | A table describing permissions assigned to a specific license. |
| TillstProp | `/bird-ringing-data/TillstProp.csv` | A table describing permission properties to be used when describing a permission. |
| TillstTyp | `/bird-ringing-data/TillstTyp.csv` | A table describing permission types to be used when describing a permission. |

## Artlista
Artlista is a table of species with scientific code, name and swedish name.

| Column | Required | Description |
| :----- | :------- | :---------- |
| SVnamn | required | A swedish name for the species. |
| VetKod | required | A scientific code used to identify the species (used as unique identifier when loading data). |
| VetNamn | required | A scientific name of the species. |

## Maerkare
Maerkare is a table combining license and main ringer information.

| Column | Required | Description |
| :----- | :------- | :---------- |
| AdrMnr | required | An communication role referenced through `Mnr`. |
| Adress1 | optional | Address line 1. Loaded into ringer `address`. |
| Adress2 | optional | Address line 2. Loaded into ringer `address`. |
| Adress3 | optional | Address line 3. Loaded into ringer `co_address`. |
| AssMnr1 | required | An affiliate referenced through `Mnr`. |
| AssMnr2 | required | An affiliate referenced through `Mnr`. |
| AssMnr3 | required | An affiliate referenced through `Mnr`. |
| Email | optional | The e-mail address of the ringer. |
| Enamn | optional | The last name of the ringer. |
| Fnamn | optional | The first name of the ringer. |
| Fyr | optional | The birth year of the ringer. |
| Kommunnamn | optional | The name of the Kommun where the licensed activity is performed. |
| Lastredov | optional | I not null, the license will have the status `ReportStatusChoices.INCOMPLETE`. Overriden by `Slutredov`. |
| LicDatum | optional | The date at which the license was created. |
| Ljud | conditional | Indicates if the license has the Ljud permission. Only if `--include_legacy_permissions` is included in `load_data`. |
| LnNamn | optional | The name of the Län where the licensed activity is performed. |
| Mappnamn | optional | A reference name to external resource. |
| Mistnet | conditional | Indicates if the license has the Mistnet permission. Only if `--include_legacy_permissions` is included in `load_data`. |
| Mnr | required | The 4 number/letter id of a license. |
| Noteringar | optional | Notes. |
| Ort | optional | The city of the ringer. |
| Postnr | optional | The postal code of the ringer. |
| PriSta | required | The type of ringer Station or Person (S, P). |
| Sex | optional | The sex of the ringer. Only applicable for a Person. |
| Slutredov | optional | If not null, the license will have the status `ReportStatusChoices.YES`.  |
| Spr | optional | The language of the ringer. Allowed options SV, EN. |
| Startyr | optional | The start year of the license. |
| Status | optional | The current status of the license. Allowed options are "Aktiv", "Ej aktiv", "Avslutad" |
| Telarb | optional | The work phone number of the ringer. |
| Telhem | optional | The home phone number of the ringer. |
| Trap | conditional | Indicates if the license has the Trap permission. Only if `--include_legacy_permissions` is included in `load_data`. |

## MarkAss
MarkAss is a table of associate ringers, name and relation information.

| Column | Required | Description |
| :----- | :------- | :---------- |
| ENamn | required | Last name. |
| FNamn | required | First name.  |
| Fritext | optional | Notes. |
| Fyr | optional | Birth year. |
| Mednr | required | A license Mnr local associate ringer 4 character alphanumerical id. |
| Mnr | required | Currently related Mnr. |
| Sex | optional | Sex. |

## MarkAssYr
MarkAssYr is a table of the historic relations for and associate ringer and licenses.

| Column | Required | Description |
| :----- | :------- | :---------- |
| Ar | required | The year during which the associate ringer was related to a license. |
| Mednr | required | The license Mnr local associate ringer id. |
| Mnr | required | The license Mnr. |

## Tillstand
Tillstand is table describing all the permissions associated which a given license. Multiple permissions are allowed for a single `license_mnr`.

| Column | Required | Description |
| :----- | :------- | :---------- |
| description | optional | A description or additional notes for a given permission. |
| ends_at | optional | The date at which a permission ends. |
| license_mnr | required | The Mnr to which the permission is associated. |
| location | optional | A description of the location where activity is allowed. |
| property_codes | optional | A csv list of references to permission properties `TillstProp.property_code`. |
| species_codes | optional | A csv list of references to species `Artlista.VetKod`. |
| starts_at | optional | The date at which the permission starts. |
| type_code | required | A reference to a permission type `TillstTyp.type_code`. |


## TillstProp
TillstProp is a table describing permission properties, intended to add structured details to a permission.

| Column | Required | Description |
| :----- | :------- | :---------- |
| description | optional | A description of the current permission property. Meant for details. |
| name | optional | The name of a permission property. Meant for simplified presentation or listing. |
| property_code | optional | A reference to the current property. |
| related_type_code | optional | A reference to a permission type `TillstTyp.type_code`. |

## TillstTyp
TillstTyp is a table describing permission types, intended to describe the main purpose or topic of a specific permission.

| Column | Required | Description |
| :----- | :------- | :---------- |
| description | optional | A description intended for detailed information about the permission type. |
| name | optional | A name intended for presentation or listing of a permission type.  |
| type_code | optional | A referece to the current permission type. |














