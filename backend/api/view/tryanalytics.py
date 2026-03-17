"""
Advanced Analytics & Demand Forecasting
All analytics endpoints in one file for easy testing and development
"""

import logging
import calendar
import numpy as np
import pandas as pd
from datetime import datetime, timedelta
from decimal import Decimal

from django.db.models import Count, Sum, Avg, F, Q, FloatField, Max
from django.db.models.functions import TruncDay, TruncWeek, TruncMonth, ExtractWeekDay
from django.utils import timezone
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from rest_framework.response import Response

from ..models import Order, OrderItem, Beverage, CustomUser

logger = logging.getLogger(__name__)


# ============================================================================
# HELPER FUNCTIONS - Data Processing & ML
# ============================================================================

def get_historical_sales_data(days=180):
    """Get historical sales data for analysis"""
    start_date = timezone.now() - timedelta(days=days)
    
    data = OrderItem.objects.filter(
        order__created_at__gte=start_date,
        order__status='Completed'
    ).values(
        'beverage__id',
        'beverage__name',
        'order__created_at'
    ).annotate(
        quantity=Sum('cases_ordered'),
        revenue=Sum(F('cases_ordered') * F('price'))
    ).order_by('order__created_at')
    
    return list(data)


def prepare_time_series_data(beverage_id, days=90):
    """Prepare daily time series data for a specific beverage"""
    start_date = timezone.now() - timedelta(days=days)
    
    # Get daily sales
    daily_sales = OrderItem.objects.filter(
        beverage_id=beverage_id,
        order__created_at__gte=start_date,
        order__status='Completed'
    ).annotate(
        date=TruncDay('order__created_at')
    ).values('date').annotate(
        quantity=Sum('cases_ordered')
    ).order_by('date')
    
    # Convert to pandas DataFrame for easier manipulation
    df = pd.DataFrame(list(daily_sales))
    
    if df.empty:
        return pd.DataFrame()
    
    # Fill missing dates with 0
    df['date'] = pd.to_datetime(df['date'])
    date_range = pd.date_range(start=start_date, end=timezone.now(), freq='D')
    df = df.set_index('date').reindex(date_range, fill_value=0).reset_index()
    df.columns = ['date', 'quantity']
    
    return df


def simple_moving_average_forecast(data, window=7, forecast_days=30):
    """Simple Moving Average forecast"""
    if len(data) < window:
        # Not enough data, return mean as forecast
        mean_val = data['quantity'].mean() if not data.empty else 0
        return [float(mean_val)] * forecast_days
    
    # Calculate moving average
    ma = data['quantity'].rolling(window=window, min_periods=1).mean()
    last_ma = ma.iloc[-1]
    
    # Simple forecast: use last MA value
    return [float(last_ma)] * forecast_days


def exponential_smoothing_forecast(data, alpha=0.3, forecast_days=30):
    """Exponential Smoothing forecast"""
    if data.empty:
        return [0] * forecast_days
    
    values = data['quantity'].values
    
    # Initialize
    result = [values[0]]
    
    # Calculate smoothed values
    for i in range(1, len(values)):
        smoothed = alpha * values[i] + (1 - alpha) * result[-1]
        result.append(smoothed)
    
    # Forecast using last smoothed value
    last_value = result[-1]
    return [float(last_value)] * forecast_days


def linear_trend_forecast(data, forecast_days=30):
    """Linear regression forecast"""
    if len(data) < 2:
        mean_val = data['quantity'].mean() if not data.empty else 0
        return [float(mean_val)] * forecast_days
    
    # Prepare data
    X = np.arange(len(data)).reshape(-1, 1)
    y = data['quantity'].values
    
    # Simple linear regression (without sklearn)
    n = len(X)
    x_mean = X.mean()
    y_mean = y.mean()
    
    # Calculate slope and intercept
    numerator = ((X.flatten() - x_mean) * (y - y_mean)).sum()
    denominator = ((X.flatten() - x_mean) ** 2).sum()
    
    if denominator == 0:
        return [float(y_mean)] * forecast_days
    
    slope = numerator / denominator
    intercept = y_mean - slope * x_mean
    
    # Forecast
    future_X = np.arange(len(data), len(data) + forecast_days)
    forecast = slope * future_X + intercept
    
    # Ensure non-negative
    forecast = np.maximum(forecast, 0)
    
    return forecast.tolist()


