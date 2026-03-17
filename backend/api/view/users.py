# views.py
from rest_framework.decorators import api_view, permission_classes, parser_classes
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from ..models import CustomUser, Vehicle, LUCENA_BARANGAYS
from ..serializers import CustomUserReadSerializer
import logging
import json

logger = logging.getLogger(__name__)

@api_view(['PATCH', 'PUT'])
@permission_classes([IsAuthenticated])
@parser_classes([MultiPartParser, FormParser])
def update_user_profile(request):
    try:
        user = request.user

        # --- Update basic profile fields (for all users) ---
        if 'first_name' in request.data:
            user.first_name = request.data['first_name']
        if 'middle_name' in request.data:
            user.middle_name = request.data['middle_name']
        if 'last_name' in request.data:
            user.last_name = request.data['last_name']
        if 'address' in request.data:
            user.address = request.data['address']
        if 'contact_number' in request.data:
            user.contact_number = request.data['contact_number']

        # --- Update profile picture (for all users) ---
        if 'profile_picture' in request.FILES:
            user.profile_picture = request.FILES['profile_picture']

        # --- Handle staff-specific preferences (ONLY if user is staff) ---
        if user.role == 'staff':
            # Update preferred vehicle
            if 'preferred_vehicle' in request.data:
                vehicle_id = request.data['preferred_vehicle']
                if not vehicle_id or vehicle_id in ["", "null", "undefined"]:
                    user.preferred_vehicle = None
                else:
                    try:
                        vehicle = Vehicle.objects.get(id=vehicle_id, is_available=True)
                        user.preferred_vehicle = vehicle
                    except Vehicle.DoesNotExist:
                        # Silently ignore invalid vehicle (or log if needed)
                        pass

            # Update familiar barangays
            if 'familiar_barangays' in request.data:
                try:
                    # Parse JSON string sent from frontend
                    barangays = json.loads(request.data['familiar_barangays'])
                    if isinstance(barangays, list):
                        valid_names = [name for _, name in LUCENA_BARANGAYS]
                        user.familiar_barangays = [b for b in barangays if b in valid_names]
                except (ValueError, TypeError):
                    # If parsing fails, keep current value
                    pass

        # Save all changes
        user.save()

        # Return updated profile
        serializer = CustomUserReadSerializer(user, context={'request': request})
        return Response({
            "message": "Profile updated successfully.",
            "user": serializer.data
        }, status=status.HTTP_200_OK)

    except Exception as e:
        logger.error(f"Error updating profile: {str(e)}")
        return Response(
            {"error": "Failed to update profile."},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )