# api/views/orders.py
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from rest_framework.response import Response
from rest_framework import status, serializers, viewsets
from django.db import transaction
from geopy.geocoders import Nominatim
from django.utils import timezone
import logging

from ..models import Order, OrderItem, Beverage, CustomUser
from ..serializers import OrderSerializer, OrderAdminSerializer
from ..permissions import IsAdminOrStaff  # ← Use only this!

logger = logging.getLogger(__name__)

# ----------------------------- PLACE ORDER -----------------------------
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def place_order(request):
    try:
        data = request.data
        items_raw = data.get("items")  # This is a string when sent via FormData
        address = data.get("address")
        payment_method = data.get("payment_method")
        delivery_type = data.get("delivery_type", "Pickup")
        text_address = data.get("textAddress", "")
        contact_number = data.get("contact_number", "")
        gcash_receipt = request.FILES.get("gcash_receipt")

        logger.info(f"DELIVERY TYPE RECEIVED: {delivery_type}")
        logger.info(f"Raw items received: {items_raw}")

        # ✅ CRITICAL FIX: Parse JSON string into Python list
        import json
        if isinstance(items_raw, str):
            try:
                items = json.loads(items_raw)
            except (TypeError, ValueError, json.JSONDecodeError):
                return Response({"error": "Invalid JSON format for items."}, status=status.HTTP_400_BAD_REQUEST)
        elif isinstance(items_raw, list):
            items = items_raw  # in case it's already a list
        else:
            return Response({"error": "Items must be a list or valid JSON string."}, status=status.HTTP_400_BAD_REQUEST)

        if not isinstance(items, list) or not items:
            return Response({"error": "Invalid or missing items list."}, status=status.HTTP_400_BAD_REQUEST)

        if delivery_type == "Delivered" and not address:
            return Response({"error": "Address is required for delivery."}, status=status.HTTP_400_BAD_REQUEST)

        if delivery_type == "Delivered":
            try:
                location = Nominatim(user_agent="order_app").reverse(address, language='en', exactly_one=True)
                text_address = location.address if location else "Unknown Address"
            except Exception as geocode_err:
                logger.warning(f"Geocoding failed: {geocode_err}")
                text_address = "Unknown Address"

        if delivery_type not in ["Pickup", "Delivered"]:
            return Response({"error": "Invalid delivery type."}, status=status.HTTP_400_BAD_REQUEST)

        if payment_method == "GCash" and not gcash_receipt:
            return Response({"error": "GCash receipt is required."}, status=status.HTTP_400_BAD_REQUEST)

        order_data = {
            "user": request.user.id,
            "address": address,
            "payment_method": payment_method,
            "delivery_type": delivery_type,
            "text_address": text_address,
            "contact_number": contact_number,
            "gcash_receipt": gcash_receipt,
        }

        serializer = OrderSerializer(data=order_data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            order = serializer.save()
            order_items = []

            for item in items:
                beverage_id = item.get("id")
                quantity = item.get("quantity", 1)

                # NEW — support half-cases
                if not beverage_id or not isinstance(quantity, (int, float)) or quantity <= 0:
                    return Response({"error": "Invalid beverage ID or quantity."}, status=status.HTTP_400_BAD_REQUEST)

                # ✅ Validate: must be multiple of 0.5 (e.g., 1, 1.5, 2, 2.5)
                from decimal import Decimal
                quantity = Decimal(str(quantity))
                if (quantity * 2) % 1 != 0:
                    return Response({"error": "Quantity must be whole or half cases (e.g., 1, 1.5, 2)."}, status=status.HTTP_400_BAD_REQUEST)

                beverage = Beverage.objects.filter(id=beverage_id).first()
                if not beverage:
                    return Response({"error": f"Beverage with ID {beverage_id} not found."}, status=status.HTTP_404_NOT_FOUND)
                if beverage.stock < quantity:
                    return Response({"error": f"Not enough stock for {beverage.name}. Available: {beverage.stock}"}, status=status.HTTP_400_BAD_REQUEST)

                beverage.stock -= quantity
                beverage.save()

                # ✅ FIXED: Use 'cases_ordered', not 'quantity'
                order_item = OrderItem.objects.create(
                    order=order,
                    beverage=beverage,
                    cases_ordered=quantity,  # ← CORRECT FIELD NAME
                    price=beverage.price,
                )

                order_items.append({
                    "beverage": beverage.name,
                    "quantity": quantity,
                    "unit_price": str(beverage.price),
                    "total_price": str(order_item.total_price),
                })

            return Response({
                "message": "Order placed successfully.",
                "order_id": order.id,
                "delivery_type": delivery_type,
                "items": order_items,
                "total_price": str(order.total_price),
                "text_address": text_address,
                "contact_number": contact_number,
            }, status=status.HTTP_201_CREATED)

    except Exception as e:
        logger.exception("Order placement failed.")
        return Response({"error": "An error occurred while placing the order."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ----------------------------- USER ORDERS -----------------------------
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_user_orders(request):
    try:
        user_orders = Order.objects.filter(user=request.user).order_by("-created_at")
        serializer = OrderSerializer(user_orders, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)
    except Exception as e:
        logger.error(f"Error retrieving user orders: {str(e)}")
        return Response({"error": "Failed to fetch user orders."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


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
            OrderItem.objects.filter(order=order).delete()
            order.delete()

        return Response({"message": "Order deleted successfully and stock restored."}, status=status.HTTP_200_OK)

    except Order.DoesNotExist:
        return Response({"error": "Order not found."}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        logger.error(f"Error deleting order: {str(e)}")
        return Response({"error": "Failed to delete order."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ----------------------------- ADMIN ORDER VIEWSET -----------------------------
class OrderViewSet(viewsets.ModelViewSet):
    serializer_class = OrderAdminSerializer
    permission_classes = [IsAdminOrStaff]

    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated:
            return Order.objects.none()

        # Superuser sees all
        if user.is_superuser:
            return Order.objects.all()

        # Regular staff (riders): only orders assigned to them
        if user.is_staff:
            return Order.objects.filter(assigned_staff=user)

        # Regular users: only their own orders
        return Order.objects.filter(user=user)

    def perform_create(self, serializer):
        order = serializer.save(user=self.request.user)
        items_data = self.request.data.get("items", None)
        if items_data is not None:
            self._handle_order_items(order, items_data)

    def perform_update(self, serializer):
        order = self.get_object()
        items_data = self.request.data.get("items", None)
        updated_order = serializer.save()
        if items_data is not None:
            self._handle_order_items(updated_order, items_data)

    def _handle_order_items(self, order, items_data):
        existing_items = {item.id: item for item in order.items.all()}

        for item_data in items_data:
            item_id = item_data.get("id")
            beverage_id = item_data.get("beverage")
            quantity = item_data.get("quantity", 1)

            try:
                beverage = Beverage.objects.get(id=beverage_id)
            except Beverage.DoesNotExist:
                raise serializers.ValidationError(f"Beverage with ID {beverage_id} not found.")

            if quantity <= 0:
                raise serializers.ValidationError("Quantity must be greater than zero.")

            if item_id and item_id in existing_items:
                old_item = existing_items.pop(item_id)
                old_item.beverage.restore_stock(old_item.cases_ordered)
                try:
                    beverage.update_stock(quantity)
                except ValueError as e:
                    raise serializers.ValidationError(str(e))
                old_item.beverage = beverage
                old_item.cases_ordered = quantity
                old_item.price = beverage.price
                old_item.save()
            else:
                try:
                    beverage.update_stock(quantity)
                    OrderItem.objects.create(
                        order=order,
                        beverage=beverage,
                        cases_ordered=quantity,
                        price=beverage.price
                    )
                except ValueError as e:
                    raise serializers.ValidationError(str(e))

        for item in existing_items.values():
            item.beverage.restore_stock(item.cases_ordered)
            item.beverage.save()
            item.delete()

    def perform_destroy(self, instance):
        for item in instance.items.all():
            item.beverage.restore_stock(item.cases_ordered)
            item.beverage.save()
            item.delete()
        instance.delete()


# ----------------------------- ADMIN GCASH APPROVAL -----------------------------
@api_view(['POST'])
@permission_classes([IsAdminUser])
def approve_gcash_payment(request, order_id):
    try:
        order = Order.objects.get(id=order_id, payment_method="GCash")
        if not order.gcash_receipt:
            return Response({"error": "No receipt uploaded."}, status=400)
        order.is_paid = True
        order.save()
        
        serializer = OrderAdminSerializer(order, context={'request': request})
        return Response({
            "message": "GCash payment approved.",
            "order": serializer.data
        }, status=200)
    except Order.DoesNotExist:
        return Response({"error": "Order not found."}, status=404)

@api_view(['POST'])
@permission_classes([IsAdminUser])
def reject_gcash_payment(request, order_id):
    try:
        order = Order.objects.get(id=order_id, payment_method="GCash")
        order.is_paid = False
        if order.gcash_receipt:
            order.gcash_receipt.delete(save=True)
        order.save()
        
        serializer = OrderAdminSerializer(order)
        return Response({
            "message": "GCash payment rejected and receipt removed.",
            "order": serializer.data
        }, status=200)
    except Order.DoesNotExist:
        return Response({"error": "Order not found."}, status=404)