def detect_seasonality(data):
    """Detect weekly seasonality patterns"""
    if data.empty:
        return {}
    
    df = data.copy()
    df['weekday'] = pd.to_datetime(df['date']).dt.dayofweek
    
    # Calculate average by weekday
    weekday_avg = df.groupby('weekday')['quantity'].mean().to_dict()
    
    weekday_names = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
    
    return {
        weekday_names[k]: float(v) 
        for k, v in weekday_avg.items()
    }


def calculate_forecast_accuracy(actual, predicted):
    """Calculate forecast accuracy metrics"""
    if len(actual) == 0:
        return {'mape': 0, 'rmse': 0}
    
    actual = np.array(actual)
    predicted = np.array(predicted[:len(actual)])
    
    # MAPE (Mean Absolute Percentage Error)
    mask = actual != 0
    if mask.sum() > 0:
        mape = np.mean(np.abs((actual[mask] - predicted[mask]) / actual[mask])) * 100
    else:
        mape = 0
    
    # RMSE (Root Mean Square Error)
    rmse = np.sqrt(np.mean((actual - predicted) ** 2))
    
    return {
        'mape': float(mape),
        'rmse': float(rmse)
    }


# ============================================================================
# API ENDPOINTS
# ============================================================================

@api_view(['GET'])
@permission_classes([IsAdminUser])
def demand_forecast(request):
    """
    GET /api/analytics/demand-forecast/?beverage_id=1&days=30
    
    Returns demand forecast for specific beverage or all beverages
    """
    try:
        beverage_id = request.GET.get('beverage_id')
        forecast_days = int(request.GET.get('days', 30))
        method = request.GET.get('method', 'ensemble')  # ma, es, linear, ensemble
        
        if beverage_id:
            # Single beverage forecast
            beverage = Beverage.objects.get(id=beverage_id)
            historical_data = prepare_time_series_data(beverage_id, days=90)
            
            if historical_data.empty:
                return Response({
                    'success': False,
                    'message': 'Not enough historical data for this beverage'
                })
            
            # Generate forecasts using different methods
            ma_forecast = simple_moving_average_forecast(historical_data, forecast_days=forecast_days)
            es_forecast = exponential_smoothing_forecast(historical_data, forecast_days=forecast_days)
            lr_forecast = linear_trend_forecast(historical_data, forecast_days=forecast_days)
            
            # Ensemble: average of all methods
            ensemble_forecast = [
                (ma + es + lr) / 3 
                for ma, es, lr in zip(ma_forecast, es_forecast, lr_forecast)
            ]
            
            # Select method
            forecasts = {
                'ma': ma_forecast,
                'es': es_forecast,
                'linear': lr_forecast,
                'ensemble': ensemble_forecast
            }
            
            selected_forecast = forecasts.get(method, ensemble_forecast)
            
            # Detect seasonality
            seasonality = detect_seasonality(historical_data)
            
            # Calculate statistics
            current_stock = float(beverage.stock)
            avg_daily_demand = float(historical_data['quantity'].mean())
            total_forecast = sum(selected_forecast)
            
            # Stock adequacy
            days_of_stock = current_stock / avg_daily_demand if avg_daily_demand > 0 else 999
            needs_reorder = days_of_stock < forecast_days
            
            return Response({
                'success': True,
                'beverage': {
                    'id': beverage.id,
                    'name': beverage.name,
                    'current_stock': current_stock
                },
                'forecast': {
                    'method': method,
                    'horizon_days': forecast_days,
                    'daily_forecast': selected_forecast,
                    'total_forecast': total_forecast,
                    'avg_daily_demand': avg_daily_demand
                },
                'insights': {
                    'days_of_stock_remaining': round(days_of_stock, 1),
                    'needs_reorder': needs_reorder,
                    'recommended_order_quantity': max(0, total_forecast - current_stock),
                    'stockout_risk': 'High' if days_of_stock < 7 else 'Medium' if days_of_stock < 14 else 'Low'
                },
                'seasonality': seasonality,
                'historical_avg': avg_daily_demand
            })
        
        else:
            # All beverages summary forecast
            beverages = Beverage.objects.filter(is_available=True)
            forecasts = []
            
            for bev in beverages:
                historical_data = prepare_time_series_data(bev.id, days=90)
                
                if historical_data.empty:
                    continue
                
                # Quick ensemble forecast
                ma = simple_moving_average_forecast(historical_data, forecast_days=forecast_days)
                es = exponential_smoothing_forecast(historical_data, forecast_days=forecast_days)
                lr = linear_trend_forecast(historical_data, forecast_days=forecast_days)
                
                ensemble = [(m + e + l) / 3 for m, e, l in zip(ma, es, lr)]
                total_forecast = sum(ensemble)
                
                avg_daily = float(historical_data['quantity'].mean())
                current_stock = float(bev.stock)
                days_of_stock = current_stock / avg_daily if avg_daily > 0 else 999
                
                forecasts.append({
                    'beverage_id': bev.id,
                    'beverage_name': bev.name,
                    'current_stock': current_stock,
                    'forecast_demand': round(total_forecast, 2),
                    'avg_daily_demand': round(avg_daily, 2),
                    'days_of_stock': round(days_of_stock, 1),
                    'needs_reorder': days_of_stock < forecast_days,
                    'stockout_risk': 'High' if days_of_stock < 7 else 'Medium' if days_of_stock < 14 else 'Low'
                })
            
            # Sort by stockout risk
            forecasts.sort(key=lambda x: x['days_of_stock'])
            
            return Response({
                'success': True,
                'forecast_horizon_days': forecast_days,
                'total_products': len(forecasts),
                'products_needing_reorder': sum(1 for f in forecasts if f['needs_reorder']),
                'forecasts': forecasts
            })
    
    except Beverage.DoesNotExist:
        return Response({'success': False, 'error': 'Beverage not found'}, status=404)
    except Exception as e:
        logger.error(f"Demand forecast error: {str(e)}")
        return Response({'success': False, 'error': str(e)}, status=500)


