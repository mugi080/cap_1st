# api/models.py

from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin, BaseUserManager
from django.db import models
from django.utils import timezone
from django.conf import settings
from decimal import Decimal


class CustomUserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError("The Email field must be set.")
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        return self.create_user(email, password, **extra_fields)


class CustomUser(AbstractBaseUser, PermissionsMixin):
    ROLE_CHOICES = [
        ('user', 'Customer'),
        ('staff', 'Staff'),
        ('admin', 'Admin'),
    ]

    role = models.CharField(max_length=10, choices=ROLE_CHOICES, default='user')
    email = models.EmailField(unique=True)
    first_name = models.CharField(max_length=30, blank=True)
    last_name = models.CharField(max_length=30, blank=True)
    middle_name = models.CharField(max_length=30, blank=True)
    address = models.TextField(blank=True, null=True)
    contact_number = models.CharField(max_length=15, blank=True, null=True)

    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    date_joined = models.DateTimeField(default=timezone.now)

    objects = CustomUserManager()

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["first_name", "last_name"]

    def save(self, *args, **kwargs):
        if self.role == 'staff':
            self.is_staff = True
            self.is_superuser = False
        elif self.role == 'admin':
            self.is_staff = True
            self.is_superuser = True
        else:
            self.is_staff = False
            self.is_superuser = False

        super().save(*args, **kwargs)

    def __str__(self):
        return self.email or "No Email"

    def get_full_name(self):
        parts = [self.first_name, self.middle_name, self.last_name]
        full_name = " ".join(filter(None, parts)).strip()
        return full_name or self.email


class BeverageCategory(models.Model):
    name = models.CharField(max_length=50, unique=True)

    class Meta:
        verbose_name = "Beverage Category"
        verbose_name_plural = "Beverage Categories"

    def __str__(self):
        return self.name


class Beverage(models.Model):
    category = models.ForeignKey(BeverageCategory, on_delete=models.CASCADE, related_name="beverages")
    name = models.CharField(max_length=100)
    volume = models.DecimalField(max_digits=5, decimal_places=2)  
    price = models.DecimalField(max_digits=6, decimal_places=2)  # per case
    stock = models.DecimalField(max_digits=10, decimal_places=1, default=0)  # ✅ allows 0.5
    is_available = models.BooleanField(default=True)
    image = models.ImageField(upload_to="beverages/", blank=True, null=True)
    units_per_case = models.PositiveIntegerField(default=24)  # bottles in 1 case

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.name} - {self.volume}ml"

    def save(self, *args, **kwargs):
        self.is_available = self.stock > 0
        super().save(*args, **kwargs)

    # In Beverage model

    def update_stock(self, cases):
        from decimal import Decimal
        cases = Decimal(str(cases))
        if self.stock < cases:
            raise ValueError(f"Not enough stock for {self.name}. Available: {self.stock} cases")
        self.stock -= cases
        self.is_available = self.stock > 0
        self.save(update_fields=['stock', 'is_available'])

    def restore_stock(self, cases):
        from decimal import Decimal
        cases = Decimal(str(cases))
        self.stock += cases
        self.save(update_fields=['stock', 'is_available'])

    @property
    def price_per_case(self):
        return self.price

    @property
    def price_half_case(self):
        return self.price / 2

    @property
    def price_per_piece(self):
        return self.price / self.units_per_case


DELIVERY_CHOICES = [
    ('Pickup', 'Pickup'),
    ('Delivered', 'Delivered'),
]

ORDER_STATUS_CHOICES = [
    ('Pending', 'Pending'),
    ('Processing', 'Processing'),
    ('In Transit', 'In Transit'),
    ('Completed', 'Completed'),
    ('Cancelled', 'Cancelled'),
]

PAYMENT_STATUS_CHOICES = [
    ("Pending", "Pending"),
    ("Paid", "Paid"),
    ("Rejected", "Rejected"),
]

