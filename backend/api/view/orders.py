# api/views/orders.py
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from rest_framework.response import Response
from rest_framework import status, serializers
from django.db import transaction
from geopy.geocoders import Nominatim
from django.utils import timezone
import logging
import json
import re
from decimal import Decimal
from rest_framework import viewsets

from ..models import Order, OrderItem, Beverage, CustomUser
from ..serializers import OrderSerializer, OrderAdminSerializer
from ..permissions import IsAdminOrStaff

logger = logging.getLogger(__name__)

# Store coordinates (Salvacion Garat BottledDrink Distributor)
STORE_LATITUDE = 13.93299
STORE_LONGITUDE = 121.62603


def extract_philippine_address(address_data):
    """Extract barangay + city from Nominatim reverse geocode result."""
    if not address_data:
        return "Unknown Location"
    
    barangay = (
        address_data.get('suburb') or
        address_data.get('neighbourhood') or
        address_data.get('hamlet') or
        address_data.get('village') or
        "Barangay not detected"
    )
    
    city = (
        address_data.get('city') or
        address_data.get('town') or
        address_data.get('municipality') or
        "Lucena City"
    )
    
    return f"{barangay}, {city}".strip()


def is_coordinate_string(s):
    """Check if string is 'lat, lng' format."""
    if not isinstance(s, str):
        return False
    pattern = r'^-?\d{1,3}\.\d+,\s?-?\d{1,3}\.\d+$'
    return bool(re.match(pattern, s.strip()))