@api_view(['GET'])
@permission_classes([IsAdminUser])
def inventory_recommendations(request):
    """
    GET /api/analytics/inventory-recommendations/
    
    Smart inventory reorder suggestions based on demand forecast
    """
    try:
        forecast_days = int(request.GET.get('days', 30))
        safety_stock_days = int(request.GET.get('safety_days', 7))
        
        beverages = Beverage.objects.filter(is_available=True)
        recommendations = []
        
        for bev in beverages:
            historical_data = prepare_time_series_data(bev.id, days=90)
            
            if historical_data.empty:
                continue
            
            # Forecast demand
            ma = simple_moving_average_forecast(historical_data, forecast_days=forecast_days)
            es = exponential_smoothing_forecast(historical_data, forecast_days=forecast_days)
            lr = linear_trend_forecast(historical_data, forecast_days=forecast_days)
            ensemble = [(m + e + l) / 3 for m, e, l in zip(ma, es, lr)]
            
            forecast_demand = sum(ensemble)
            avg_daily = float(historical_data['quantity'].mean())
            std_daily = float(historical_data['quantity'].std())
            
            # Calculate reorder point (ROP)
            lead_time_days = 3  # Assume 3 days lead time
            safety_stock = avg_daily * safety_stock_days + (std_daily * 1.65)  # 95% service level
            reorder_point = (avg_daily * lead_time_days) + safety_stock
            
            # Economic Order Quantity (simplified)
            optimal_order = forecast_demand + safety_stock
            
            current_stock = float(bev.stock)
            should_reorder = current_stock <= reorder_point
            
            urgency = 'Critical' if current_stock < avg_daily * 3 else \
                     'High' if current_stock < reorder_point else \
                     'Medium' if current_stock < forecast_demand else 'Low'
            
            recommendations.append({
                'beverage_id': bev.id,
                'beverage_name': bev.name,
                'current_stock': current_stock,
                'reorder_point': round(reorder_point, 2),
                'safety_stock': round(safety_stock, 2),
                'forecast_demand': round(forecast_demand, 2),
                'recommended_order_qty': round(max(0, optimal_order - current_stock), 2),
                'should_reorder': should_reorder,
                'urgency': urgency,
                'days_until_stockout': round(current_stock / avg_daily, 1) if avg_daily > 0 else 999,
                'avg_daily_demand': round(avg_daily, 2)
            })
        
        # Sort by urgency
        urgency_order = {'Critical': 0, 'High': 1, 'Medium': 2, 'Low': 3}
        recommendations.sort(key=lambda x: urgency_order[x['urgency']])
        
        critical_count = sum(1 for r in recommendations if r['urgency'] == 'Critical')
        reorder_count = sum(1 for r in recommendations if r['should_reorder'])
        
        return Response({
            'success': True,
            'summary': {
                'total_products': len(recommendations),
                'critical_items': critical_count,
                'items_needing_reorder': reorder_count,
                'forecast_period_days': forecast_days,
                'safety_stock_days': safety_stock_days
            },
            'recommendations': recommendations
        })
    
    except Exception as e:
        logger.error(f"Inventory recommendations error: {str(e)}")
        return Response({'success': False, 'error': str(e)}, status=500)


