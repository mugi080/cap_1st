# api/permissions.py
from rest_framework.permissions import BasePermission

class IsAdminOrStaff(BasePermission):
    """
    Allow access only to admin or staff users.
    """
    def has_permission(self, request, view):
        return request.user.is_authenticated and (request.user.is_staff or request.user.is_superuser)


class IsAdminOrStaffOrRider(BasePermission):
    """
    Allow access to:
    - Admins
    - Staff
    - Riders (but only for orders assigned to them)
    """
    def has_permission(self, request, view):
        # All authenticated users can see list if it's filtered
        return request.user.is_authenticated

    def has_object_permission(self, request, view, obj):
        user = request.user

        # Admins and staff can do anything
        if user.is_staff or user.is_superuser:
            return True

        # Check if user is rider and assigned to the order
        if hasattr(user, 'role') and user.role == 'rider':
            return obj.assigned_staff == user

        return False