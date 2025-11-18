from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from rest_framework.response import Response
from rest_framework import status, generics
from django.shortcuts import get_object_or_404
from rest_framework import serializers
from django.db.models import Sum, F, Count, FloatField
from ..models import Order, OrderItem, OrderReview
from ..serializers import OrderSerializer, OrderItemSerializer, OrderReviewSerializer
from django.utils import timezone

# Get all orders for admin
@api_view(['GET'])
@permission_classes([IsAdminUser])
def get_admin_orders(request):
    orders = Order.objects.all().order_by("-created_at")
    orders_data = [OrderSerializer(order).data for order in orders]
    return Response(orders_data)


# Order history for admin
@api_view(['GET'])
@permission_classes([IsAdminUser])
def order_history(request):
    completed_orders = Order.objects.filter(status="Completed")
    serializer = OrderSerializer(completed_orders, many=True)
    return Response(serializer.data)


# Get order details
@api_view(['GET'])
def get_order_details(request, pk):
    order = get_object_or_404(Order, id=pk)
    serializer = OrderSerializer(order)
    return Response(serializer.data)


# Get order items
@api_view(['GET'])
def get_order_items(request):
    order_id = request.GET.get('order_id')
    if not order_id:
        return Response({'error': 'order_id is required'}, status=400)
    
    items = OrderItem.objects.filter(order_id=order_id)
    serializer = OrderItemSerializer(items, many=True)
    return Response(serializer.data)


# Create order review
class CreateOrderReviewView(generics.CreateAPIView):
    queryset = OrderReview.objects.all()
    serializer_class = OrderReviewSerializer
    permission_classes = [IsAuthenticated]

    def perform_create(self, serializer):
        order_item_id = self.request.data.get('order_item')
        order_item = OrderItem.objects.get(id=order_item_id, order__user=self.request.user)

        if hasattr(order_item, 'order_review'):
            raise serializers.ValidationError("This item already has a review.")

        serializer.save(order_item=order_item)


# Get order reviews list
@api_view(['GET'])
def order_reviews_list(request):
    order_id = request.query_params.get("order_id")
    if not order_id:
        return Response({"error": "Missing order_id"}, status=400)

    order_reviews = OrderReview.objects.select_related('order_item').filter(order_item__order_id=order_id).order_by('-created_at')
    serializer = OrderReviewSerializer(order_reviews, many=True)
    return Response(serializer.data)
