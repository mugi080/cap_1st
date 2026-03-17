# api/models.py

from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin, BaseUserManager
from django.db import models
from django.utils import timezone
from django.conf import settings
from decimal import Decimal
from django.core.exceptions import ValidationError


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

    # 👇 NEW: Staff preference fields (only used when role == 'staff')
    preferred_vehicle = models.ForeignKey(
        'Vehicle',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='preferred_by_staff'
    )
    familiar_barangays = models.JSONField(default=list, blank=True)  # e.g., ["Mayao Crossing", "Poblacion"]

    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    date_joined = models.DateTimeField(default=timezone.now)

    objects = CustomUserManager()

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["first_name", "last_name"]

    profile_picture = models.ImageField(
        upload_to='profile_pictures/',
        blank=True,
        null=True
    )

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
    volume = models.DecimalField(max_digits=6, decimal_places=2)  
    price = models.DecimalField(max_digits=6, decimal_places=2)  # per case
    stock = models.DecimalField(max_digits=10, decimal_places=1, default=0)
    is_available = models.BooleanField(default=True)
    image = models.ImageField(upload_to="beverages/", blank=True, null=True)
    units_per_case = models.PositiveIntegerField(default=24)
    
    UNIT_LABEL_CHOICES = [
        ('case', 'Case'),
        ('box', 'Box'),
        ('pack', 'Pack'),
        ('carton', 'Carton'),
    ]

    unit_label = models.CharField(
        max_length=20,
        default="case",
        choices=UNIT_LABEL_CHOICES, 
    )

    allow_half_case = models.BooleanField(default=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.name} - {self.volume}ml"

    def save(self, *args, **kwargs):
        self.is_available = self.stock > 0
        super().save(*args, **kwargs)

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
    ('Delivered by Staff', 'Delivered by Staff'),
    ('Confirmed by Customer', 'Confirmed by Customer'),
    ('Completed', 'Completed'),
    ('Cancelled', 'Cancelled'),
]

PAYMENT_STATUS_CHOICES = [
    ("Pending", "Pending"),
    ("Paid", "Paid"),
    ("Rejected", "Rejected"),
]

LUCENA_BARANGAYS = [

    ("Barra", "Barra"),
    ("Cotta", "Cotta"),
    ("Dalahican", "Dalahican"),
    ("Domoit", "Domoit"),
    ("Dupay", "Dupay"),
    ("Gulang-gulang", "Gulang-gulang"),
    ("Ibabang Dupay", "Ibabang Dupay"),
    ("Ibabang Iyam", "Ibabang Iyam"),
    ("Ibabang Talim", "Ibabang Talim"),
    ("Ilayang Dupay", "Ilayang Dupay"),
    ("Ilayang Iyam", "Ilayang Iyam"),
    ("Ilayang Talim", "Ilayang Talim"),
    ("Isabang", "Isabang"),
    ("Iyam", "Iyam"),
    ("Market View", "Market View"),
    ("Mayao Castillo", "Mayao Castillo"),
    ("Mayao Crossing", "Mayao Crossing"),
    ("Mayao Kanluran", "Mayao Kanluran"),
    ("Mayao Parada", "Mayao Parada"),
    ("Mayao Silangan", "Mayao Silangan"),
    ("Ransohan", "Ransohan"),
    ("Salinas", "Salinas"),
    ("Talao-talao", "Talao-talao"),

]


