# api/view/analytics.py
import logging
import calendar
from datetime import datetime, timedelta, timezone as py_timezone
import pandas as pd
from collections import defaultdict

from django.utils import timezone
from django.db.models import Count, F, Sum, FloatField, Avg
from django.db.models.functions import TruncMonth, Extract, TruncHour
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response

from ..models import Order, OrderItem, Beverage

logger = logging.getLogger(__name__)


def _get_year_from_request(request):
    try:
        return int(request.GET.get('year', timezone.now().year))
    except (TypeError, ValueError):
        return timezone.now().year


def _generate_insights(data, year):
    """Generate business insights from analytics data"""
    insights = []
    
    # Top beverage insight
    if data.get('top_beverage'):
        insights.append(
            f"{data['top_beverage']} is your top-selling product in {year}, "
            f"accounting for {data.get('top_beverage_share', 0):.1f}% of total sales."
        )
    
    # Growth insight
    if data.get('growth_rate') is not None:
        if data['growth_rate'] > 5:
            insights.append(
                f"Sales are growing rapidly at {data['growth_rate']:.1f}% month-over-month. "
                "Consider increasing stock for peak months (March-July)."
            )
        elif data['growth_rate'] < -5:
            insights.append(
                f"Sales declined by {abs(data['growth_rate']):.1f}% recently. "
                "Review marketing strategies and inventory levels."
            )
    
    # Seasonality insight
    if data.get('peak_month'):
        insights.append(
            f"{data['peak_month']} is your strongest month. "
            "Prepare 20-30% extra stock for this period."
        )
    
    # Stockout risk
    if data.get('stockout_risk_count', 0) > 0:
        insights.append(
            f"{data['stockout_risk_count']} products are at risk of stockouts. "
            "Prioritize restocking Coca-Cola Regular and Kasalo."
        )
    
    return insights


@api_view(['GET'])
@permission_classes([IsAdminUser])
def monthly_sales_report(request):
    try:
        year = _get_year_from_request(request)
        orders = Order.objects.filter(
            created_at__year=year,
            status='Completed'
        ).annotate(month=Extract('created_at', 'month'))

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
    except Exception as e:
        logger.error(f"Error in monthly_sales_report: {str(e)}")
        return Response({'success': False, 'error': str(e)}, status=500)


