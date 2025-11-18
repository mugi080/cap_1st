# urls.py
from django.urls import path
from rest_framework.routers import DefaultRouter
from .view.beverages import (
    get_categories,
    get_beverages,
    get_beverage_detail
    , BeverageCategoryViewSet, BeverageViewSet
)
from .view.orders import (place_order, 
    get_user_orders, delete_order
    ,OrderViewSet, approve_gcash_payment,reject_gcash_payment)

from .view.users import update_user_profile

from .view.admin_orders import (
    get_admin_orders,
    order_history,
    get_order_details,
    get_order_items,
    CreateOrderReviewView,
    order_reviews_list
)

from .view.reviews import (CreateOrUpdateReview, 
    get_all_reviews)

from .view.role_request import (
    RoleRequestViewSet, RoleRequestAdminViewSet,
    )


from .views import (
    # Beverages




    # Reviews

    # Role Requests
 
    pending_role_request_count,

    # Admin Management
    CustomerAdminViewSet, StaffAdminViewSet,

    # Vehicles
    VehicleViewSet,

    # Dashboard / Analytics
    total_users, 
    
    # Analytics Views
    monthly_sales_report,  # ← Add this import
    beverage_sales_report, CustomUserViewSet,submit_feedback,
    monthly_sales_data, beverage_popularity_by_barangay, top_selling_beverages,
    sales_summary,download_receipt

     # ← Add this import
)

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
    # Custom Beverage Endpoints
    path('custom-categories/', get_categories),
    path('custom-beverages/', get_beverages),
    path('custom-beverages/<int:pk>/', get_beverage_detail),

    # Custom Order Endpoints
    path('place_order/', place_order),
    path('user/orders/', get_user_orders),
    path('orders/<int:order_id>/delete/', delete_order),
    path('order-history/', order_history),
    path('admin/approve-gcash/<int:order_id>/', approve_gcash_payment, name='approve-gcash'),
    path('admin/reject-gcash/<int:order_id>/', reject_gcash_payment, name='reject-gcash'),

    # Admin Order Management
    path('admin/orders/', get_admin_orders),
    path('admin/orders/<int:pk>/', get_order_details, name='order-details'),
    path('admin/order-items/', get_order_items, name='get_order_items'),

    # Role Request Utilities
    path('api/role-requests/pending-count/', pending_role_request_count),

    # Reviews
    path('reviews/', CreateOrUpdateReview.as_view(), name='create-or-update-review'),
    path('reviews/all/', get_all_reviews, name='get-all-reviews'),
    path('order-reviews/list/', order_reviews_list, name='order-reviews-list'),

    # Dashboard Metrics
    path('total-users/', total_users, name='total-users'),

    # 🔍 Analytics Endpoints
    path('admin/monthly-sales/', monthly_sales_report, name='monthly_sales_report'),  # ← Added
    path('admin/beverage-report/', beverage_sales_report, name='beverage_sales_report'),  # ← Added

   
    path('orders/<int:order_id>/feedback/', submit_feedback, name='submit_feedback'),


    path('analytics/monthly-sales/', monthly_sales_data, name='monthly-sales'),
    path('analytics/beverage-by-barangay/', beverage_popularity_by_barangay, name='beverage-by-barangay'),
    path('analytics/top-beverages/', top_selling_beverages, name='top-beverages'),
    
    path('analytics/sales-summary/', sales_summary, name='sales_summary'),
    
    path('orders/<int:order_id>/receipt/', download_receipt),
]

urlpatterns += router.urls