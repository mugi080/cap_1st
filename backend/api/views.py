import logging
from datetime import datetime, timedelta
import calendar
import pytz

from django.http import HttpResponse
from django.shortcuts import get_object_or_404
from django.db.models import Count, F, Sum, FloatField
from django.db.models.functions import ExtractMonth, TruncMonth, Extract
from django.utils import timezone
from io import BytesIO

from rest_framework import status, viewsets, generics
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, IsAdminUser, AllowAny
from rest_framework.response import Response

from reportlab.pdfgen import canvas

from .models import (
    BeverageCategory,
    Beverage,
    Order,
    OrderItem,
    RoleRequest,
    CustomUser,
    OrderReview,
    Vehicle,
    Review,
)
from .serializers import (
    BeverageCategorySerializer,
    BeverageSerializer,
    OrderSerializer,
    RoleRequestSerializer,
    CustomUserSerializer,
    StaffSerializer,
    OrderReviewSerializer,
    VehicleSerializer,
    FeedbackSerializer,
    ReviewSerializer,
    OrderItemSerializer,
    OrderAdminSerializer,
)
from .permissions import IsAdminOrStaff

logger = logging.getLogger(__name__)


# ----------------------------- USER & ADMIN VIEWS -----------------------------

class CustomerAdminViewSet(viewsets.ModelViewSet):
    queryset = CustomUser.objects.filter(role='user')
    serializer_class = CustomUserSerializer
    permission_classes = [IsAdminUser]


class StaffAdminViewSet(viewsets.ModelViewSet):
    queryset = CustomUser.objects.filter(role='staff')
    serializer_class = StaffSerializer
    permission_classes = [IsAdminUser]


class CustomUserViewSet(viewsets.ModelViewSet):
    serializer_class = CustomUserSerializer
    permission_classes = [IsAdminUser]

    def get_queryset(self):
        return CustomUser.objects.all()

    def get_serializer_context(self):
        return {'request': self.request}


class VehicleViewSet(viewsets.ModelViewSet):
    queryset = Vehicle.objects.all()
    serializer_class = VehicleSerializer
    permission_classes = [IsAdminOrStaff]


# ----------------------------- BEVERAGE & CATEGORY -----------------------------

# (You can add BeverageCategoryViewSet here if needed)


# ----------------------------- ORDERS -----------------------------

@api_view(['GET'])
def get_order_details(request, pk):
    try:
        order = Order.objects.get(id=pk)
        serializer = OrderSerializer(order)
        return Response(serializer.data)
    except Order.DoesNotExist:
        return Response({'error': 'Order not found'}, status=404)


@api_view(['GET'])
def get_order_items(request):
    order_id = request.GET.get('order_id')
    if not order_id:
        return Response({'error': 'order_id is required'}, status=400)
    try:
        items = OrderItem.objects.filter(order_id=order_id)
        serializer = OrderItemSerializer(items, many=True)
        return Response(serializer.data)
    except Exception as e:
        return Response({'error': str(e)}, status=500)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def submit_feedback(request, order_id):
    order = get_object_or_404(Order, id=order_id, user=request.user)
    serializer = FeedbackSerializer(data=request.data)
    if serializer.is_valid():
        order.review_comment = serializer.validated_data['review_comment']
        order.review_rating = serializer.validated_data['review_rating']
        order.reviewed_at = timezone.now()
        order.save()
        return Response({"detail": "Feedback submitted successfully."})
    else:
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# ----------------------------- REVIEWS -----------------------------

class CreateOrderReviewView(generics.CreateAPIView):
    queryset = OrderReview.objects.all()
    serializer_class = OrderReviewSerializer
    permission_classes = [IsAuthenticated]

    def perform_create(self, serializer):
        order_item_id = self.request.data.get('order_item')
        order_item = OrderItem.objects.get(id=order_item_id, order__user=self.request.user)
        if hasattr(order_item, 'order_review'):
            from rest_framework import serializers
            raise serializers.ValidationError("This item already has a review.")
        serializer.save(order_item=order_item)


