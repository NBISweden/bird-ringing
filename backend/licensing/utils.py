from typing import Iterable
from licensing.models import (
    License,
    LicenseRoleChoices,
)

def get_flattened_license_and_relations(
    licenses: Iterable[License],
    allowed_roles: Iterable[int] = (LicenseRoleChoices.RINGER, LicenseRoleChoices.HELPER),
):
    for lic in licenses:
        if not lic:
            raise NoCurrentLicense("No license found.")

        relations = lic.actors.filter(role__in=list(allowed_roles)).select_related("actor")
        if not relations.exists():
            raise ValueError(f"No ringers/helpers on license for mnr {lic.sequence.mnr}.")
        
        for relation in relations:
            yield (lic, relation)