from django.core.exceptions import ValidationError
class Order(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )
    customer_name = models.CharField(max_length=255, blank=True, null=True)
    address = models.TextField(blank=True, null=True)
    text_address = models.CharField(max_length=255, blank=True, null=True)
    payment_method = models.CharField(max_length=50, blank=True, null=True)
    contact_number = models.CharField(max_length=15, blank=True, null=True)

    delivery_type = models.CharField(
        max_length=9,
        choices=DELIVERY_CHOICES,
        default='Pickup'
    )

    status = models.CharField(
        max_length=20,
        choices=ORDER_STATUS_CHOICES,
        default='Pending'
    )

    assigned_staff = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='assigned_orders'
    )

    assigned_vehicle = models.ForeignKey(
        'Vehicle',
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )

    is_paid = models.BooleanField(default=False)
    payment_date = models.DateTimeField(blank=True, null=True)
    payment_status = models.CharField(
        max_length=20,
        choices=PAYMENT_STATUS_CHOICES,
        default="Pending"
    )

    gcash_receipt = models.ImageField(upload_to='gcash_receipts/', blank=True, null=True)

    review_comment = models.TextField(blank=True, null=True)
    review_rating = models.IntegerField(blank=True, null=True)
    reviewed_at = models.DateTimeField(blank=True, null=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        name = self.user.get_full_name() if self.user else self.customer_name or "No name"
        return f"Order #{self.id} - {name} - {self.status}"

    def clean(self):
        super().clean()

        # GCash requires receipt
        if self.payment_method == "GCash" and self.payment_status == "Pending":
            if not self.gcash_receipt:
                raise ValidationError("GCash receipt is required for pending GCash payments.")

        # Pickup orders shouldn't have staff or vehicle
        if self.delivery_type == 'Pickup':
            if self.assigned_staff or self.assigned_vehicle:
                raise ValidationError("Pickup orders shouldn't have staff or vehicle assigned.")

    def save(self, *args, **kwargs):
        # Track previous state
        old_status = None
        old_assigned_vehicle = None

        if self.pk:
            try:
                old_instance = Order.objects.select_related('assigned_vehicle').get(pk=self.pk)
                old_status = old_instance.status
                old_assigned_vehicle = old_instance.assigned_vehicle
            except Order.DoesNotExist:
                pass
        else:
            old_status = None
            old_assigned_vehicle = None

        # Save main object first
        super().save(*args, **kwargs)

        # Handle vehicle availability only after save
        if self.assigned_vehicle:
            # Going into In Transit → lock vehicle
            if self.status == 'In Transit' and old_status != 'In Transit':
                self.assigned_vehicle.is_available = False
                self.assigned_vehicle.save()

            # Leaving In Transit (completed/cancelled) → release vehicle
            if old_status == 'In Transit' and self.status in ['Completed', 'Cancelled']:
                self.assigned_vehicle.is_available = True
                self.assigned_vehicle.save()

            # Vehicle changed → free old one
            if old_assigned_vehicle and old_assigned_vehicle != self.assigned_vehicle:
                old_assigned_vehicle.is_available = True
                old_assigned_vehicle.save()

        # Auto-mark as paid when completed
        if self.status == 'Completed' and not self.is_paid:
            self.is_paid = True
            self.payment_date = timezone.now()
            super().save(update_fields=['is_paid', 'payment_date'])

    @property
    def is_completed(self):
        return self.status == 'Completed'

    @property
    def total_price(self):
        return sum(item.total_price for item in self.items.all()) or Decimal('0.00')


class OrderItem(models.Model):
    order = models.ForeignKey('Order', on_delete=models.CASCADE, related_name="items")
    beverage = models.ForeignKey('Beverage', on_delete=models.CASCADE)
    cases_ordered = models.DecimalField(max_digits=10, decimal_places=1, default=1)  # ✅
    price = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)

    class Meta:
        verbose_name = "Order Item"
        verbose_name_plural = "Order Items"

    def __str__(self):
        return f"{self.beverage.name} - {self.cases_ordered} case(s)"

    def save(self, *args, **kwargs):
        if not self.price and self.beverage:
            self.price = self.beverage.price
        super().save(*args, **kwargs)


    @property
    def total_price(self):
        if self.cases_ordered is None or self.price is None:
            return Decimal('0.00')
        return (self.cases_ordered * self.price).quantize(Decimal('0.01'))


class Cart(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Cart"
        verbose_name_plural = "Carts"

    def __str__(self):
        return f"Cart #{self.id} for User {self.user.username}"

    @property
    def total_price(self):
        return sum(item.total_price for item in self.items.all()) or Decimal('0.00')


class CartItem(models.Model):
    cart = models.ForeignKey(Cart, on_delete=models.CASCADE, related_name="items")
    beverage = models.ForeignKey(Beverage, on_delete=models.CASCADE)
    cases_ordered = models.PositiveIntegerField(default=1)

    class Meta:
        verbose_name = "Cart Item"
        verbose_name_plural = "Cart Items"

    def __str__(self):
        return f"{self.beverage.name} - {self.cases_ordered} case(s)"  # ✅ FIXED

    @property
    def total_price(self):
        return self.cases_ordered * self.beverage.price  # ✅ FIXED


class RoleRequest(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
    ]

    user = models.ForeignKey(CustomUser, on_delete=models.CASCADE)
    requested_role = models.CharField(max_length=10, choices=CustomUser.ROLE_CHOICES)
    message = models.TextField(blank=True, null=True)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='pending')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.user.email} → {self.requested_role} - {self.status}"


class Vehicle(models.Model):
    name = models.CharField(max_length=100)
    plate_number = models.CharField(max_length=20, unique=True)
    is_available = models.BooleanField(default=True)
    capacity = models.IntegerField(default=0)

    def __str__(self):
        return f"{self.name} ({self.plate_number})"


class Review(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='review',
    )
    review_text = models.TextField()
    rating = models.PositiveSmallIntegerField(default=5)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Review by {self.user.email}"
    

class OrderReview(models.Model):
    order = models.ForeignKey(
        'Order',
        on_delete=models.CASCADE,
        related_name='order_review',
        null=True, blank=True
    )
    rating = models.PositiveSmallIntegerField(choices=[(i, i) for i in range(1, 6)])
    comment = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Review for Order #{self.order.id} - {self.rating}★"