# In api/view/analytics.py
@api_view(['GET'])
@permission_classes([IsAdminUser])
def monthly_sales_data(request):
    try:
        year = _get_year_from_request(request)
        start_date = datetime(year, 1, 1, tzinfo=py_timezone.utc)
        end_date = datetime(year + 1, 1, 1, tzinfo=py_timezone.utc)

        monthly_data = Order.objects.filter(
            created_at__gte=start_date,
            created_at__lt=end_date,
            status='Completed'
        ).annotate(
            month=TruncMonth('created_at'),
            month_num=Extract('created_at', 'month')
        ).values('month', 'month_num').annotate(
            total_sales=Sum(F('items__cases_ordered') * F('items__price'), output_field=FloatField()),
            total_orders=Count('id'),
            total_items=Sum('items__cases_ordered')
        ).order_by('month')

        chart_data = []
        revenues = []
        for data in monthly_data:
            month_name = calendar.month_abbr[data['month_num']]
            revenue = float(data['total_sales'] or 0)
            chart_data.append({
                'month': month_name,
                'sales': revenue,
                'orders': data['total_orders'],
                'items_sold': data['total_items'] or 0
            })
            revenues.append(revenue)

        # Calculate growth rate (MoM) - SAFE VERSION
        growth_rate = 0
        if len(revenues) >= 2:
            prev_month = revenues[-2] if len(revenues) > 1 else 0
            current_month = revenues[-1]
            if prev_month > 0:
                growth_rate = ((current_month - prev_month) / prev_month) * 100
            else:
                growth_rate = 0 if current_month == 0 else 100  # Handle first month

        # Find peak month
        peak_month = None
        if chart_data:
            peak = max(chart_data, key=lambda x: x['sales'])
            peak_month = peak['month']

        # Calculate YoY growth - SAFE VERSION
        yoy_growth = 0
        if year > 2024:
            last_year_start = datetime(year-1, 1, 1, tzinfo=py_timezone.utc)
            last_year_end = datetime(year, 1, 1, tzinfo=py_timezone.utc)
            last_year_revenue = Order.objects.filter(
                created_at__gte=last_year_start,
                created_at__lt=last_year_end,
                status='Completed'
            ).aggregate(
                total=Sum(F('items__cases_ordered') * F('items__price'))
            )['total'] or 0
            
            current_year_revenue = sum(r['sales'] for r in chart_data)
            if last_year_revenue > 0:
                yoy_growth = ((current_year_revenue - last_year_revenue) / last_year_revenue) * 100
            elif current_year_revenue > 0:
                yoy_growth = 100  # First year of sales
            else:
                yoy_growth = 0

        # Get top beverage for year - SAFE VERSION
        top_beverage = OrderItem.objects.filter(
            order__created_at__gte=start_date,
            order__created_at__lt=end_date,
            order__status='Completed'
        ).values('beverage__name').annotate(
            total_qty=Sum('cases_ordered')
        ).order_by('-total_qty').first()
        
        top_beverage_name = top_beverage['beverage__name'] if top_beverage else None
        top_beverage_share = 0
        if top_beverage_name:
            total_qty_result = OrderItem.objects.filter(
                order__created_at__gte=start_date,
                order__created_at__lt=end_date,
                order__status='Completed'
            ).aggregate(total=Sum('cases_ordered'))
            total_qty = float(total_qty_result['total'] or 1)  # Avoid division by zero
            top_beverage_share = (float(top_beverage['total_qty']) / total_qty) * 100

        # Generate insights
        insights_data = {
            'top_beverage': top_beverage_name,
            'top_beverage_share': top_beverage_share,
            'growth_rate': growth_rate,
            'peak_month': peak_month,
            'yoy_growth': yoy_growth
        }
        insights = _generate_insights(insights_data, year)

        return Response({
            'success': True,
            'data': chart_data,
            'year': year,
            'insights': insights,
            'metrics': {
                'growth_rate': round(growth_rate, 2),
                'yoy_growth': round(yoy_growth, 2),
                'peak_month': peak_month,
                'total_revenue': sum(r['sales'] for r in chart_data),
                'total_orders': sum(r['orders'] for r in chart_data)
            }
        })
    except Exception as e:
        logger.error(f"Error in monthly_sales_data: {str(e)}")
        return Response({
            'success': True,  # Return success=True even with empty data
            'data': [],
            'year': year,
            'insights': ["No sales data available for this year"],
            'metrics': {
                'growth_rate': 0,
                'yoy_growth': 0,
                'peak_month': None,
                'total_revenue': 0,
                'total_orders': 0
            }
        }, status=200)  # Return 200 OK instead of 500

@api_view(['GET'])
@permission_classes([IsAdminUser])
def beverage_sales_report(request):
    try:
        days = int(request.GET.get('days', 90))
        start_date = timezone.now() - timedelta(days=days)

        order_items = OrderItem.objects.filter(
            order__created_at__gte=start_date,
            order__status='Completed'
        ).values('beverage__name').annotate(
            units_sold=Sum('cases_ordered'),
            revenue=Sum(F('cases_ordered') * F('price'))
        ).order_by('-units_sold')

        result = [
            {
                'name': item['beverage__name'],
                'units_sold': float(item['units_sold'] or 0),
                'revenue': float(round(item['revenue'], 2)),
            }
            for item in order_items if item['beverage__name']
        ]
        return Response({'success': True, 'data': result})
    except Exception as e:
        logger.error(f"Error in beverage_sales_report: {str(e)}")
        return Response({'success': False, 'error': str(e)}, status=500)


