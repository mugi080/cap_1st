from rest_framework import serializers
from django.contrib.auth.password_validation import validate_password
from decimal import Decimal
from .models import (
    BeverageCategory, Beverage, Order, OrderItem, CustomUser,
    Cart, CartItem, DELIVERY_CHOICES, Vehicle, RoleRequest, Review, OrderReview
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
    class Meta:
        model = Beverage
        fields = [
            'id', 'name', 'category', 'volume', 'price',
            'stock', 'is_available', 'created_at', 'updated_at', 'image',
            'units_per_case',
        ]
        read_only_fields = ['created_at', 'updated_at']


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
# Order Serializer
# ----------------------------
class OrderSerializer(serializers.ModelSerializer):
    user = serializers.PrimaryKeyRelatedField(queryset=CustomUser.objects.all(), required=False)
    items = OrderItemSerializer(many=True, read_only=True)
    can_review = serializers.SerializerMethodField()
    gcash_receipt = serializers.ImageField(required=False, allow_null=True)

    assigned_staff = serializers.PrimaryKeyRelatedField(
        queryset=CustomUser.objects.filter(role='staff'),
        required=False,
        allow_null=True
    )

    class Meta:
        model = Order
        fields = [
            'id', 'user', 'customer_name', 'address', 'text_address',
            'payment_method', 'delivery_type', 'payment_status',
            'gcash_receipt',
            'created_at', 'updated_at', 'items', 'total_price',
            'contact_number', 'status', 'assigned_staff', 'assigned_vehicle',
            'review_comment', 'review_rating', 'reviewed_at', 'can_review',
            'is_paid',           # ← ADDED: show payment status
            'payment_date',      # ← ADDED: when payment was confirmed
        ]
        read_only_fields = [
            'review_comment', 'review_rating', 'reviewed_at', 'can_review',
            'payment_date',     # ← Only backend sets this
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
            'contact_number', 'address',
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


class CustomUserReadSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomUser
        fields = [
            'id', 'email', 'first_name', 'last_name', 'middle_name',
            'contact_number', 'address', 'role', 'is_active', 'date_joined',
            'is_staff', 'is_superuser'
        ]


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
    class Meta:
        model = CustomUser
        fields = [
            'id', 'email', 'first_name', 'last_name',
            'address', 'contact_number', 'role',
            'is_active', 'date_joined'
        ]
        read_only_fields = ['date_joined']


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

    def validate(self, data):
        request = self.context.get('request')
        user = request.user

        # 1. Only staff can update payment status
        if 'is_paid' in data and not user.is_staff:
            raise serializers.ValidationError({
                "is_paid": "Only staff can update payment status."
            })

        # 2. Cannot un-pay after paid
        if 'is_paid' in data and self.instance and self.instance.is_paid and not data['is_paid']:
            raise serializers.ValidationError({
                "is_paid": "Cannot mark an order as unpaid after it has been paid."
            })

        # 3. Prevent direct jump from Pending → In Transit
        if (
            self.instance and
            self.instance.status == 'Pending' and
            data.get('status') == 'In Transit'
        ):
            raise serializers.ValidationError({
                "status": "Cannot go directly from Pending to In Transit. Must first be Processing."
            })

        # 4. Auto-set status to Processing when assigning staff or vehicle
        if (
            self.instance and
            self.instance.status == 'Pending' and
            not self.instance.assigned_staff and not self.instance.assigned_vehicle and
            (
                ('assigned_staff' in data and data['assigned_staff']) or
                ('assigned_vehicle' in data and data['assigned_vehicle'])
            )
        ):
            data['status'] = 'Processing'

        # 5. Only staff or rider can set status to In Transit
        if data.get('status') == 'In Transit':
            user_role = getattr(user, 'role', '')
            if not (user.is_staff or user_role in ['staff', 'rider']):
                raise serializers.ValidationError({
                    "status": "Only delivery staff can mark orders as In Transit."
                })

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

        # Apply all field updates
        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        # Save using model's save() method → triggers side effects
        # (vehicle availability, auto-paid, etc.)
        instance.save()

        # Handle items only if provided
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