@api_view(['GET'])
@permission_classes([IsAdminUser])
def sales_predictions(request):
    """
    GET /api/analytics/sales-predictions/?days=30
    
    Revenue and sales forecasting
    """
    try:
        forecast_days = int(request.GET.get('days', 30))
        
        # Get historical data
        start_date = timezone.now() - timedelta(days=90)
        
        daily_sales = Order.objects.filter(
            created_at__gte=start_date,
            status='Completed'
        ).annotate(
            date=TruncDay('created_at')
        ).values('date').annotate(
            revenue=Sum(F('items__cases_ordered') * F('items__price')),
            orders=Count('id'),
            items_sold=Sum('items__cases_ordered')
        ).order_by('date')
        
        df = pd.DataFrame(list(daily_sales))
        
        if df.empty:
            return Response({
                'success': False,
                'message': 'Not enough historical data'
            })
        
        # Fill missing dates
        df['date'] = pd.to_datetime(df['date'])
        date_range = pd.date_range(start=start_date, end=timezone.now(), freq='D')
        df = df.set_index('date').reindex(date_range, fill_value=0).reset_index()
        df.columns = ['date', 'revenue', 'orders', 'items_sold']
        
        # Forecast revenue
        revenue_forecast = linear_trend_forecast(
            pd.DataFrame({'quantity': df['revenue']}),
            forecast_days=forecast_days
        )
        
        # Forecast orders
        orders_forecast = linear_trend_forecast(
            pd.DataFrame({'quantity': df['orders']}),
            forecast_days=forecast_days
        )
        
        # Calculate statistics
        avg_daily_revenue = float(df['revenue'].mean())
        avg_daily_orders = float(df['orders'].mean())
        total_forecast_revenue = sum(revenue_forecast)
        total_forecast_orders = sum(orders_forecast)
        
        # Growth rate
        if len(df) >= 30:
            recent_avg = df['revenue'].tail(7).mean()
            older_avg = df['revenue'].head(7).mean()
            growth_rate = ((recent_avg - older_avg) / older_avg * 100) if older_avg > 0 else 0
        else:
            growth_rate = 0
        
        # Generate forecast dates
        forecast_dates = [
            (timezone.now() + timedelta(days=i)).strftime('%Y-%m-%d')
            for i in range(1, forecast_days + 1)
        ]
        
        return Response({
            'success': True,
            'forecast': {
                'horizon_days': forecast_days,
                'daily_revenue_forecast': [round(r, 2) for r in revenue_forecast],
                'daily_orders_forecast': [round(o, 2) for o in orders_forecast],
                'forecast_dates': forecast_dates,
                'total_forecast_revenue': round(total_forecast_revenue, 2),
                'total_forecast_orders': round(sum(orders_forecast), 0)
            },
            'historical': {
                'avg_daily_revenue': round(avg_daily_revenue, 2),
                'avg_daily_orders': round(avg_daily_orders, 2),
                'growth_rate_percent': round(growth_rate, 2)
            },
            'insights': {
                'trend': 'Growing' if growth_rate > 5 else 'Declining' if growth_rate < -5 else 'Stable',
                'confidence': 'High' if len(df) >= 60 else 'Medium' if len(df) >= 30 else 'Low'
            }
        })
    
    except Exception as e:
        logger.error(f"Sales predictions error: {str(e)}")
        return Response({'success': False, 'error': str(e)}, status=500)


