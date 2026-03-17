import logging
from datetime import datetime, timedelta, timezone as py_timezone
import calendar
import pytz
import csv
from django.http import HttpResponse
from django.shortcuts import get_object_or_404
from django.db.models import Count, F, Sum, FloatField, Avg, Min, Max
from django.db.models.functions import ExtractMonth, TruncMonth, Extract
from django.utils import timezone
from io import BytesIO
from collections import defaultdict
from decimal import Decimal

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
    StaffPreferenceSerializer,
    StaffPreference,
    StaffProfileSerializer
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


# ============================================================================
# ✅ FIXED: Professional Report Endpoints with FULL FILTER SUPPORT
# ============================================================================

@api_view(['GET'])
@permission_classes([IsAdminUser])
def download_sales_report(request):
    """
    GET /api/reports/sales/?start=2025-01-01&end=2025-12-31&delivery_type=Delivered&beverages=Coca-Cola%20Regular&format=csv
    Supports: delivery_type, payment_status, beverages (list), barangays (list)
    """
    try:
        start = request.GET.get('start')
        end = request.GET.get('end')
        format_type = request.GET.get('format', 'json')

        if not start or not end:
            return Response({'error': 'Start and end dates required'}, status=400)

        start_date = datetime.strptime(start, '%Y-%m-%d').replace(tzinfo=py_timezone.utc)
        end_date = datetime.strptime(end, '%Y-%m-%d').replace(tzinfo=py_timezone.utc) + timedelta(days=1)

        orders = Order.objects.filter(
            created_at__gte=start_date,
            created_at__lt=end_date,
            status='Completed'
        )

        # Apply delivery_type
        delivery_type = request.GET.get('delivery_type')
        if delivery_type and delivery_type != 'all':
            orders = orders.filter(delivery_type=delivery_type)

        # Apply payment_status
        payment_method = request.GET.get('payment_method')
        if payment_method and payment_method != 'all':
            orders = orders.filter(payment_method=payment_method)

        # Apply barangays
        barangays = request.GET.getlist('barangays')
        if barangays:
            orders = orders.filter(barangay__in=barangays)

        orders = orders.select_related('user').prefetch_related('items__beverage')

        # Apply beverages (filter at item level)
        beverages = request.GET.getlist('beverages')
        report_data = []

        for order in orders:
            for item in order.items.all():
                if beverages and item.beverage.name not in beverages:
                    continue
                report_data.append({
                    'order_id': order.id,
                    'order_date': order.created_at.strftime('%Y-%m-%d %H:%M'),
                    'customer_name': order.customer_name or (order.user.get_full_name() if order.user else "Guest"),
                    'customer_email': order.user.email if order.user else "",
                    'contact_number': order.contact_number or "",
                    'delivery_type': order.delivery_type,
                    'address': order.address or "",
                    'barangay': order.barangay or "",
                    'beverage_name': item.beverage.name,
                    'volume_ml': float(item.beverage.volume),
                    'cases_ordered': float(item.cases_ordered),
                    'price_per_case': float(item.price),
                    'total_item_price': float(item.total_price),
                    'order_total': float(order.total_price),
                    'payment_method': order.payment_method or "Not specified",
                    'payment_status': order.payment_status,
                    'gcash_receipt_provided': bool(order.gcash_receipt)
                })

        if format_type == 'csv':
            response = HttpResponse(content_type='text/csv')
            response['Content-Disposition'] = f'attachment; filename="sales_report_{start}_to_{end}.csv"'
            writer = csv.writer(response)
            if report_data:
                writer.writerow(report_data[0].keys())
                for row in report_data:
                    writer.writerow(row.values())
            else:
                writer.writerow(['No data found for the specified criteria'])
            return response

        return Response({
            'success': True,
            'data': report_data,
            'metadata': {
                'total_orders': len(set(o['order_id'] for o in report_data)) if report_data else 0,
                'total_items': len(report_data),
                'date_range': f"{start} to {end}",
                'generated_at': timezone.now().strftime('%Y-%m-%d %H:%M')
            }
        })

    except ValueError as e:
        logger.error(f"Invalid date format: {str(e)}")
        return Response({'success': False, 'error': 'Invalid date format. Use YYYY-MM-DD'}, status=400)
    except Exception as e:
        logger.error(f"Sales report error: {str(e)}")
        return Response({'success': False, 'error': str(e)}, status=500)