@api_view(['GET'])
def order_reviews_list(request):
    order_id = request.query_params.get("order_id")
    if not order_id:
        return Response({"error": "Missing order_id"}, status=400)
    order_reviews = OrderReview.objects.select_related('order_item').filter(
        order_item__order_id=order_id
    ).order_by('-created_at')
    serializer = OrderReviewSerializer(order_reviews, many=True)
    return Response(serializer.data)


# ----------------------------- ADMIN DASHBOARD -----------------------------

@api_view(['GET'])
@permission_classes([IsAdminUser])
def total_users(request):
    total = CustomUser.objects.count()
    return Response({'total': total})


@api_view(['GET'])
@permission_classes([IsAdminUser])
def pending_role_request_count(request):
    count = RoleRequest.objects.filter(status='pending').count()
    return Response({'count': count})


# ----------------------------- ANALYTICS & REPORTS -----------------------------

@api_view(['GET'])
@permission_classes([])  # Public
def monthly_sales_report(request):
    try:
        year = int(request.GET.get('year', timezone.now().year))
    except (TypeError, ValueError):
        year = timezone.now().year

    orders = Order.objects.filter(created_at__year=year).annotate(
        month=ExtractMonth('created_at')
    )
    order_data = orders.values('month').annotate(
        total_orders=Count('id'),
        total_revenue=Sum(F('items__cases_ordered') * F('items__price'), output_field=FloatField())
    ).order_by('month')

    result = []
    for entry in order_data:
        month_name = calendar.month_abbr[entry['month']]
        result.append({
            'month': month_name,
            'total_orders': entry['total_orders'],
            'total_revenue': float(entry['total_revenue'] or 0)
        })
    return Response(result)


@api_view(['GET'])
def monthly_sales_data(request):
    try:
        year = int(request.GET.get('year', timezone.now().year))
        orders_with_revenue = (
            Order.objects
            .filter(created_at__year=year, status='Completed')
            .annotate(revenue=F('items__cases_ordered') * F('items__price'))
        )
        monthly_data = (
            orders_with_revenue
            .annotate(month=TruncMonth('created_at'), month_num=Extract('created_at', 'month'))
            .values('month', 'month_num')
            .annotate(
                total_sales=Sum('revenue', output_field=FloatField()),
                total_orders=Count('id'),
                total_items=Sum('items__cases_ordered')
            )
            .order_by('month')
        )

        chart_data = []
        for data in monthly_data:
            month_name = calendar.month_abbr[data['month_num']]
            chart_data.append({
                'month': f"{month_name} {year}",
                'sales': float(data['total_sales'] or 0),
                'orders': data['total_orders'],
                'items_sold': data['total_items'] or 0
            })
        return Response({'success': True, 'data': chart_data, 'year': year})
    except Exception as e:
        return Response({'success': False, 'error': str(e)}, status=500)


@api_view(['GET'])
def beverage_sales_report(request):
    tz = pytz.timezone('Asia/Manila')
    start_date = tz.localize(datetime(2025, 1, 1, 0, 0, 0))
    end_date = tz.localize(datetime(2025, 3, 31, 23, 59, 59))

    order_items = OrderItem.objects.filter(
        order__created_at__range=(start_date, end_date)
    ).values('beverage__name').annotate(
        units_sold=Sum('cases_ordered'),
        revenue=Sum(F('cases_ordered') * F('price'))
    ).order_by('-units_sold')

    result = [
        {
            'name': item['beverage__name'],
            'units_sold': item['units_sold'],
            'revenue': float(round(item['revenue'], 2)),
        }
        for item in order_items
    ]
    return Response(result)


