from rest_framework import serializers
from django.contrib.auth.password_validation import validate_password
from decimal import Decimal
from .models import (
    BeverageCategory, Beverage, Order, OrderItem, CustomUser,
    Cart, CartItem, DELIVERY_CHOICES, Vehicle, RoleRequest, Review, OrderReview,
    LUCENA_BARANGAYS, StaffPreference,
)


# ----------------------------
# Beverage Category Serializer
# ----------------------------
class BeverageCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = BeverageCategory
        fields = '__all__'


# ----------------------------
# Beverage Serializer
# ----------------------------
class BeverageSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.name', read_only=True)
    
    # New field: represents stock in CASES (not pieces)
    stock_in_cases = serializers.SerializerMethodField()
    
    class Meta:
        model = Beverage
        fields = '__all__'
        read_only_fields = ['created_at', 'updated_at']
    
    def get_stock_in_cases(self, obj):
        if obj.units_per_case and obj.units_per_case > 0:
            return float(obj.stock / obj.units_per_case)
        return 0.0

    def to_internal_value(self, data):
        # Convert stock_in_cases back to pieces before saving
        internal = super().to_internal_value(data)
        
        # If stock_in_cases is provided, override stock
        stock_in_cases = data.get('stock_in_cases')
        if stock_in_cases is not None:
            try:
                units = internal.get('units_per_case') or self.instance.units_per_case
                if not units:
                    units = 24  # fallback
                stock_pieces = Decimal(str(stock_in_cases)) * Decimal(str(units))
                internal['stock'] = stock_pieces
            except (ValueError, TypeError, AttributeError):
                pass  # fallback to existing stock if conversion fails
        
        return internal


# ----------------------------
# Order Item Serializer
# ----------------------------
class OrderItemSerializer(serializers.ModelSerializer):
    beverage_name = serializers.CharField(source="beverage.name", read_only=True)
    unit_per_case = serializers.IntegerField(source="beverage.units_per_case", read_only=True)
    price_per_case = serializers.DecimalField(source="beverage.price", max_digits=10, decimal_places=2, read_only=True)
    total_price = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = OrderItem
        fields = ['id', 'beverage', 'beverage_name', 'cases_ordered', 'unit_per_case', 'price_per_case', 'total_price']
        read_only_fields = ['id', 'price_per_case', 'total_price']

    def get_total_price(self, obj):
        return (obj.cases_ordered * obj.beverage.price).quantize(Decimal('0.01'))


# ----------------------------
# Order Serializer (USER-FACING)
# ----------------------------
class OrderSerializer(serializers.ModelSerializer):
    user = serializers.PrimaryKeyRelatedField(queryset=CustomUser.objects.all(), required=False)
    items = OrderItemSerializer(many=True, read_only=True,)
    can_review = serializers.SerializerMethodField()
    gcash_receipt = serializers.ImageField(required=False, allow_null=True)
    # 👇 ADD BARANGAY FIELD
    barangay = serializers.ChoiceField(
        choices=[b[0] for b in LUCENA_BARANGAYS],
        required=False,
        allow_null=True,
        allow_blank=True
    )

    assigned_staff = serializers.PrimaryKeyRelatedField(
        queryset=CustomUser.objects.filter(role='staff'),
        required=False,
        allow_null=True
    )

    class Meta:
        model = Order
        fields = [
            'id', 'user', 'customer_name', 'address', 'text_address',
            'barangay',  # 👈 EXPLICITLY INCLUDED
            'payment_method', 'delivery_type', 'payment_status',
            'gcash_receipt',
            'created_at', 'updated_at', 'items', 'total_price',
            'contact_number', 'status', 'assigned_staff', 'assigned_vehicle',
            'review_comment', 'review_rating', 'reviewed_at', 'can_review',
            'is_paid',
            'payment_date',
            'latitude',
            'longitude',
        ]
        read_only_fields = [
            'review_comment', 'review_rating', 'reviewed_at', 'can_review',
            'payment_date', 'latitude', 'longitude',
        ]

    def validate(self, data):
        if data.get('payment_method') == 'GCash' and not data.get('gcash_receipt'):
            raise serializers.ValidationError({"gcash_receipt": "GCash receipt is required."})

        user = data.get('user')
        name = data.get('customer_name') or (self.instance.customer_name if self.instance else None)
        if not user and not name:
            raise serializers.ValidationError("Either a user or a customer_name must be provided.")
        return data

    def create(self, validated_data):
        from django.db import transaction
        from decimal import Decimal

        items_data = validated_data.pop('items', [])
        user = validated_data.get('user', None)
        customer_name = validated_data.get('customer_name', None)

        if user and not customer_name:
            customer_name = f"{user.first_name} {user.last_name}".strip()

        validated_data['customer_name'] = customer_name

        with transaction.atomic():
            order = Order.objects.create(**validated_data)

            for item_data in items_data:
                beverage = item_data['beverage']
                cases_ordered = item_data['cases_ordered']

                if beverage.stock < cases_ordered:
                    raise serializers.ValidationError(
                        {"items": f"Not enough stock for {beverage.name}. Available: {beverage.stock}"}
                    )
                beverage.stock -= cases_ordered
                beverage.save()

                OrderItem.objects.create(order=order, **item_data)

        return order

    def get_can_review(self, obj):
        return obj.status == 'Completed' and not obj.reviewed_at