@api_view(['GET'])
@permission_classes([IsAdminUser])
def download_inventory_report(request):
    """
    GET /api/reports/inventory/?beverages=Coca-Cola%20Regular&format=csv
    Supports: beverages (list)
    All stock and sales values are reported in CASES (not pieces).
    """
    try:
        format_type = request.GET.get('format', 'json')
        beverages_filter = request.GET.getlist('beverages')

        if beverages_filter:
            beverages = Beverage.objects.filter(name__in=beverages_filter)
        else:
            beverages = Beverage.objects.all()

        report_data = []
        for bev in beverages:
            # Sales in last 30 days (already in CASES from OrderItem.cases_ordered)
            start_date = timezone.now() - timedelta(days=30)
            sales_30d = OrderItem.objects.filter(
                beverage=bev,
                order__created_at__gte=start_date,
                order__status='Completed'
            ).aggregate(total=Sum('cases_ordered'))['total'] or Decimal('0')

            sales_30d = float(sales_30d)
            avg_daily = sales_30d / 30 if sales_30d > 0 else 0

            # Convert stock from PIECES to CASES
            units_per_case = bev.units_per_case or 1
            stock_in_cases = float(bev.stock) / units_per_case

            # Days of stock remaining (based on case-based metrics)
            days_of_stock = stock_in_cases / avg_daily if avg_daily > 0 else 999

            report_data.append({
                'beverage_name': bev.name,
                'category': bev.category.name,
                'volume_ml': float(bev.volume),
                'current_stock_cases': round(stock_in_cases, 2),  # ✅ Now truly in cases
                'units_per_case': bev.units_per_case,
                'price_per_case': float(bev.price),
                'is_available': bev.is_available,
                'sales_last_30_days_cases': round(sales_30d, 2),  # ✅ Clarify unit
                'avg_daily_sales_cases': round(avg_daily, 2),     # ✅ Clarify unit
                'days_of_stock_remaining': round(days_of_stock, 1),
                'unit_label': bev.unit_label,
                'allow_half_case': bev.allow_half_case
            })

        if format_type == 'csv':
            response = HttpResponse(content_type='text/csv')
            response['Content-Disposition'] = 'attachment; filename="inventory_report.csv"'
            writer = csv.writer(response)
            if report_data:
                writer.writerow(report_data[0].keys())
                for row in report_data:
                    writer.writerow(row.values())
            else:
                writer.writerow(['No inventory data available'])
            return response

        return Response({
            'success': True,
            'data': report_data,
            'metadata': {
                'total_products': len(report_data),
                'generated_at': timezone.now().strftime('%Y-%m-%d %H:%M'),
                'note': 'All stock and sales values are reported in CASES.'
            }
        })

    except Exception as e:
        logger.error(f"Inventory report error: {str(e)}")
        return Response({'success': False, 'error': str(e)}, status=500)


@api_view(['GET'])
@permission_classes([IsAdminUser])
def download_customer_report(request):
    """
    GET /api/reports/customers/?start=...&end=...&delivery_type=Delivered&barangays=Mayao%20Crossing&format=csv
    Supports: delivery_type, barangays
    """
    try:
        start = request.GET.get('start')
        end = request.GET.get('end')
        format_type = request.GET.get('format', 'json')

        if not start or not end:
            return Response({'error': 'Start and end dates required'}, status=400)

        start_date = datetime.strptime(start, '%Y-%m-%d').replace(tzinfo=py_timezone.utc)
        end_date = datetime.strptime(end, '%Y-%m-%d').replace(tzinfo=py_timezone.utc) + timedelta(days=1)

        customers = CustomUser.objects.filter(
            order__created_at__gte=start_date,
            order__created_at__lt=end_date,
            order__status='Completed'
        )

        # Apply delivery_type
        delivery_type = request.GET.get('delivery_type')
        if delivery_type and delivery_type != 'all':
            customers = customers.filter(order__delivery_type=delivery_type)

        # Apply barangays
        barangays = request.GET.getlist('barangays')
        if barangays:
            customers = customers.filter(order__barangay__in=barangays)

        customers = customers.annotate(
            total_orders=Count('order'),
            total_spent=Sum('order__total_price'),
            avg_order_value=Avg('order__total_price'),
            first_order=Min('order__created_at'),
            last_order=Max('order__created_at')
        ).distinct()

        report_data = []
        for customer in customers:
            report_data.append({
                'customer_id': customer.id,
                'customer_name': customer.get_full_name(),
                'email': customer.email,
                'contact_number': customer.contact_number or "",
                'total_orders': customer.total_orders,
                'total_spent': float(customer.total_spent or 0),
                'avg_order_value': float(customer.avg_order_value or 0),
                'first_order_date': customer.first_order.strftime('%Y-%m-%d') if customer.first_order else "",
                'last_order_date': customer.last_order.strftime('%Y-%m-%d') if customer.last_order else "",
                'days_since_last_order': (timezone.now() - customer.last_order).days if customer.last_order else 0
            })

        if format_type == 'csv':
            response = HttpResponse(content_type='text/csv')
            response['Content-Disposition'] = f'attachment; filename="customer_report_{start}_to_{end}.csv"'
            writer = csv.writer(response)
            if report_data:
                writer.writerow(report_data[0].keys())
                for row in report_data:
                    writer.writerow(row.values())
            return response

        return Response({
            'success': True,
            'data': report_data,
            'metadata': {
                'total_customers': len(report_data),
                'date_range': f"{start} to {end}",
                'generated_at': timezone.now().strftime('%Y-%m-%d %H:%M')
            }
        })

    except ValueError as e:
        logger.error(f"Invalid date format: {str(e)}")
        return Response({'success': False, 'error': 'Invalid date format. Use YYYY-MM-DD'}, status=400)
    except Exception as e:
        logger.error(f"Customer report error: {str(e)}")
        return Response({'success': False, 'error': str(e)}, status=500)