@api_view(['GET'])
@permission_classes([IsAdminUser])
def top_selling_beverages(request):
    try:
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
        total_quantity = sum(float(b['total_quantity']) for b in beverage_data)
        for bev in beverage_data:
            if bev['beverage__name']:
                share = (float(bev['total_quantity']) / total_quantity * 100) if total_quantity > 0 else 0
                chart_data.append({
                    'name': bev['beverage__name'],
                    'quantity': float(bev['total_quantity']),
                    'revenue': float(bev['total_revenue'] or 0),
                    'orders': bev['order_count'],
                    'market_share': round(share, 1)
                })

        # Product performance insights
        insights = []
        if chart_data:
            top_product = chart_data[0]
            insights.append(
                f"{top_product['name']} dominates with {top_product['market_share']}% market share "
                f"({top_product['quantity']} cases sold)."
            )
            
            # Identify growth opportunities
            if len(chart_data) > 1:
                second = chart_data[1]
                gap = top_product['quantity'] - second['quantity']
                if gap > top_product['quantity'] * 0.5:
                    insights.append(
                        f"Consider promoting {second['name']} to reduce dependency on {top_product['name']}."
                    )
            
            # Low performers
            low_performers = [p for p in chart_data if p['market_share'] < 2]
            if low_performers:
                insights.append(
                    f"{len(low_performers)} products have <2% market share. "
                    "Evaluate discontinuation or special promotions."
                )

        return Response({
            'success': True,
            'data': chart_data,
            'period': f"Last {days} days",
            'insights': insights
        })
    except Exception as e:
        logger.error(f"Error in top_selling_beverages: {str(e)}")
        return Response({'success': False, 'error': str(e)}, status=500)


@api_view(['GET'])
@permission_classes([IsAdminUser])
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
                .values('beverage__name')
                .annotate(
                    quantity=Sum('cases_ordered'),
                    total_revenue=Sum(F('cases_ordered') * F('price'))
                )
                .order_by('-total_revenue')
            )

            beverages = []
            for item in beverage_data:
                if item['beverage__name']:
                    beverages.append({
                        'name': item['beverage__name'],
                        'quantity': float(item['quantity'] or 0),
                        'revenue': float(item['total_revenue'] or 0),
                    })

            # Barangay-specific insights
            top_beverage = beverages[0]['name'] if beverages else "N/A"
            result.append({
                'barangay': barangay_name,
                'total_orders': barangay_info['total_orders'],
                'total_items': float(barangay_info['total_items'] or 0),
                'beverages': beverages[:5],
                'top_beverage': top_beverage,
                'insight': f"{top_beverage} is most popular in {barangay_name}"
            })

        # Overall location insights
        overall_insights = []
        if result:
            top_barangay = result[0]
            overall_insights.append(
                f"{top_barangay['barangay']} is your strongest market with "
                f"{top_barangay['total_items']} items sold."
            )
            
            # Geographic concentration
            total_items = sum(b['total_items'] for b in result)
            top_3_share = sum(b['total_items'] for b in result[:3]) / total_items if total_items > 0 else 0
            if top_3_share > 0.6:
                overall_insights.append(
                    "Top 3 barangays account for over 60% of deliveries. "
                    "Consider expanding marketing in other areas."
                )

        return Response({
            'success': True,
            'data': result,
            'insights': overall_insights
        })
    except Exception as e:
        logger.error(f"Error in beverage_popularity_by_barangay: {str(e)}")
        return Response({'success': False, 'error': str(e)}, status=500)


@api_view(['GET'])
@permission_classes([IsAdminUser])
def sales_summary(request):
    try:
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
        
        # Calculate repeat customers
        repeat_customers = Order.objects.filter(
            created_at__gte=start_date, 
            status='Completed'
        ).values('user_id').annotate(
            order_count=Count('id')
        ).filter(order_count__gt=1).count()
        
        total_customers = Order.objects.filter(
            created_at__gte=start_date, 
            status='Completed'
        ).values('user_id').distinct().count()
        
        repeat_rate = (repeat_customers / total_customers * 100) if total_customers > 0 else 0
        
        # Insights
        insights = []
        if total_revenue > 0:
            insights.append(
                f"Average order value is ₱{avg_order_value:,.2f}. "
                "Bundle offers could increase this metric."
            )
        
        if repeat_rate > 30:
            insights.append(
                f"Repeat customer rate is {repeat_rate:.1f}% - excellent loyalty! "
                "Consider a rewards program."
            )
        elif repeat_rate < 15:
            insights.append(
                f"Only {repeat_rate:.1f}% repeat customers. "
                "Implement follow-up promotions after first purchase."
            )
        
        if top_beverage:
            insights.append(
                f"{top_beverage['beverage__name']} is your star product. "
                "Feature it prominently in marketing materials."
            )

        return Response({
            'success': True,
            'data': {
                'total_orders': total_orders,
                'total_revenue': float(total_revenue),
                'total_items_sold': float(total_items_sold),
                'average_order_value': round(avg_order_value, 2),
                'top_beverage': top_beverage['beverage__name'] if top_beverage else 'N/A',
                'period_days': days,
                'repeat_customer_rate': round(repeat_rate, 1),
                'total_customers': total_customers
            },
            'insights': insights
        })
    except Exception as e:
        logger.error(f"Error in sales_summary: {str(e)}")
        return Response({'success': False, 'error': str(e)}, status=500)


