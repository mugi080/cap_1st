from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.core.exceptions import ValidationError
from ..models import CustomUser, Vehicle, LUCENA_BARANGAYS

@api_view(['GET', 'PATCH'])
@permission_classes([IsAuthenticated])
def staff_profile_detail(request):
    if request.user.role != 'staff':
        return Response({"error": "Staff access only"}, status=403)
    
    user = request.user

    if request.method == 'GET':
        return Response({
            'first_name': user.first_name,
            'middle_name': user.middle_name,
            'last_name': user.last_name,
            'address': user.address,
            'contact_number': user.contact_number,
            'preferred_vehicle': user.preferred_vehicle.id if user.preferred_vehicle else None,
            'familiar_barangays': user.familiar_barangays or []
        })

    elif request.method == 'PATCH':
        data = request.data

        # Update basic fields
        user.first_name = data.get('first_name', user.first_name)
        user.middle_name = data.get('middle_name', user.middle_name)
        user.last_name = data.get('last_name', user.last_name)
        user.address = data.get('address', user.address)
        user.contact_number = data.get('contact_number', user.contact_number)

        # Update vehicle
        vehicle_id = data.get('preferred_vehicle')
        if vehicle_id is not None:
            if vehicle_id == "":
                user.preferred_vehicle = None
            else:
                try:
                    vehicle = Vehicle.objects.get(id=vehicle_id, is_available=True)
                    user.preferred_vehicle = vehicle
                except Vehicle.DoesNotExist:
                    return Response({"error": "Invalid or unavailable vehicle"}, status=400)
        # If vehicle_id not provided, leave unchanged

        # Update barangays
        if 'familiar_barangays' in data:
            barangays = data['familiar_barangays']
            valid_names = [name for _, name in LUCENA_BARANGAYS]
            filtered = [b for b in barangays if b in valid_names]
            user.familiar_barangays = filtered

        try:
            user.save()
        except Exception as e:
            return Response({"error": str(e)}, status=400)

        return Response({
            'first_name': user.first_name,
            'middle_name': user.middle_name,
            'last_name': user.last_name,
            'address': user.address,
            'contact_number': user.contact_number,
            'preferred_vehicle': user.preferred_vehicle.id if user.preferred_vehicle else None,
            'familiar_barangays': user.familiar_barangays
        })