@api_view(['GET'])
@permission_classes([IsAdminUser])
def download_location_report(request):
    """
    GET /api/reports/location/?start=...&end=...&beverages=Coca-Cola%20Regular&format=csv
    Supports: beverages
    """
    try:
        start = request.GET.get('start')
        end = request.GET.get('end')
        format_type = request.GET.get('format', 'json')

        if not start or not end:
            return Response({'error': 'Start and end dates required'}, status=400)

        start_date = datetime.strptime(start, '%Y-%m-%d').replace(tzinfo=py_timezone.utc)
        end_date = datetime.strptime(end, '%Y-%m-%d').replace(tzinfo=py_timezone.utc) + timedelta(days=1)

        locations = Order.objects.filter(
            created_at__gte=start_date,
            created_at__lt=end_date,
            status='Completed'
        )

        # Apply beverage filter via OrderItem
        beverages = request.GET.getlist('beverages')
        if beverages:
            locations = locations.filter(items__beverage__name__in=beverages)

        locations = locations.values('barangay').annotate(
            total_orders=Count('id'),
            total_revenue=Sum(F('items__cases_ordered') * F('items__price')),
            total_items=Sum('items__cases_ordered'),
            unique_customers=Count('user', distinct=True)
        ).order_by('-total_revenue')

        report_data = []
        for loc in locations:
            if loc['barangay']:
                total_revenue = float(loc['total_revenue'] or 0)
                total_orders = loc['total_orders']
                report_data.append({
                    'barangay': loc['barangay'],
                    'total_orders': total_orders,
                    'total_revenue': total_revenue,
                    'total_items': loc['total_items'] or 0,
                    'unique_customers': loc['unique_customers'],
                    'avg_order_value': round(total_revenue / total_orders, 2) if total_orders > 0 else 0
                })

        if format_type == 'csv':
            response = HttpResponse(content_type='text/csv')
            response['Content-Disposition'] = f'attachment; filename="location_report_{start}_to_{end}.csv"'
            writer = csv.writer(response)
            if report_data:
                writer.writerow(report_data[0].keys())
                for row in report_data:
                    writer.writerow(row.values())
            return response

        return Response({
            'success': True,
            'data': report_data,
            'metadata': {
                'total_locations': len(report_data),
                'date_range': f"{start} to {end}",
                'generated_at': timezone.now().strftime('%Y-%m-%d %H:%M')
            }
        })

    except ValueError as e:
        logger.error(f"Invalid date format: {str(e)}")
        return Response({'success': False, 'error': 'Invalid date format. Use YYYY-MM-DD'}, status=400)
    except Exception as e:
        logger.error(f"Location report error: {str(e)}")
        return Response({'success': False, 'error': str(e)}, status=500)


