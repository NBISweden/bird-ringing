# Data files for licensing

The licensing system requires a number of files stored using the [CSV format](https://en.wikipedia.org/wiki/Comma-separated_values). The files and their required content will be described below. The expectations are driven by the needs of the management command `load_data`.

The following table presents a table of the required files with their id, description and an example filename expected when the command `load_data` is supplied with the flag `--path_format=/bird-ringing-data/{id}.csv`

| File id | File name | Description |
|:------- | :-------- | :---------- |
| Artlista | `/bird-ringing-data/Artlista.csv` | A list of species entries |
| Maerkare | `/bird-ringing-data/Maerkare.csv` | A list of ringers, stations and affiliate ringers |
| MarkAss | `/bird-ringing-data/MarkAss.csv` | A list of associate ringers |
| MarkAssYr | `/bird-ringing-data/MarkAssYr.csv` | A list of years of activity for associate ringers |
| Tillstand | `/bird-ringing-data/Tillstand.csv` | A table describing permissions assigned to a specific license |
| TillstProp | `/bird-ringing-data/TillstProp.csv` | A table describing permission properties to be used when describing a permission |
| TillstTyp | `/bird-ringing-data/TillstTyp.csv` | A table describing permission types to be used when describing a permission |

## Artlista

| Table | Column | Required | Description |
|:----- | :----- | :------- | :---------- |
| Artlista | SVnamn | required | A swedish name for the species. |
| Artlista | VetKod | required | A scientific code used to identify the species (used as unique identifier when loading data). |
| Artlista | VetNamn | required | A scientific name of the species. |

## Maerkare
Maerkare is a table combining license and main ringer information.

| Table | Column | Required | Description |
|:----- | :----- | :------- | :---------- |
| Maerkare | AdrMnr | required | An communication role referenced through `Mnr`. |
| Maerkare | Adress1 | optional | Adress line 1. Loaded into ringer `address`. |
| Maerkare | Adress2 | optional | Adress line 2. Loaded into ringer `address`. |
| Maerkare | Adress3 | optional | Adress line 3. Loaded into ringer `co_address`. |
| Maerkare | AssMnr1 | required | An affiliate referenced through `Mnr`. |
| Maerkare | AssMnr2 | required | An affiliate referenced through `Mnr`. |
| Maerkare | Email | optional | The e-mail address of the ringer. |
| Maerkare | Enamn | optional | The last name of the ringer. |
| Maerkare | Fnamn | optional | The first name of the ringer. |
| Maerkare | Fyr | optional | The birth year of the ringer. |
| Maerkare | Kommunnamn | optional | The name of the Kommun where the licensed activity is performed. |
| Maerkare | LicDatum | optional | The date at which the license was created. |
| Maerkare | LnNamn | optional | The name of the Län where the licensed activity is performed. |
| Maerkare | Mappnamn | optional | A reference name to external resource. |
| Maerkare | Mnr | required | The 4 number/letter id of a license. |
| Maerkare | Noteringar | optional | Notes. |
| Maerkare | Ort | optional | The city of the ringer. |
| Maerkare | Postnr | optional | The postal code of the ringer. |
| Maerkare | PriSta | required | The type of ringer Station or Person (S, P). |
| Maerkare | Sex | optional | The sex of the ringer. Only applicable for a Person. |
| Maerkare | Spr | optional | The language of the ringer. Allowed options SV, EN. |
| Maerkare | Startyr | optional | The start year of the license. |
| Maerkare | Status | optional | The current status of the license. Allowed options are "Aktiv", "Ej aktiv", "Avslutad" |
| Maerkare | Telarb | optional | The work phone number of the ringer. |
| Maerkare | Telhem | optional | The home phone number of the ringer. |

## MarkAss
MarkAss is a table of associate ringers, name and relation information.

| Table | Column | Required | Description |
|:----- | :----- | :------- | :---------- |
| MarkAss | ENamn | required | Last name. |
| MarkAss | FNamn | required | First name.  |
| MarkAss | Fritext | optional | Notes. |
| MarkAss | Fyr | optional | Birth year. |
| MarkAss | Mednr | required | A license Mnr local associate ringer 4 character alphanumerical id. |
| MarkAss | Mnr | required | Currently related Mnr. |
| MarkAss | Sex | optional | Sex. |

## MarkAssYr
MarkAssYr is a table of the historic relations for and associate ringer and licenses.

| Table | Column | Required | Description |
|:----- | :----- | :------- | :---------- |
| MarkAssYr | Ar | required | The year during which the associate ringer was related to a license. |
| MarkAssYr | Mednr | required | The license Mnr local associate ringer id. |
| MarkAssYr | Mnr | required | The license Mnr. |

## Tillstand
Tillstand is table describing all the permissions associated which a given license. Multiple permissions are allowed for a single `license_mnr`.

| Table | Column | Required | Description |
|:----- | :----- | :------- | :---------- |
| Tillstand | description | optional | A description or additional notes for a given permission. |
| Tillstand | ends_at | optional | The date at which a permission ends. |
| Tillstand | license_mnr | required | The Mnr to which the permission is associated. |
| Tillstand | location | optional | A description of the location where activity is allowed. |
| Tillstand | property_codes | optional | A csv list of references to permission properties `TillstProp.property_code`. |
| Tillstand | species_codes | optional | A csv list of references to species `Artlista.VetKod`. |
| Tillstand | starts_at | optional | The date at which the permission starts. |
| Tillstand | type_code | required | A reference to a permission type `TillstTyp.type_code`. |


## TillstProp
TillstProp is a table describing permission properties, intended to add structured details to a permission.

| Table | Column | Required | Description |
|:----- | :----- | :------- | :---------- |
| TillstProp | description | optional | A description of the current permission property. Meant for details. |
| TillstProp | name | optional | The name of a permission property. Meant for simplified presentation or listing. |
| TillstProp | property_code | optional | A reference to the current property. |
| TillstProp | related_type_code | optional | A reference to a permission type `TillstTyp.type_code`. |

## TillstTyp
TillstTyp is a table describing permission types, intended to describe the main purpose or topic of a specific permission.

| Table | Column | Required | Description |
|:----- | :----- | :------- | :---------- |
| TillstTyp | description | optional | A description intended for detailed information about the permission type. |
| TillstTyp | name | optional | A name intended for presentation or listing of a permission type.  |
| TillstTyp | type_code | optional | A referece to the current permission type. |














