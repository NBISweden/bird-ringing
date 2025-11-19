from rest_framework.permissions import BasePermission
from django.conf import settings

# IsInGroup wraps the GroupPermission class allowing to pass
#  the group name as argument
def IsInGroup(group_key):
    group_name = settings.GROUP_NAMES.get(group_key)

    class GroupPermission(BasePermission):
        def has_permission(self, request, view):
            user = request.user
            return (
                user and
                user.is_authenticated and
                user.groups.filter(name=group_name).exists()
            )

    return GroupPermission