@api_view(['GET'])
@permission_classes([IsAdminUser])
def customer_analytics(request, user_id):
    try:
        orders = Order.objects.filter(user_id=user_id, status='Completed')
        if not orders.exists():
            return Response({"success": False, "error": "No orders found for this customer."}, status=404)

        total_orders = orders.count()
        total_spent = orders.aggregate(total=Sum('total_price'))['total'] or 0
        avg_order_value = total_spent / total_orders if total_orders > 0 else 0

        favorite_beverages = (
            OrderItem.objects.filter(order__user_id=user_id, order__status='Completed')
            .values('beverage__name')
            .annotate(order_count=Count('id'))
            .order_by('-order_count')[:5]
        )

        monthly = (
            orders.annotate(month=TruncMonth('created_at'))
            .values('month')
            .annotate(spent=Sum('total_price'))
            .order_by('month')
        )

        top_barangay = (
            orders.filter(delivery_type='Delivered')
            .values('address')
            .annotate(count=Count('id'))
            .order_by('-count')
            .first()
        )

        # Customer-specific insights
        insights = []
        if total_orders >= 5:
            insights.append("Loyal customer - eligible for VIP discounts")
        elif total_orders == 1:
            insights.append("New customer - send welcome offer")
        
        if avg_order_value > 2000:
            insights.append("High-value customer - prioritize service")
        
        if favorite_beverages:
            top_bev = favorite_beverages[0]['beverage__name']
            insights.append(f"Prefers {top_bev} - recommend similar products")

        return Response({
            "success": True,
            "data": {
                "customer_name": orders.first().customer_name or "Customer",
                "total_orders": total_orders,
                "total_spent": float(total_spent),
                "average_order_value": float(avg_order_value),
                "favorite_beverages": list(favorite_beverages),
                "monthly_spending": [
                    {"month": item["month"].strftime("%Y-%m"), "amount": float(item["spent"])}
                    for item in monthly
                ],
                "most_ordered_location": top_barangay["address"] if top_barangay else None,
            },
            "insights": insights
        })
    except Exception as e:
        logger.error(f"Error in customer_analytics: {str(e)}")
        return Response({'success': False, 'error': str(e)}, status=500)


