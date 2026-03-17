# api/urls.py
from django.urls import path
from rest_framework.routers import DefaultRouter

# Beverages
from .view.beverages import (
    get_categories,
    get_beverages,
    get_beverage_detail,
    BeverageCategoryViewSet,
    BeverageViewSet
)

# Orders
from .view.orders import (
    place_order,
    get_user_orders,
    delete_order,
    OrderViewSet,
    approve_gcash_payment,
    reject_gcash_payment,
    mark_delivered_by_staff,
    confirm_receipt_by_customer
)

# Users
from .view.users import update_user_profile

# Admin Orders
from .view.admin_orders import (
    get_admin_orders,
    order_history,
    get_order_details,
    get_order_items,
    CreateOrderReviewView,
    order_reviews_list
)

# Reviews
from .view.reviews import (
    CreateOrUpdateReview,
    get_all_reviews
)

# Role Requests
from .view.role_request import (
    RoleRequestViewSet,
    RoleRequestAdminViewSet,
)

# Analytics (from view.analytics)
from .view.analytics import (
    monthly_sales_data,
    beverage_popularity_by_barangay,
    top_selling_beverages,
    sales_summary,
    monthly_sales_report,
    beverage_sales_report,
    customer_analytics,
    # 👇 NEW ANALYTICS ENDPOINTS
    monthly_beverage_sales,
    inventory_health,
    daily_sales_patterns,
)

# Report Downloads (from main views.py)
from .views import (
    CustomerAdminViewSet,
    StaffAdminViewSet,
    VehicleViewSet,
    CustomUserViewSet,
    total_users,
    pending_role_request_count,
    submit_feedback,
    download_receipt,
    # 👇 NEW REPORT ENDPOINTS
    download_sales_report,
    download_inventory_report,
    download_customer_report,      
    download_location_report,     
    download_trends_report,  
    staff_profile_view,
    staff_preference_view,
    list_barangays
)

from .view.staffprep import ( staff_profile_detail )


router = DefaultRouter()
router.register(r'role-requests', RoleRequestViewSet, basename='role-request')
router.register(r'admin/role-requests', RoleRequestAdminViewSet, basename='admin-role-request')
router.register(r'categories', BeverageCategoryViewSet, basename='beverage-category')
router.register(r'beverages', BeverageViewSet, basename='beverage')
router.register(r'orders', OrderViewSet, basename='order')
router.register(r'admin/staff', StaffAdminViewSet, basename='admin-staff')
router.register(r'vehicles', VehicleViewSet, basename='vehicle')
router.register(r'admin/customers', CustomerAdminViewSet, basename='admin-customers')
router.register(r'admin/users', CustomUserViewSet, basename='admin-users')

urlpatterns = [
    # User Profile
    path('profile/update/', update_user_profile, name='update-profile'),
    
    # Custom Beverage Endpoints
    path('custom-categories/', get_categories),
    path('custom-beverages/', get_beverages),
    path('custom-beverages/<int:pk>/', get_beverage_detail),
    path('barangays/', list_barangays, name='list-barangays'),
    # Custom Order Endpoints
    path('place_order/', place_order),
    path('user/orders/', get_user_orders),
    path('orders/<int:order_id>/delete/', delete_order),
    path('orders/<int:order_id>/mark-delivered/', mark_delivered_by_staff, name='mark-delivered'),
    path('orders/<int:order_id>/confirm-receipt/', confirm_receipt_by_customer, name='confirm-receipt'), 
    path('order-history/', order_history),
    path('admin/approve-gcash/<int:order_id>/', approve_gcash_payment, name='approve-gcash'),
    path('admin/reject-gcash/<int:order_id>/', reject_gcash_payment, name='reject-gcash'),

    # Customer Analytics
    path('customers/<int:user_id>/analytics/', customer_analytics, name='customer-analytics'),  

    # Admin Order Management
    path('admin/orders/', get_admin_orders),
    path('admin/orders/<int:pk>/', get_order_details, name='order-details'),
    path('admin/order-items/', get_order_items, name='get_order_items'),

    # Role Request Utilities
    path('api/role-requests/pending-count/', pending_role_request_count),
    path('staff/profile/', staff_profile_view, name='staff-profile'),
    path('staff/profile/', staff_profile_detail, name='staff-profile'),
    path('staff/preferences/', staff_preference_view, name='staff-preferences'),

    # Reviews
    path('reviews/', CreateOrUpdateReview.as_view(), name='create-or-update-review'),
    path('reviews/all/', get_all_reviews, name='get-all-reviews'),
    path('order-reviews/list/', order_reviews_list, name='order-reviews-list'),

    # Dashboard Metrics
    path('total-users/', total_users, name='total-users'),

    # Feedback
    path('orders/<int:order_id>/feedback/', submit_feedback, name='submit_feedback'),

    # 🔍 Analytics Endpoints
    path('admin/monthly-sales/', monthly_sales_report, name='monthly_sales_report'),
    path('admin/beverage-report/', beverage_sales_report, name='beverage_sales_report'),
    
    # Public analytics API (used by frontend dashboard)
    path('analytics/monthly-sales/', monthly_sales_data, name='monthly-sales'),
    path('analytics/beverage-by-barangay/', beverage_popularity_by_barangay, name='beverage-by-barangay'),
    path('analytics/top-beverages/', top_selling_beverages, name='top-beverages'),
    path('analytics/sales-summary/', sales_summary, name='sales_summary'),
    
    # 👇 NEW ANALYTICS ENDPOINTS
    path('analytics/monthly-beverage-sales/', monthly_beverage_sales, name='monthly-beverage-sales'),
    path('analytics/inventory-health/', inventory_health, name='inventory-health'),
    path('analytics/daily-sales-patterns/', daily_sales_patterns, name='daily-sales-patterns'),
    
    # 📊 REPORT DOWNLOAD ENDPOINTS
    path('reports/sales/', download_sales_report, name='download-sales-report'),
    path('reports/inventory/', download_inventory_report, name='download-inventory-report'),
    path('reports/customers/', download_customer_report, name='download-customer-report'),      # 👈 NEW
    path('reports/location/', download_location_report, name='download-location-report'),     # 👈 NEW
    path('reports/trends/', download_trends_report, name='download-trends-report'),
    # Receipt
    path('orders/<int:order_id>/receipt/', download_receipt, name='download_receipt'),
]

urlpatterns += router.urls