@api_view(['GET'])
@permission_classes([IsAdminUser])
def download_trends_report(request):
    """
    GET /api/reports/trends/?start=...&end=...&beverages=Coca-Cola%20Regular&format=csv
    Supports: beverages
    """
    try:
        start = request.GET.get('start')
        end = request.GET.get('end')
        format_type = request.GET.get('format', 'json')

        if not start or not end:
            return Response({'error': 'Start and end dates required'}, status=400)

        start_date = datetime.strptime(start, '%Y-%m-%d').replace(tzinfo=py_timezone.utc)
        end_date = datetime.strptime(end, '%Y-%m-%d').replace(tzinfo=py_timezone.utc) + timedelta(days=1)

        # Monthly data
        monthly_data = Order.objects.filter(
            created_at__gte=start_date,
            created_at__lt=end_date,
            status='Completed'
        )

        beverages = request.GET.getlist('beverages')
        if beverages:
            monthly_data = monthly_data.filter(items__beverage__name__in=beverages)

        monthly_data = monthly_data.annotate(
            month=TruncMonth('created_at')
        ).values('month').annotate(
            total_orders=Count('id'),
            total_revenue=Sum(F('items__cases_ordered') * F('items__price')),
            total_items=Sum('items__cases_ordered')
        ).order_by('month')

        # Beverage trends
        beverage_trends = OrderItem.objects.filter(
            order__created_at__gte=start_date,
            order__created_at__lt=end_date,
            order__status='Completed'
        )

        if beverages:
            beverage_trends = beverage_trends.filter(beverage__name__in=beverages)

        beverage_trends = beverage_trends.annotate(
            month=TruncMonth('order__created_at')
        ).values('month', 'beverage__name').annotate(
            total_quantity=Sum('cases_ordered')
        ).order_by('month', '-total_quantity')

        # Build monthly report
        monthly_report = []
        for data in monthly_data:
            monthly_report.append({
                'month': data['month'].strftime('%Y-%m'),
                'total_orders': data['total_orders'],
                'total_revenue': float(data['total_revenue'] or 0),
                'total_items': data['total_items'] or 0,
                'avg_order_value': float(data['total_revenue'] / data['total_orders']) if data['total_orders'] > 0 else 0
            })

        # Group beverage trends by month
        monthly_beverages = defaultdict(list)
        for item in beverage_trends:
            month_str = item['month'].strftime('%Y-%m')
            monthly_beverages[month_str].append({
                'name': item['beverage__name'],
                'quantity': float(item['total_quantity'] or 0)
            })

        # Combine
        combined_report = []
        for month_data in monthly_report:
            month_key = month_data['month']
            beverages_list = monthly_beverages.get(month_key, [])
            row = month_data.copy()
            for i in range(5):
                if i < len(beverages_list):
                    row[f'beverage_{i+1}_name'] = beverages_list[i]['name']
                    row[f'beverage_{i+1}_quantity'] = beverages_list[i]['quantity']
                else:
                    row[f'beverage_{i+1}_name'] = ""
                    row[f'beverage_{i+1}_quantity'] = 0
            combined_report.append(row)

        if format_type == 'csv':
            response = HttpResponse(content_type='text/csv')
            response['Content-Disposition'] = f'attachment; filename="trends_report_{start}_to_{end}.csv"'
            if combined_report:
                writer = csv.writer(response)
                writer.writerow(combined_report[0].keys())
                for row in combined_report:
                    writer.writerow(row.values())
            return response

        return Response({
            'success': True,
            'data': combined_report,
            'metadata': {
                'total_months': len(combined_report),
                'date_range': f"{start} to {end}",
                'generated_at': timezone.now().strftime('%Y-%m-%d %H:%M')
            }
        })

    except ValueError as e:
        logger.error(f"Invalid date format: {str(e)}")
        return Response({'success': False, 'error': 'Invalid date format. Use YYYY-MM-DD'}, status=400)
    except Exception as e:
        logger.error(f"Trends report error: {str(e)}")
        return Response({'success': False, 'error': str(e)}, status=500)


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


@api_view(['GET', 'PATCH'])
@permission_classes([IsAuthenticated])
def staff_profile_view(request):
    if request.user.role != 'staff':
        return Response(
            {"detail": "Staff access only."},
            status=status.HTTP_403_FORBIDDEN
        )
    
    if request.method == 'GET':
        serializer = StaffProfileSerializer(request.user)
        return Response(serializer.data)
    
    elif request.method == 'PATCH':
        serializer = StaffProfileSerializer(
            request.user,
            data=request.data,
            partial=True
        )
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    


@api_view(['GET', 'PATCH'])
@permission_classes([IsAuthenticated])
def staff_preference_view(request):
    if request.user.role != 'staff':
        return Response(
            {"detail": "Staff access only."},
            status=403
        )
    
    preference, created = StaffPreference.objects.get_or_create(staff=request.user)
    
    if request.method == 'GET':
        serializer = StaffPreferenceSerializer(preference)
        return Response(serializer.data)
    
    elif request.method == 'PATCH':
        serializer = StaffPreferenceSerializer(preference, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=400)
    
@api_view(['GET'])
@permission_classes([IsAdminUser])
def list_barangays(request):
    from .models import LUCENA_BARANGAYS
    # Return just the values (not tuples)
    barangay_list = [name for value, name in LUCENA_BARANGAYS]
    return Response(barangay_list)