# ----------------------------
# Cart Item Serializer
# ----------------------------
class CartItemSerializer(serializers.ModelSerializer):
    beverage = BeverageSerializer(read_only=True)
    total_price = serializers.SerializerMethodField()

    class Meta:
        model = CartItem
        fields = ['id', 'cart', 'beverage', 'cases_ordered', 'total_price']

    def get_total_price(self, obj):
        return obj.cases_ordered * obj.beverage.price


# ----------------------------
# Cart Serializer
# ----------------------------
class CartSerializer(serializers.ModelSerializer):
    items = CartItemSerializer(many=True, read_only=True)
    total_price = serializers.SerializerMethodField()

    class Meta:
        model = Cart
        fields = ['id', 'user', 'created_at', 'items', 'total_price']

    def get_total_price(self, obj):
        return sum(item.cases_ordered * item.beverage.price for item in obj.items.all())


# ----------------------------
# Custom User Serializers
# ----------------------------
class CustomUserCreateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)
    re_password = serializers.CharField(write_only=True)

    class Meta:
        model = CustomUser
        fields = [
            'id', 'email', 'first_name', 'last_name', 'middle_name',
            'password', 're_password',
            'contact_number', 'address', 'profile_picture'
        ]
        extra_kwargs = {
            'middle_name': {'required': False}
        }

    def validate(self, data):
        request = self.context.get("request")
        is_admin = request and request.user.is_authenticated and request.user.is_staff

        if not is_admin and not data.get('email'):
            raise serializers.ValidationError({"email": "Email is required."})

        if not is_admin or data.get("password") or data.get("re_password"):
            if not data.get("password") or not data.get("re_password"):
                raise serializers.ValidationError({"password": "Password and confirm password are required."})
            if data["password"] != data["re_password"]:
                raise serializers.ValidationError({"password": "Passwords do not match."})
            validate_password(data["password"])

        return data

    def create(self, validated_data):
        validated_data.pop('re_password')
        password = validated_data.pop('password')

        request = self.context.get('request')
        is_admin = request and request.user.is_authenticated and request.user.is_staff

        if is_admin:
            is_staff = validated_data.pop('is_staff', False)
            user = CustomUser.objects.create_user(password=password, is_staff=is_staff, **validated_data)
        else:
            user = CustomUser.objects.create_user(password=password, **validated_data)

        return user


