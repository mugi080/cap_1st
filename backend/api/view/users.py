from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from ..models import CustomUser

import logging
logger = logging.getLogger(__name__)

@api_view(['PUT'])
@permission_classes([IsAuthenticated])
def update_user_profile(request):
    """
    Update the logged-in user's profile (e.g., name, address, contact number)
    """
    try:
        # Get the authenticated user
        user = request.user

        # Get the new fields from the request data
        new_name = request.data.get("name")
        new_address = request.data.get("address")
        new_contact_number = request.data.get("contact_number")

        # Validate the new name if provided
        if new_name is not None:
            user.first_name = new_name

        # Validate the new address if provided
        if new_address is not None:
            user.address = new_address

        # Validate the new contact number if provided
        if new_contact_number is not None:
            user.contact_number = new_contact_number

        # Save the updated user object
        user.save()

        return Response({
            "message": "Profile updated successfully.",
            "user": {
                "id": user.id,
                "first_name": user.first_name,
                "email": user.email,
                "address": user.address,
                "contact_number": user.contact_number
            }
        }, status=status.HTTP_200_OK)

    except Exception as e:
        logger.error(f"Error updating user profile: {str(e)}")
        return Response({"error": "Failed to update profile."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