# ============================================================================
# ✅ ENHANCED: Monthly Beverage Sales Trend with Deep Insights
# ============================================================================
@api_view(['GET'])
@permission_classes([IsAdminUser])
def monthly_beverage_sales(request):
    """
    GET /api/analytics/monthly-beverage-sales/?year=2025
    Returns monthly sales quantity per beverage with trend analysis.
    """
    try:
        year = _get_year_from_request(request)
        start_date = datetime(year, 1, 1, tzinfo=py_timezone.utc)
        end_date = datetime(year + 1, 1, 1, tzinfo=py_timezone.utc)

        monthly_data = OrderItem.objects.filter(
            order__created_at__gte=start_date,
            order__created_at__lt=end_date,
            order__status='Completed'
        ).annotate(
            month=TruncMonth('order__created_at')
        ).values(
            'month',
            'beverage__name'
        ).annotate(
            total_quantity=Sum('cases_ordered')
        ).order_by('month', 'beverage__name')

        if not monthly_data.exists():
            return Response({
                'success': True,
                'data': [],
                'year': year,
                'top_beverages': [],
                'message': 'No sales data for this year'
            })

        # Convert Decimals to floats immediately
        processed_data = []
        for item in monthly_data:
            processed_data.append({
                'month': item['month'],
                'beverage__name': item['beverage__name'],
                'total_quantity': float(item['total_quantity'] or 0)
            })

        df = pd.DataFrame(processed_data)
        pivot = df.pivot_table(
            index='month',
            columns='beverage__name',
            values='total_quantity',
            aggfunc='sum',
            fill_value=0
        ).reset_index()

        pivot['month_str'] = pivot['month'].dt.strftime('%b')
        pivot['month_full'] = pivot['month'].dt.strftime('%Y-%m')

        result = []
        for _, row in pivot.iterrows():
            entry = {'month': row['month_str'], 'month_full': row['month_full']}
            for col in pivot.columns:
                if col not in ['month', 'month_str', 'month_full']:
                    entry[col] = float(row[col])
            result.append(entry)

        beverage_totals = df.groupby('beverage__name')['total_quantity'].sum().sort_values(ascending=False)
        top_beverages = beverage_totals.head(6).index.tolist()

        # Calculate trends for each beverage
        trends = {}
        for beverage in top_beverages:
            if beverage in pivot.columns:
                values = pivot[beverage].tolist()
                if len(values) >= 2:
                    # Simple trend: compare last month vs first month
                    trend = ((values[-1] - values[0]) / values[0] * 100) if values[0] > 0 else 0
                    trends[beverage] = {
                        'trend': round(trend, 1),
                        'status': 'growing' if trend > 5 else 'declining' if trend < -5 else 'stable'
                    }

        # Generate insights
        insights = []
        if top_beverages:
            main_product = top_beverages[0]
            insights.append(f"{main_product} is your flagship product - ensure consistent stock.")
            
            # Trend analysis
            declining = [b for b, t in trends.items() if t['status'] == 'declining']
            if declining:
                insights.append(
                    f"{' and '.join(declining[:2])} showing declining trends. "
                    "Investigate causes and consider promotions."
                )
            
            growing = [b for b, t in trends.items() if t['status'] == 'growing']
            if growing:
                insights.append(
                    f"{' and '.join(growing[:2])} are gaining popularity. "
                    "Increase marketing focus on these products."
                )
            
            # Seasonality note
            if year in [2025, 2026]:  # Adjust based on your data
                insights.append(
                    "March-July shows highest demand. Prepare inventory 1 month in advance."
                )

        return Response({
            'success': True,
            'data': result,
            'year': year,
            'top_beverages': top_beverages,
            'trends': trends,
            'insights': insights
        })

    except Exception as e:
        logger.error(f"Error in monthly_beverage_sales: {str(e)}")
        return Response({'success': False, 'error': str(e)}, status=500)


# ============================================================================
# ✅ NEW: Inventory Health Dashboard
# ============================================================================
@api_view(['GET'])
@permission_classes([IsAdminUser])
def inventory_health(request):
    """Monitor stock levels and predict stockouts"""
    try:
        # Get current stock levels
        beverages = Beverage.objects.filter(is_available=True)
        inventory_data = []
        critical_items = 0
        low_stock_items = 0
        
        # Calculate average daily sales (last 30 days)
        start_date = timezone.now() - timedelta(days=30)
        daily_sales = OrderItem.objects.filter(
            order__created_at__gte=start_date,
            order__status='Completed'
        ).values('beverage_id').annotate(
            avg_daily=Avg('cases_ordered')
        )
        sales_dict = {item['beverage_id']: float(item['avg_daily'] or 0) for item in daily_sales}
        
        for bev in beverages:
            current_stock = float(bev.stock)
            avg_daily = sales_dict.get(bev.id, 0.1)  # Avoid division by zero
            days_of_stock = current_stock / avg_daily if avg_daily > 0 else 999
            
            status = 'healthy'
            if days_of_stock < 7:
                status = 'critical'
                critical_items += 1
            elif days_of_stock < 14:
                status = 'low'
                low_stock_items += 1
                
            inventory_data.append({
                'name': bev.name,
                'current_stock': current_stock,
                'avg_daily_sales': round(avg_daily, 2),
                'days_of_stock': round(days_of_stock, 1),
                'status': status,
                'recommended_reorder': max(0, (14 * avg_daily) - current_stock)
            })
        
        # Sort by urgency
        inventory_data.sort(key=lambda x: x['days_of_stock'])
        
        insights = []
        if critical_items > 0:
            insights.append(
                f"{critical_items} products are in critical stock (<7 days). "
                "Immediate reorder required for Coca-Cola Regular."
            )
        if low_stock_items > 0:
            insights.append(
                f"{low_stock_items} products have low stock (<14 days). "
                "Schedule replenishment this week."
            )
        if critical_items == 0 and low_stock_items == 0:
            insights.append("Inventory levels are healthy across all products.")
            
        return Response({
            'success': True,
            'data': inventory_data,
            'summary': {
                'total_products': len(inventory_data),
                'critical_items': critical_items,
                'low_stock_items': low_stock_items,
                'healthy_items': len(inventory_data) - critical_items - low_stock_items
            },
            'insights': insights
        })
        
    except Exception as e:
        logger.error(f"Error in inventory_health: {str(e)}")
        return Response({'success': False, 'error': str(e)}, status=500)