# ----------------------------
# Custom User Serializer for Profile (Read + Write Preferences)
# Used by Djoser for /auth/users/me/
# ----------------------------
class CurrentUserSerializer(serializers.ModelSerializer):
    preferred_vehicle = serializers.PrimaryKeyRelatedField(
        queryset=Vehicle.objects.all(),
        allow_null=True,
        required=False
    )
    familiar_barangays = serializers.ListField(
        child=serializers.CharField(max_length=100),
        required=False,
        allow_empty=True
    )

    class Meta:
        model = CustomUser
        fields = [
            'id', 'email', 'first_name', 'middle_name', 'last_name',
            'address', 'contact_number', 'role',
            'preferred_vehicle', 'familiar_barangays'
        ]
        read_only_fields = ['id', 'email', 'role']  # Prevent users from changing these

    def validate_familiar_barangays(self, value):
        # Handle None or non-list values
        if not value:
            return []
        if not isinstance(value, list):
            raise serializers.ValidationError("Must be a list of barangay names.")
        
        valid_names = {name for _, name in LUCENA_BARANGAYS}
        invalid = [b for b in value if b not in valid_names]
        if invalid:
            raise serializers.ValidationError(f"Invalid barangays: {', '.join(invalid)}")
        return value
    


class CustomUserReadSerializer(serializers.ModelSerializer):
    profile_picture = serializers.SerializerMethodField()

    class Meta:
        model = CustomUser
        fields = [
            'id', 'email', 'first_name', 'last_name', 'middle_name',
            'contact_number', 'address', 'role', 'is_active', 'date_joined',
            'is_staff', 'is_superuser', 'profile_picture', 'preferred_vehicle', 'familiar_barangays'
        ]

    def get_profile_picture(self, obj):
        if obj.profile_picture:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.profile_picture.url)
            return obj.profile_picture.url
        return None


# ----------------------------
# Custom User Serializer with Preferences (for Djoser / Profile)
# ----------------------------



class CustomUserSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomUser
        fields = [
            'id', 'email', 'first_name', 'last_name',
            'address', 'contact_number', 'role',
            'is_active', 'date_joined'
        ]
        read_only_fields = ['date_joined']


class StaffSerializer(serializers.ModelSerializer):
    preferred_vehicle = serializers.SerializerMethodField()
    familiar_barangays = serializers.SerializerMethodField()

    class Meta:
        model = CustomUser
        fields = ['id', 'first_name', 'last_name', 'preferred_vehicle', 'familiar_barangays']

    def get_preferred_vehicle(self, obj):
        try:
            return obj.staff_preference.preferred_vehicle.id if obj.staff_preference.preferred_vehicle else None
        except StaffPreference.DoesNotExist:
            return None

    def get_familiar_barangays(self, obj):
        try:
            return obj.staff_preference.familiar_barangays or []
        except StaffPreference.DoesNotExist:
            return []


# ----------------------------
# Role Request Serializer
# ----------------------------
class RoleRequestSerializer(serializers.ModelSerializer):
    user = serializers.SerializerMethodField()

    class Meta:
        model = RoleRequest
        fields = ['id', 'user', 'requested_role', 'message', 'status', 'created_at']
        read_only_fields = ['status', 'created_at', 'user']

    def get_user(self, obj):
        return {
            'id': obj.user.id,
            'email': obj.user.email,
            'full_name': obj.user.get_full_name(),
        }

    def create(self, validated_data):
        request = self.context['request']
        validated_data['user'] = request.user
        return super().create(validated_data)


# ----------------------------
# Review Serializers
# ----------------------------
class ReviewSerializer(serializers.ModelSerializer):
    user_name = serializers.SerializerMethodField()

    class Meta:
        model = Review
        fields = [
            'id', 'user', 'user_name', 'review_text', 'rating', 'created_at', 'updated_at'
        ]

    def get_user_name(self, obj):
        full_name = obj.user.get_full_name()
        return full_name or obj.user.email


class OrderReviewSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrderReview
        fields = ['id', 'order', 'rating', 'comment', 'created_at']
        read_only_fields = ['id', 'created_at']


# ----------------------------
# Vehicle Serializer
# ----------------------------
class VehicleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Vehicle
        fields = ['id', 'name', 'plate_number', 'is_available', 'capacity']