@api_view(['GET'])
def beverage_popularity_by_barangay(request):
    try:
        barangay_data = (
            Order.objects
            .filter(status='Completed', delivery_type='Delivered', address__isnull=False)
            .exclude(address='')
            .values('address')
            .annotate(
                total_orders=Count('id'),
                total_items=Sum('items__cases_ordered')
            )
            .order_by('-total_items')[:10]
        )

        result = []
        for barangay_info in barangay_data:
            barangay_name = barangay_info['address']
            beverage_data = (
                OrderItem.objects
                .filter(order__address=barangay_name, order__status='Completed')
                .exclude(beverage__isnull=True)
                .annotate(revenue=F('cases_ordered') * F('price'))
                .values('beverage__name')
                .annotate(
                    quantity=Sum('cases_ordered'),
                    total_revenue=Sum('revenue')
                )
                .order_by('-total_revenue')
            )

            beverages = [
                {
                    'name': item['beverage__name'],
                    'quantity': item['quantity'],
                    'revenue': float(item['total_revenue']),
                }
                for item in beverage_data
            ]

            result.append({
                'barangay': barangay_name,
                'total_orders': barangay_info['total_orders'],
                'total_items': barangay_info['total_items'],
                'beverages': beverages
            })
        return Response({'success': True, 'data': result})
    except Exception as e:
        return Response({'success': False, 'error': str(e)}, status=500)


@api_view(['GET'])
def top_selling_beverages(request):
    days = int(request.GET.get('days', 30))
    start_date = timezone.now() - timedelta(days=days)
    beverage_data = (
        OrderItem.objects
        .filter(order__created_at__gte=start_date, order__status='Completed')
        .values('beverage__name')
        .annotate(
            total_quantity=Sum('cases_ordered'),
            total_revenue=Sum(F('cases_ordered') * F('price')),
            order_count=Count('order', distinct=True)
        )
        .order_by('-total_quantity')[:15]
    )
    chart_data = []
    for bev in beverage_data:
        chart_data.append({
            'name': bev['beverage__name'],
            'quantity': bev['total_quantity'],
            'revenue': float(bev['total_revenue'] or 0),
            'orders': bev['order_count']
        })
    return Response({
        'success': True,
        'data': chart_data,
        'period': f"Last {days} days"
    })


@api_view(['GET'])
def sales_summary(request):
    days = int(request.GET.get('days', 30))
    start_date = timezone.now() - timedelta(days=days)
    
    total_orders = Order.objects.filter(created_at__gte=start_date, status='Completed').count()
    
    total_revenue = OrderItem.objects.filter(
        order__created_at__gte=start_date, order__status='Completed'
    ).aggregate(
        revenue=Sum(F('cases_ordered') * F('price'))
    )['revenue'] or 0
    
    total_items_sold = OrderItem.objects.filter(
        order__created_at__gte=start_date, order__status='Completed'
    ).aggregate(
        items=Sum('cases_ordered')
    )['items'] or 0
    
    avg_order_value = float(total_revenue) / total_orders if total_orders > 0 else 0
    
    top_beverage = OrderItem.objects.filter(
        order__created_at__gte=start_date, order__status='Completed'
    ).values('beverage__name').annotate(
        total_qty=Sum('cases_ordered')
    ).order_by('-total_qty').first()
    
    return Response({
        'success': True,
        'data': {
            'total_orders': total_orders,
            'total_revenue': float(total_revenue),
            'total_items_sold': total_items_sold,
            'average_order_value': round(avg_order_value, 2),
            'top_beverage': top_beverage['beverage__name'] if top_beverage else 'N/A',
            'period_days': days
        }
    })


# ----------------------------- RECEIPT -----------------------------

def download_receipt(request, order_id):
    order = Order.objects.get(id=order_id)
    buffer = BytesIO()
    p = canvas.Canvas(buffer)

    p.setFont("Helvetica-Bold", 16)
    p.drawString(100, 800, f"Order Receipt #{order.id}")

    p.setFont("Helvetica", 12)
    y = 770
    p.drawString(100, y, f"Customer: {order.customer_name}")
    y -= 20
    p.drawString(100, y, f"Total: ₱{order.total_price}")
    y -= 20
    p.drawString(100, y, f"Status: {order.status}")
    y -= 20
    p.drawString(100, y, f"Payment Method: {order.payment_method}")
    y -= 40
    p.drawString(100, y, "Items:")

    for item in order.items.all():
        y -= 20
        p.drawString(120, y, f"{item.cases_ordered} case(s) of {item.beverage.name} - ₱{item.total_price}")

    p.showPage()
    p.save()
    buffer.seek(0)
    return HttpResponse(buffer, content_type='application/pdf')