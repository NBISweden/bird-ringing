from django.contrib.auth.models import User, Permission
from licensing import models


def create_user(username: str, password: str, permissions: list[str] = []):
    new_user = User.objects.create_user(
        username=username,
        password=password,
    )
    for permission_code in permissions:
        permission = Permission.objects.get(codename=permission_code)
        new_user.user_permissions.add(permission)
    new_user.save()
    return new_user


def create_permission(
    lic: models.License,
    permission_type: models.LicensePermissionType,
    properties: list[models.LicensePermissionProperty],
    species: list[models.Species],
    user: User,
    starts_at=str,
    ends_at=str,
):
    permission = models.LicensePermission(
        license=lic,
        type=permission_type,
        starts_at=starts_at,
        ends_at=ends_at,
        created_by=user,
        updated_by=user,
    )
    permission.save()
    permission.properties.set(properties)
    permission.species_list.set(species)

    return permission