# ----------------------------
# Admin Serializers
# ----------------------------
class OrderItemAdminSerializer(serializers.ModelSerializer):
    beverage_name = serializers.CharField(source="beverage.name", read_only=True)
    unit_per_case = serializers.IntegerField(source="beverage.units_per_case", read_only=True)
    price_per_case = serializers.DecimalField(
        source="beverage.price",
        max_digits=10,
        decimal_places=2,
        read_only=True
    )
    total_price = serializers.SerializerMethodField(read_only=True)
    beverage_image_url = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = OrderItem
        fields = [
            'id',
            'beverage',
            'beverage_name',
            'unit_per_case',
            'cases_ordered',
            'price_per_case',
            'total_price',
            'beverage_image_url'
        ]
        read_only_fields = ['id', 'beverage_name', 'unit_per_case', 'price_per_case', 'total_price', 'beverage_image_url']

    def get_total_price(self, obj):
        if obj.cases_ordered is None or obj.beverage is None:
            return Decimal('0.00')
        return (obj.cases_ordered * obj.beverage.price).quantize(Decimal('0.01'))

    def get_beverage_image_url(self, obj):
        if obj.beverage and obj.beverage.image:
            return obj.beverage.image.url
        return None


class OrderAdminSerializer(OrderSerializer):
    items = OrderItemAdminSerializer(many=True)
    assigned_staff = serializers.PrimaryKeyRelatedField(
        queryset=CustomUser.objects.filter(role='staff'),
        required=False,
        allow_null=True
    )
    assigned_vehicle = serializers.PrimaryKeyRelatedField(
        queryset=Vehicle.objects.all(),
        required=False,
        allow_null=True
    )
    # 👇 BARANGAY already inherited from OrderSerializer

    class Meta(OrderSerializer.Meta):
        fields = OrderSerializer.Meta.fields + [
            'assigned_staff', 'assigned_vehicle', 'status', 'payment_status',
        ]

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._restrict_fields_for_non_staff()

    def _restrict_fields_for_non_staff(self):
        request = self.context.get('request')
        if request and not (request.user.is_staff or request.user.is_superuser):
            for field in ['assigned_staff', 'assigned_vehicle', 'status']:
                self.fields.pop(field, None)

    # Inside OrderAdminSerializer class
    def validate(self, data):
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            raise serializers.ValidationError("Authentication required.")

        user = request.user
        instance = self.instance

        # Prevent non-staff from editing staff-only fields
        if not (user.is_staff or user.is_superuser):
            # Allow only status and is_paid (with conditions)
            allowed_fields = {'status'}
            if instance and instance.payment_method == "Cash":
                allowed_fields.add('is_paid')
            
            requested_fields = set(data.keys())
            if not requested_fields.issubset(allowed_fields):
                raise serializers.ValidationError(
                    "Riders can only update 'status' and 'is_paid' (for Cash orders)."
                )

        # Prevent marking as unpaid
        if 'is_paid' in data and data['is_paid'] is False:
            if instance and instance.is_paid:
                raise serializers.ValidationError("Cannot mark a paid order as unpaid.")
            if instance and instance.payment_method == "GCash":
                raise serializers.ValidationError("GCash payment status can only be set by admin.")

        # Prevent riders from marking GCash as paid
        if 'is_paid' in data and data['is_paid'] is True:
            if instance and instance.payment_method == "GCash":
                if not (user.is_staff or user.is_superuser):
                    raise serializers.ValidationError("Only admin can approve GCash payments.")

        # Status transition logic
        if 'status' in data and instance:
            new_status = data['status']
            old_status = instance.status

            # Only staff/rider can move to In Transit or Completed
            if new_status in ['In Transit', 'Completed']:
                if not (user.is_staff or getattr(user, 'role', '') in ['staff', 'rider']):
                    raise serializers.ValidationError("Only delivery staff can update to this status.")

            # Prevent going backward (e.g., Completed → In Transit)
            status_order = {'Pending': 0, 'Processing': 1, 'In Transit': 2, 'Completed': 3}
            if status_order.get(new_status, -1) < status_order.get(old_status, -1):
                raise serializers.ValidationError("Cannot revert order status.")

        return data

    def create(self, validated_data):
        items_data = validated_data.pop('items', [])
        from django.db import transaction
        with transaction.atomic():
            order = super().create(validated_data)

            for item_data in items_data:
                beverage = item_data.get('beverage')
                cases_ordered = item_data.get('cases_ordered', 1)

                if not beverage:
                    raise serializers.ValidationError({"beverage": "This field is required."})

                try:
                    beverage.update_stock(cases_ordered)
                except ValueError as e:
                    raise serializers.ValidationError({"items": str(e)})

                OrderItem.objects.create(order=order, **item_data)

            return order

    def update(self, instance, validated_data):
        items_data = validated_data.pop('items', [])

        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        instance.save()

        if items_data:
            self._handle_order_items(instance, items_data)

        return instance

    def _handle_order_items(self, order, items_data):
        old_items = {item.id: item for item in order.items.all()}
        updated_item_ids = []

        for item_data in items_data:
            item_id = item_data.get('id')
            beverage = item_data.get('beverage')
            cases_ordered = item_data.get('cases_ordered', 1)

            if not beverage:
                raise serializers.ValidationError({"beverage": "This field is required."})

            if item_id and item_id in old_items:
                old_item = old_items[item_id]
                try:
                    old_item.beverage.restore_stock(old_item.cases_ordered)
                    beverage.update_stock(cases_ordered)
                except ValueError as e:
                    raise serializers.ValidationError({"items": str(e)})

                old_item.beverage = beverage
                old_item.cases_ordered = cases_ordered
                old_item.price = beverage.price
                old_item.save()
                updated_item_ids.append(item_id)
            else:
                try:
                    beverage.update_stock(cases_ordered)
                except ValueError as e:
                    raise serializers.ValidationError({"items": str(e)})

                new_item = OrderItem.objects.create(
                    order=order,
                    beverage=beverage,
                    cases_ordered=cases_ordered,
                    price=beverage.price
                )
                updated_item_ids.append(new_item.id)

        for item in old_items.values():
            if item.id not in updated_item_ids:
                item.beverage.restore_stock(item.cases_ordered)
                item.delete()