class Order(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )
    customer_name = models.CharField(max_length=255, blank=True, null=True)
    address = models.TextField(blank=True, null=True)
    latitude = models.FloatField(null=True, blank=True)
    longitude = models.FloatField(null=True, blank=True)
    text_address = models.CharField(max_length=255, blank=True, null=True)
    payment_method = models.CharField(max_length=50, blank=True, null=True)
    contact_number = models.CharField(max_length=15, blank=True, null=True)

    delivery_type = models.CharField(
        max_length=9,
        choices=DELIVERY_CHOICES,
        default='Pickup'
    )

    status = models.CharField(
        max_length=25,
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

    barangay = models.CharField(
        max_length=100,
        choices=LUCENA_BARANGAYS,
        blank=True,
        null=True,
        help_text="Barangay for delivery location"
    )

    gcash_receipt = models.ImageField(upload_to='gcash_receipts/', blank=True, null=True)

    review_comment = models.TextField(blank=True, null=True)
    review_rating = models.IntegerField(blank=True, null=True)
    reviewed_at = models.DateTimeField(blank=True, null=True)

    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        name = self.user.get_full_name() if self.user else self.customer_name or "No name"
        return f"Order #{self.id} - {name} - {self.status}"

    def clean(self):
        super().clean()

        if self.payment_method == "GCash" and self.payment_status == "Pending":
            if not self.gcash_receipt:
                raise ValidationError("GCash receipt is required for pending GCash payments.")

        if self.delivery_type == 'Pickup':
            if self.assigned_staff or self.assigned_vehicle:
                raise ValidationError("Pickup orders shouldn't have staff or vehicle assigned.")

    def save(self, *args, **kwargs):
        old_status = None
        old_assigned_vehicle = None

        if self.pk:
            try:
                old_instance = Order.objects.select_related('assigned_vehicle').get(pk=self.pk)
                old_status = old_instance.status
                old_assigned_vehicle = old_instance.assigned_vehicle
            except Order.DoesNotExist:
                pass

        super().save(*args, **kwargs)

        if self.assigned_vehicle:
            if self.status == 'In Transit' and old_status != 'In Transit':
                self.assigned_vehicle.is_available = False
                self.assigned_vehicle.save()
            if old_status == 'In Transit' and self.status in ['Completed', 'Cancelled']:
                self.assigned_vehicle.is_available = True
                self.assigned_vehicle.save()
            if old_assigned_vehicle and old_assigned_vehicle != self.assigned_vehicle:
                old_assigned_vehicle.is_available = True
                old_assigned_vehicle.save()

    def mark_delivered_by_staff(self):
        if self.delivery_type == 'Pickup':
            raise ValidationError("Pickup orders don't require delivery confirmation.")
        if self.status not in ['In Transit', 'Processing']:
            raise ValidationError("Order must be in transit to mark as delivered.")
        self.status = 'Delivered by Staff'
        self.save(update_fields=['status'])

    def mark_confirmed_by_customer(self):
        if self.delivery_type == 'Pickup':
            self.status = 'Completed'
            self._finalize_payment()
        elif self.status == 'Delivered by Staff':
            self.status = 'Completed'
            self._finalize_payment()
        elif self.status == 'Completed':
            return
        else:
            raise ValidationError("Delivery not yet marked by staff.")
        self.save(update_fields=['status', 'is_paid', 'payment_date'])

    def _finalize_payment(self):
        if not self.is_paid:
            self.is_paid = True
            self.payment_date = timezone.now()
            if self.payment_status == "Pending":
                self.payment_status = "Paid"

    @property
    def is_completed(self):
        return self.status == 'Completed'

    @property
    def total_price(self):
        return sum(item.total_price for item in self.items.all()) or Decimal('0.00')


class OrderItem(models.Model):
    order = models.ForeignKey('Order', on_delete=models.CASCADE, related_name="items")
    beverage = models.ForeignKey('Beverage', on_delete=models.CASCADE)
    cases_ordered = models.DecimalField(max_digits=10, decimal_places=1, default=1)
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
        return f"Cart #{self.id} for User {self.user.username}" if self.user else f"Cart #{self.id} (Guest)"

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
        return f"{self.beverage.name} - {self.cases_ordered} case(s)"

    @property
    def total_price(self):
        return self.cases_ordered * self.beverage.price


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
    


class StaffPreference(models.Model):
    staff = models.OneToOneField(
        CustomUser,
        on_delete=models.CASCADE,
        related_name='staff_preference'
    )
    preferred_vehicle = models.ForeignKey(
        'Vehicle',
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )
    familiar_barangays = models.JSONField(default=list, blank=True)

    def __str__(self):
        return f"Preferences for {self.staff.email}"