@api_view(['GET'])
@permission_classes([IsAdminUser])
def customer_insights(request):
    """
    GET /api/analytics/customer-insights/
    
    Customer segmentation and behavioral analysis (RFM)
    """
    try:
        # RFM Analysis: Recency, Frequency, Monetary
        current_date = timezone.now()
        
        customer_data = CustomUser.objects.filter(
            role='user'
        ).annotate(
            total_orders=Count('order', filter=Q(order__status='Completed')),
            total_spent=Sum(
                F('order__items__cases_ordered') * F('order__items__price'),
                filter=Q(order__status='Completed')
            ),
            last_order_date=Max('order__created_at', filter=Q(order__status='Completed'))
        ).filter(total_orders__gt=0)
        
        customers = []
        for customer in customer_data:
            if customer.last_order_date:
                recency = (current_date - customer.last_order_date).days
            else:
                recency = 999
            
            customers.append({
                'customer_id': customer.id,
                'customer_name': customer.get_full_name(),
                'email': customer.email,
                'recency_days': recency,
                'frequency': customer.total_orders,
                'monetary': float(customer.total_spent or 0)
            })
        
        if not customers:
            return Response({
                'success': False,
                'message': 'No customer data available'
            })
        
        # Calculate RFM scores (1-5 scale)
        df = pd.DataFrame(customers)
        
        # Recency: lower is better (recent purchase)
        df['R_score'] = pd.qcut(df['recency_days'], q=5, labels=[5, 4, 3, 2, 1], duplicates='drop')
        
        # Frequency: higher is better
        df['F_score'] = pd.qcut(df['frequency'].rank(method='first'), q=5, labels=[1, 2, 3, 4, 5], duplicates='drop')
        
        # Monetary: higher is better
        df['M_score'] = pd.qcut(df['monetary'].rank(method='first'), q=5, labels=[1, 2, 3, 4, 5], duplicates='drop')
        
        # Calculate RFM score
        df['RFM_score'] = df['R_score'].astype(int) + df['F_score'].astype(int) + df['M_score'].astype(int)
        
        # Segment customers
        def segment_customer(score):
            if score >= 13:
                return 'Champions'
            elif score >= 10:
                return 'Loyal'
            elif score >= 7:
                return 'Potential'
            else:
                return 'At Risk'
        
        df['segment'] = df['RFM_score'].apply(segment_customer)
        
        # Segmentation summary
        segment_summary = df.groupby('segment').agg({
            'customer_id': 'count',
            'monetary': 'sum',
            'frequency': 'mean'
        }).reset_index()
        
        segment_summary.columns = ['segment', 'customer_count', 'total_revenue', 'avg_orders']
        
        # Top customers
        top_customers = df.nlargest(10, 'monetary')[
            ['customer_name', 'email', 'recency_days', 'frequency', 'monetary', 'segment']
        ].to_dict('records')
        
        # At-risk customers
        at_risk = df[df['segment'] == 'At Risk'].nlargest(10, 'monetary')[
            ['customer_name', 'email', 'recency_days', 'frequency', 'monetary']
        ].to_dict('records')
        
        return Response({
            'success': True,
            'summary': {
                'total_customers': len(df),
                'avg_order_frequency': round(df['frequency'].mean(), 2),
                'avg_customer_value': round(df['monetary'].mean(), 2),
                'total_revenue': round(df['monetary'].sum(), 2)
            },
            'segments': segment_summary.to_dict('records'),
            'top_customers': top_customers,
            'at_risk_customers': at_risk,
            'insights': {
                'champions_count': len(df[df['segment'] == 'Champions']),
                'at_risk_count': len(df[df['segment'] == 'At Risk']),
                'retention_focus': 'High' if len(df[df['segment'] == 'At Risk']) > len(df) * 0.2 else 'Normal'
            }
        })
    
    except Exception as e:
        logger.error(f"Customer insights error: {str(e)}")
        return Response({'success': False, 'error': str(e)}, status=500)