# ----------------------------
# Feedback Serializer
# ----------------------------
class FeedbackSerializer(serializers.Serializer):
    review_comment = serializers.CharField(max_length=500)
    review_rating = serializers.IntegerField(min_value=1, max_value=5)



##############

class StaffProfileSerializer(serializers.ModelSerializer):
    preferred_vehicle = serializers.PrimaryKeyRelatedField(
        queryset=Vehicle.objects.all(),
        allow_null=True,
        required=False
    )
    familiar_barangays = serializers.ListField(
        child=serializers.CharField(max_length=100),
        required=False,
        allow_empty=True
    )

    class Meta:
        model = CustomUser
        fields = [
            'id', 'email', 'first_name', 'middle_name', 'last_name',
            'address', 'contact_number',
            'preferred_vehicle', 'familiar_barangays'
        ]
        read_only_fields = ['id', 'email']

    def validate_familiar_barangays(self, value):
        if not value:
            return []
        valid_names = {name for _, name in LUCENA_BARANGAYS}
        invalid = [b for b in value if b not in valid_names]
        if invalid:
            raise serializers.ValidationError(f"Invalid barangays: {', '.join(invalid)}")
        return value
    


class StaffPreferenceSerializer(serializers.ModelSerializer):
    familiar_barangays = serializers.ListField(
        child=serializers.CharField(max_length=100),
        required=False,
        allow_empty=True
    )

    class Meta:
        model = StaffPreference
        fields = ['preferred_vehicle', 'familiar_barangays']

    def validate_familiar_barangays(self, value):
        if not value:
            return []
        valid_names = {name for _, name in LUCENA_BARANGAYS}
        invalid = [b for b in value if b not in valid_names]
        if invalid:
            raise serializers.ValidationError(f"Invalid barangays: {', '.join(invalid)}")
        return value