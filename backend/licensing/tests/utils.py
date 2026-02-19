from django.contrib.auth.models import User, Permission

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