@api_view(['GET'])
@permission_classes([IsAdminUser])
def abc_analysis(request):
    """
    GET /api/analytics/abc-analysis/
    
    ABC analysis - Product classification by revenue contribution
    """
    try:
        days = int(request.GET.get('days', 90))
        start_date = timezone.now() - timedelta(days=days)
        
        # Get product sales
        product_sales = OrderItem.objects.filter(
            order__created_at__gte=start_date,
            order__status='Completed'
        ).values('beverage__id', 'beverage__name').annotate(
            total_revenue=Sum(F('cases_ordered') * F('price')),
            total_quantity=Sum('cases_ordered'),
            order_count=Count('order', distinct=True)
        ).order_by('-total_revenue')
        
        df = pd.DataFrame(list(product_sales))
        
        if df.empty:
            return Response({
                'success': False,
                'message': 'No sales data available'
            })
        
        # Calculate cumulative revenue percentage
        df['revenue'] = df['total_revenue'].astype(float)
        total_revenue = df['revenue'].sum()
        df['revenue_percent'] = (df['revenue'] / total_revenue * 100)
        df['cumulative_percent'] = df['revenue_percent'].cumsum()
        
        # ABC Classification
        def classify_abc(cumulative):
            if cumulative <= 80:
                return 'A'
            elif cumulative <= 95:
                return 'B'
            else:
                return 'C'
        
        df['class'] = df['cumulative_percent'].apply(classify_abc)
        
        # Summary by class
        class_summary = df.groupby('class').agg({
            'beverage__id': 'count',
            'revenue': 'sum',
            'total_quantity': 'sum'
        }).reset_index()
        
        class_summary.columns = ['class', 'product_count', 'total_revenue', 'total_quantity']
        class_summary['revenue_percent'] = (class_summary['total_revenue'] / total_revenue * 100)
        
        # Products by class
        products_by_class = {
            'A': df[df['class'] == 'A'][['beverage__name', 'revenue', 'revenue_percent', 'cumulative_percent']].to_dict('records'),
            'B': df[df['class'] == 'B'][['beverage__name', 'revenue', 'revenue_percent', 'cumulative_percent']].to_dict('records'),
            'C': df[df['class'] == 'C'][['beverage__name', 'revenue', 'revenue_percent', 'cumulative_percent']].to_dict('records')
        }
        
        return Response({
            'success': True,
            'period_days': days,
            'summary': {
                'total_products': len(df),
                'total_revenue': round(total_revenue, 2),
                'class_A_count': len(df[df['class'] == 'A']),
                'class_B_count': len(df[df['class'] == 'B']),
                'class_C_count': len(df[df['class'] == 'C'])
            },
            'class_summary': class_summary.to_dict('records'),
            'products_by_class': products_by_class,
            'insights': {
                'focus_products': len(df[df['class'] == 'A']),
                'recommendation': 'Focus inventory and marketing on Class A products (80% of revenue)',
                'optimization': f"Class C products ({len(df[df['class'] == 'C'])}) contribute only 5% of revenue"
            }
        })
    
    except Exception as e:
        logger.error(f"ABC analysis error: {str(e)}")
        return Response({'success': False, 'error': str(e)}, status=500)


@api_view(['GET'])
@permission_classes([IsAdminUser])
def seasonality_analysis(request):
    """
    GET /api/analytics/seasonality/
    
    Detect patterns: day of week, time trends, seasonal variations
    """
    try:
        days = int(request.GET.get('days', 90))
        start_date = timezone.now() - timedelta(days=days)
        
        # Daily patterns
        daily_pattern = Order.objects.filter(
            created_at__gte=start_date,
            status='Completed'
        ).annotate(
            weekday=ExtractWeekDay('created_at')
        ).values('weekday').annotate(
            total_orders=Count('id'),
            avg_revenue=Avg(F('items__cases_ordered') * F('items__price'))
        ).order_by('weekday')
        
        weekday_names = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
        
        daily_data = []
        for item in daily_pattern:
            weekday_idx = item['weekday'] - 1  # Django weekday: 1=Sunday
            daily_data.append({
                'day': weekday_names[weekday_idx],
                'orders': item['total_orders'],
                'avg_revenue': float(item['avg_revenue'] or 0)
            })
        
        # Monthly trends
        monthly_trend = Order.objects.filter(
            created_at__gte=start_date,
            status='Completed'
        ).annotate(
            month=TruncMonth('created_at')
        ).values('month').annotate(
            total_orders=Count('id'),
            total_revenue=Sum(F('items__cases_ordered') * F('items__price'))
        ).order_by('month')
        
        monthly_data = []
        for item in monthly_trend:
            monthly_data.append({
                'month': item['month'].strftime('%Y-%m'),
                'orders': item['total_orders'],
                'revenue': float(item['total_revenue'] or 0)
            })
        
        # Peak analysis
        if daily_data:
            peak_day = max(daily_data, key=lambda x: x['orders'])
            slow_day = min(daily_data, key=lambda x: x['orders'])
        else:
            peak_day = slow_day = None
        
        # Top selling products by time period
        top_morning = OrderItem.objects.filter(
            order__created_at__gte=start_date,
            order__created_at__hour__lt=12,
            order__status='Completed'
        ).values('beverage__name').annotate(
            quantity=Sum('cases_ordered')
        ).order_by('-quantity').first()
        
        top_afternoon = OrderItem.objects.filter(
            order__created_at__gte=start_date,
            order__created_at__hour__gte=12,
            order__created_at__hour__lt=18,
            order__status='Completed'
        ).values('beverage__name').annotate(
            quantity=Sum('cases_ordered')
        ).order_by('-quantity').first()
        
        return Response({
            'success': True,
            'period_days': days,
            'daily_pattern': daily_data,
            'monthly_trend': monthly_data,
            'peak_analysis': {
                'busiest_day': peak_day['day'] if peak_day else None,
                'busiest_day_orders': peak_day['orders'] if peak_day else 0,
                'slowest_day': slow_day['day'] if slow_day else None,
                'slowest_day_orders': slow_day['orders'] if slow_day else 0
            },
            'product_preferences': {
                'morning_favorite': top_morning['beverage__name'] if top_morning else 'N/A',
                'afternoon_favorite': top_afternoon['beverage__name'] if top_afternoon else 'N/A'
            },
            'insights': {
                'pattern_detected': len(daily_data) > 0,
                'recommendation': f"Focus promotions on {peak_day['day'] if peak_day else 'weekdays'}" if peak_day else "Collect more data",
                'seasonality_strength': 'Strong' if peak_day and slow_day and (peak_day['orders'] / slow_day['orders'] > 2) else 'Moderate'
            }
        })
    
    except Exception as e:
        logger.error(f"Seasonality analysis error: {str(e)}")
        return Response({'success': False, 'error': str(e)}, status=500)