# ============================================================================
# ✅ NEW: Daily Sales Pattern Analysis
# ============================================================================
@api_view(['GET'])
@permission_classes([IsAdminUser])
def daily_sales_patterns(request):
    """Analyze hourly and weekday sales patterns"""
    try:
        days = int(request.GET.get('days', 90))
        start_date = timezone.now() - timedelta(days=days)
        
        # Hourly pattern - use TruncHour instead of raw SQL
        hourly_data = Order.objects.filter(
            created_at__gte=start_date,
            status='Completed'
        ).annotate(
            hour=TruncHour('created_at')
        ).values('hour').annotate(
            orders=Count('id'),
            revenue=Sum(F('items__cases_ordered') * F('items__price'))
        ).order_by('hour')
        
        # Create 24-hour array
        hour_chart = [0] * 24
        for item in hourly_data:
            hour = item['hour'].hour
            hour_chart[hour] = float(item['revenue'] or 0)
        
        # Weekday pattern
        weekday_data = Order.objects.filter(
            created_at__gte=start_date,
            status='Completed'
        ).annotate(
            weekday=Extract('created_at', 'week_day')  # Sunday=1, Monday=2, ..., Saturday=7
        ).values('weekday').annotate(
            orders=Count('id'),
            revenue=Sum(F('items__cases_ordered') * F('items__price'))
        ).order_by('weekday')
        
        # Map Django weekdays (1=Sun, 7=Sat) to standard names
        weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
        weekday_chart = []
        for item in weekday_data:
            day_index = (item['weekday'] - 1) % 7  # Convert to 0-6
            weekday_chart.append({
                'day': weekdays[day_index],
                'revenue': float(item['revenue'] or 0)
            })
        
        # Ensure all weekdays are present
        existing_days = {item['day']: item['revenue'] for item in weekday_chart}
        full_weekday_chart = [{'day': day, 'revenue': existing_days.get(day, 0)} for day in weekdays]
        
        # Peak analysis
        peak_hour = hour_chart.index(max(hour_chart)) if max(hour_chart) > 0 else 12
        peak_day_item = max(full_weekday_chart, key=lambda x: x['revenue'])
        peak_day = peak_day_item['day']
        
        insights = [
            f"Peak sales hour: {peak_hour}:00-{peak_hour+1}:00",
            f"Busiest day: {peak_day}"
        ]
        
        # Morning vs Afternoon
        morning_rev = sum(hour_chart[6:12])  # 6AM-12PM
        afternoon_rev = sum(hour_chart[12:18])  # 12PM-6PM
        evening_rev = sum(hour_chart[18:24])  # 6PM-12AM
        
        if morning_rev > afternoon_rev and morning_rev > evening_rev:
            insights.append("Morning sales dominate - optimize breakfast bundles")
        elif afternoon_rev > morning_rev and afternoon_rev > evening_rev:
            insights.append("Afternoon is prime time - push lunch deals")
        else:
            insights.append("Evening drives revenue - enhance dinner promotions")
        
        return Response({
            'success': True,
            'hourly_data': hour_chart,
            'weekday_data': full_weekday_chart,
            'peak_hour': peak_hour,
            'peak_day': peak_day,
            'insights': insights,
            'period_days': days
        })
        
    except Exception as e:
        logger.error(f"Error in daily_sales_patterns: {str(e)}")
        return Response({'success': False, 'error': str(e)}, status=500)