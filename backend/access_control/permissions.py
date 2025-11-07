from rest_framework import permissions

class IsExpertUser(permissions.BasePermission):
    """
    Custom permission to only allow users in the 'Bird ringing experts' group.
    """

    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.groups.filter(name='Bird ringing experts').exists()