# ============================================================================
# NEW ENDPOINT: Monthly Beverage Sales Trend
# ============================================================================

@api_view(['GET'])
@permission_classes([IsAdminUser])
def monthly_beverage_sales(request):
    """
    GET /api/analytics/monthly-beverage-sales/?year=2025
    
    Returns monthly sales quantity per beverage for the given year.
    Ideal for multi-line trend visualization.
    """
    try:
        year = int(request.GET.get('year', timezone.now().year))
        
        # Define date range for the year
        start_date = datetime(year, 1, 1, tzinfo=timezone.utc)
        end_date = datetime(year + 1, 1, 1, tzinfo=timezone.utc)

        # Fetch completed order items within the year
        monthly_data = OrderItem.objects.filter(
            order__created_at__gte=start_date,
            order__created_at__lt=end_date,
            order__status='Completed'
        ).annotate(
            month=TruncMonth('order__created_at')
        ).values(
            'month',
            'beverage__id',
            'beverage__name'
        ).annotate(
            total_quantity=Sum('cases_ordered'),
            total_revenue=Sum(F('cases_ordered') * F('price'))
        ).order_by('month', 'beverage__name')

        df = pd.DataFrame(list(monthly_data))
        if df.empty:
            return Response({
                'success': True,
                'data': [],
                'year': year,
                'message': 'No sales data for this year'
            })

        # Pivot table: months as rows, beverages as columns
        pivot = df.pivot_table(
            index='month',
            columns='beverage__name',
            values='total_quantity',
            aggfunc='sum',
            fill_value=0
        ).reset_index()

        # Add formatted month strings
        pivot['month_str'] = pivot['month'].dt.strftime('%b')  # e.g., "Jan"
        pivot['month_full'] = pivot['month'].dt.strftime('%Y-%m')

        # Convert to list of dictionaries
        result = []
        for _, row in pivot.iterrows():
            entry = {
                'month': row['month_str'],
                'month_full': row['month_full'],
                **{col: float(row[col]) for col in pivot.columns if col not in ['month', 'month_str', 'month_full']}
            }
            result.append(entry)

        # Identify top beverages by total annual volume
        beverage_totals = df.groupby('beverage__name')['total_quantity'].sum().sort_values(ascending=False)
        top_beverages = beverage_totals.head(6).index.tolist()  # Limit to top 6 for clarity

        return Response({
            'success': True,
            'data': result,
            'year': year,
            'top_beverages': top_beverages,
            'all_beverages': df['beverage__name'].unique().tolist()
        })

    except Exception as e:
        logger.error(f"Monthly beverage sales error: {str(e)}")
        return Response({'success': False, 'error': str(e)}, status=500)