# ----------------------------- PLACE ORDER -----------------------------
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def place_order(request):
    try:
        data = request.data
        items_raw = data.get("items")
        address = data.get("address")
        payment_method = data.get("payment_method")
        delivery_type = data.get("delivery_type", "Pickup")
        barangay = data.get("barangay")  # Always accepted
        contact_number = data.get("contact_number", "")
        gcash_receipt = request.FILES.get("gcash_receipt")

        if delivery_type not in ["Pickup", "Delivered"]:
            return Response({"error": "Invalid delivery type."}, status=status.HTTP_400_BAD_REQUEST)

        # Parse items
        if isinstance(items_raw, str):
            try:
                items = json.loads(items_raw)
            except (TypeError, ValueError, json.JSONDecodeError):
                return Response({"error": "Invalid JSON format for items."}, status=status.HTTP_400_BAD_REQUEST)
        elif isinstance(items_raw, list):
            items = items_raw
        else:
            return Response({"error": "Items must be a list or valid JSON string."}, status=status.HTTP_400_BAD_REQUEST)

        if not isinstance(items, list) or not items:
            return Response({"error": "Invalid or missing items list."}, status=status.HTTP_400_BAD_REQUEST)

        # ✅ ENFORCE MIN 10 CASES FOR DELIVERY ORDERS
        if delivery_type == "Delivered":
            total_cases = sum(Decimal(str(item.get("quantity", 0))) for item in items)
            if total_cases < 10:
                return Response(
                    {"error": "Delivered orders must be at least 10 cases."},
                    status=status.HTTP_400_BAD_REQUEST
                )

        if payment_method == "GCash" and not gcash_receipt:
            return Response({"error": "GCash receipt is required."}, status=status.HTTP_400_BAD_REQUEST)

        # ✅ VALIDATE BARANGAY ONLY FOR DELIVERY
        if delivery_type == "Delivered":
            if not address:
                return Response({"error": "Address is required for delivery."}, status=status.HTTP_400_BAD_REQUEST)
            if not barangay:
                return Response({"error": "Barangay is required for delivery."}, status=status.HTTP_400_BAD_REQUEST)

        # Handle location logic
        latitude = None
        longitude = None
        final_text_address = ""

        geolocator = Nominatim(user_agent="salvacion_garat_app")

        if delivery_type == "Delivered":
            if is_coordinate_string(address):
                try:
                    lat_str, lng_str = address.split(",")
                    latitude = float(lat_str.strip())
                    longitude = float(lng_str.strip())

                    if not (13.89 <= latitude <= 13.98 and 121.58 <= longitude <= 121.67):
                        return Response(
                            {"error": "Delivery location must be within Lucena City."},
                            status=status.HTTP_400_BAD_REQUEST
                        )

                    reverse = geolocator.reverse((latitude, longitude), exactly_one=True, timeout=10)
                    addr_data = reverse.raw.get('address', {}) if reverse else {}
                    final_text_address = extract_philippine_address(addr_data)
                except Exception as e:
                    logger.error(f"Coordinate parsing failed: {e}")
                    final_text_address = "Invalid coordinates"
            else:
                try:
                    location = geolocator.geocode(address, timeout=10)
                    if location:
                        latitude = location.latitude
                        longitude = location.longitude

                        if not (13.89 <= latitude <= 13.98 and 121.58 <= longitude <= 121.67):
                            return Response(
                                {"error": "Delivery location must be within Lucena City."},
                                status=status.HTTP_400_BAD_REQUEST
                            )

                        reverse = geolocator.reverse((latitude, longitude), exactly_one=True, timeout=10)
                        addr_data = reverse.raw.get('address', {}) if reverse else {}
                        final_text_address = extract_philippine_address(addr_data)
                    else:
                        final_text_address = f"Unmappable: {address}"
                except Exception as e:
                    logger.error(f"Geocoding failed for '{address}': {e}")
                    final_text_address = "Address unavailable"
        else:
            # Pickup
            latitude = STORE_LATITUDE
            longitude = STORE_LONGITUDE
            final_text_address = "Pickup at Store"

        # Save order
        order_data = {
            "user": request.user.id,
            "address": address,
            "barangay": barangay,
            "payment_method": payment_method,
            "delivery_type": delivery_type,
            "text_address": final_text_address,
            "contact_number": contact_number,
            "gcash_receipt": gcash_receipt,
        }

        serializer = OrderSerializer(data=order_data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            order = serializer.save(
                latitude=latitude,
                longitude=longitude,
                text_address=final_text_address
            )
            order_items = []

            for item in items:
                beverage_id = item.get("id")
                quantity = item.get("quantity", 1)

                if not beverage_id:
                    return Response({"error": "Beverage ID is required."}, status=status.HTTP_400_BAD_REQUEST)

                try:
                    quantity = Decimal(str(quantity))
                    if quantity <= 0:
                        return Response({"error": "Quantity must be greater than zero."}, status=status.HTTP_400_BAD_REQUEST)
                    if (quantity * 2) % 1 != 0:
                        return Response({
                            "error": "Quantity must be whole or half cases (e.g., 1, 1.5, 2)."
                        }, status=status.HTTP_400_BAD_REQUEST)
                except:
                    return Response({"error": "Invalid quantity format."}, status=status.HTTP_400_BAD_REQUEST)

                try:
                    beverage = Beverage.objects.get(id=beverage_id)
                except Beverage.DoesNotExist:
                    return Response({"error": f"Beverage ID {beverage_id} not found."}, status=status.HTTP_404_NOT_FOUND)

                if beverage.stock < quantity:
                    return Response({
                        "error": f"Not enough stock for {beverage.name}. Available: {beverage.stock}"
                    }, status=status.HTTP_400_BAD_REQUEST)

                beverage.stock -= quantity
                beverage.save()

                order_item = OrderItem.objects.create(
                    order=order,
                    beverage=beverage,
                    cases_ordered=quantity,
                    price=beverage.price,
                )

                order_items.append({
                    "beverage": beverage.name,
                    "quantity": str(quantity),
                    "unit_price": str(beverage.price),
                    "total_price": str(order_item.total_price),
                })

            return Response({
                "message": "Order placed successfully.",
                "order_id": order.id,
                "delivery_type": delivery_type,
                "barangay": order.barangay,
                "text_address": final_text_address,
                "contact_number": contact_number,
                "latitude": latitude,
                "longitude": longitude,
                "items": order_items,
                "total_price": str(order.total_price),
            }, status=status.HTTP_201_CREATED)

    except Exception as e:
        logger.exception("Unexpected error in place_order")
        return Response({
            "error": "An unexpected error occurred. Please try again."
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ----------------------------- USER ORDERS -----------------------------
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_user_orders(request):
    try:
        orders = Order.objects.filter(user=request.user).order_by("-created_at")
        serializer = OrderSerializer(orders, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)
    except Exception as e:
        logger.error(f"Error fetching user orders: {e}")
        return Response({"error": "Failed to fetch orders."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ----------------------------- DELETE ORDER -----------------------------
@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_order(request, order_id):
    try:
        order = Order.objects.get(id=order_id, user=request.user)
        with transaction.atomic():
            for item in order.items.all():
                item.beverage.stock += item.cases_ordered
                item.beverage.save()
            order.delete()
        return Response({"message": "Order deleted and stock restored."}, status=status.HTTP_200_OK)
    except Order.DoesNotExist:
        return Response({"error": "Order not found."}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        logger.error(f"Error deleting order {order_id}: {e}")
        return Response({"error": "Failed to delete order."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ----------------------------- MARK DELIVERED BY STAFF -----------------------------
# ----------------------------- MARK DELIVERED BY STAFF -----------------------------
@api_view(['POST'])
@permission_classes([IsAdminOrStaff])  # Keep this for broad access (since riders are is_staff=True)
def mark_delivered_by_staff(request, order_id):
    try:
        order = Order.objects.get(id=order_id)

        # 🔒 CRITICAL: Ensure current user is allowed to act on this order
        user = request.user
        if not (user.is_superuser or user.is_staff):
            return Response({"error": "Permission denied."}, status=status.HTTP_403_FORBIDDEN)

        # If user is staff but NOT superuser, ensure they are assigned (for riders/staff)
        if not user.is_superuser:
            if order.assigned_staff != user:
                return Response(
                    {"error": "You are not assigned to this order."},
                    status=status.HTTP_403_FORBIDDEN
                )

        if order.delivery_type == 'Pickup':
            return Response(
                {"error": "Pickup orders don't require delivery confirmation."},
                status=status.HTTP_400_BAD_REQUEST
            )

        if order.status not in ['In Transit', 'Processing']:
            return Response(
                {"error": f"Order must be 'In Transit' or 'Processing' to mark as delivered. Current status: '{order.status}'"},
                status=status.HTTP_400_BAD_REQUEST
            )

        order.mark_delivered_by_staff()
        return Response({
            "message": "Order marked as delivered by staff.",
            "status": order.status
        }, status=status.HTTP_200_OK)

    except Order.DoesNotExist:
        return Response({"error": "Order not found."}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        logger.error(f"Error marking delivered: {e}")
        return Response({"error": "Failed to update order."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

# ----------------------------- CONFIRM RECEIPT BY CUSTOMER -----------------------------
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def confirm_receipt_by_customer(request, order_id):
    try:
        order = Order.objects.get(id=order_id, user=request.user)
        
        if order.status == 'Completed':
            return Response({
                "message": "Order already completed.",
                "status": order.status
            }, status=status.HTTP_200_OK)

        # Allow customer to complete delivered orders that are at least "In Transit"
        if order.delivery_type == "Delivered":
            if order.status in ["In Transit", "Delivered by Staff"]:
                order.status = "Completed"
                order._finalize_payment()
                order.save(update_fields=['status', 'is_paid', 'payment_date'])
            else:
                return Response({
                    "error": "Order must be in transit or delivered to confirm receipt."
                }, status=status.HTTP_400_BAD_REQUEST)
        else:
            # For pickup orders, allow direct completion
            order.status = "Completed"
            order._finalize_payment()
            order.save(update_fields=['status', 'is_paid', 'payment_date'])

        return Response({
            "message": "Order confirmed by customer and marked as completed.",
            "status": order.status
        }, status=status.HTTP_200_OK)

    except Order.DoesNotExist:
        return Response({"error": "Order not found or not owned by you."}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        logger.error(f"Error confirming receipt for order {order_id}: {e}")
        return Response({"error": "Failed to confirm receipt."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ----------------------------- ADMIN ORDER VIEWSET -----------------------------
class OrderViewSet(viewsets.ModelViewSet):
    serializer_class = OrderAdminSerializer
    permission_classes = [IsAdminOrStaff]

    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated:
            return Order.objects.none()
        if user.is_superuser:
            return Order.objects.all()
        if user.role == 'staff' or user.is_staff:
            return Order.objects.filter(assigned_staff=user)
        return Order.objects.filter(user=user)

    def perform_create(self, serializer):
        order = serializer.save(user=self.request.user)
        items_data = self.request.data.get("items")
        if items_data:
            self._handle_order_items(order, items_data)

    def perform_update(self, serializer):
        # Get current state before save
        order_id = self.kwargs.get('pk')
        original_status = None
        if order_id:
            try:
                original_status = Order.objects.get(pk=order_id).status
            except Order.DoesNotExist:
                pass

        order = serializer.save()

        # 🔒 Prevent unsafe direct transition to "Completed" for delivered orders
        if (
            order.delivery_type == "Delivered"
            and order.status == "Completed"
            and original_status not in ["Delivered by Staff", "Confirmed by Customer"]
            and not self.request.user.is_superuser  # allow superuser override if needed
        ):
            raise serializers.ValidationError(
                "Delivered orders must first be marked as 'Delivered by Staff', then confirmed by the customer."
            )

        # Handle items if provided
        items_data = self.request.data.get("items")
        if items_data is not None:
            self._handle_order_items(order, items_data)

    def _handle_order_items(self, order, items_data):
        existing_items = {item.id: item for item in order.items.all()}

        for item_data in items_data:
            item_id = item_data.get("id")
            beverage_id = item_data.get("beverage")
            quantity = item_data.get("quantity", 1)

            try:
                beverage = Beverage.objects.get(id=beverage_id)
                quantity = Decimal(str(quantity))
                if quantity <= 0:
                    raise serializers.ValidationError("Quantity must be > 0.")
            except Beverage.DoesNotExist:
                raise serializers.ValidationError(f"Beverage {beverage_id} not found.")
            except:
                raise serializers.ValidationError("Invalid quantity.")

            if item_id and item_id in existing_items:
                old_item = existing_items.pop(item_id)
                old_item.beverage.stock += old_item.cases_ordered
                old_item.beverage.save()
                beverage.stock -= quantity
                beverage.save()
                old_item.beverage = beverage
                old_item.cases_ordered = quantity
                old_item.price = beverage.price
                old_item.save()
            else:
                beverage.stock -= quantity
                beverage.save()
                OrderItem.objects.create(
                    order=order,
                    beverage=beverage,
                    cases_ordered=quantity,
                    price=beverage.price
                )

        for item in existing_items.values():
            item.beverage.stock += item.cases_ordered
            item.beverage.save()
            item.delete()

    def perform_destroy(self, instance):
        with transaction.atomic():
            for item in instance.items.all():
                item.beverage.stock += item.cases_ordered
                item.beverage.save()
            instance.delete()


# ----------------------------- GCASH ADMIN ACTIONS -----------------------------
@api_view(['POST'])
@permission_classes([IsAdminUser])
def approve_gcash_payment(request, order_id):
    try:
        order = Order.objects.get(id=order_id, payment_method="GCash")
        if not order.gcash_receipt:
            return Response({"error": "No GCash receipt."}, status=status.HTTP_400_BAD_REQUEST)
        order.is_paid = True
        order.payment_status = "Paid"
        order.save()
        serializer = OrderAdminSerializer(order, context={'request': request})
        return Response({"message": "GCash approved.", "order": serializer.data}, status=status.HTTP_200_OK)
    except Order.DoesNotExist:
        return Response({"error": "Order not found."}, status=status.HTTP_404_NOT_FOUND)


@api_view(['POST'])
@permission_classes([IsAdminUser])
def reject_gcash_payment(request, order_id):
    try:
        order = Order.objects.get(id=order_id, payment_method="GCash")
        order.is_paid = False
        order.payment_status = "Rejected"
        if order.gcash_receipt:
            order.gcash_receipt.delete(save=True)
        order.save()
        return Response({"message": "GCash rejected."}, status=status.HTTP_200_OK)
    except Order.DoesNotExist:
        return Response({"error": "Order not found."}, status=status.HTTP_404_NOT_FOUND)