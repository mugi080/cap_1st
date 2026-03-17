# api/management/commands/generate_demo_orders.py
import random
import string
from datetime import datetime, timedelta
from decimal import Decimal
from django.core.management.base import BaseCommand
from django.utils import timezone
from api.models import (
    Beverage, BeverageCategory, CustomUser, Vehicle, Order, OrderItem
)

# ===== CONFIGURATION =====
TARGET_TOTAL_SALES = 12_000_000  # ₱12 million
NUM_ORDERS = 400
START_DATE = datetime(2025, 1, 1)
END_DATE = datetime(2025, 12, 31)

# Category weights based on your business ratios
CATEGORY_WEIGHTS = {
    3: 8,   # Regular size
    10: 8,  # Juice drinks → part of Regular
    6: 8,   # Kasalo size
    8: 1,   # Mismo size
    9: 1,   # swakto size
    11: 1,  # Energy and Milk Drinks → Nutriboost (1/8 of Regular)
    12: 3,  # Beer and Alcoholic drinks (1/3 of 8)
}

# Filipino names
FIRST_NAMES = [
    'Juan', 'Maria', 'Jose', 'Ana', 'Pedro', 'Luisa', 'Carlos', 'Elena', 'Rafael', 'Carmen',
    'Miguel', 'Isabel', 'Antonio', 'Rosa', 'Manuel', 'Teresa', 'Francisco', 'Lucia', 'Javier', 'Dolores',
    'Sofia', 'Diego', 'Camila', 'Gabriel', 'Valeria', 'Andres', 'Paula', 'Santiago', 'Laura', 'Daniel'
]
LAST_NAMES = [
    'Dela Cruz', 'Garcia', 'Reyes', 'Mendoza', 'Santos', 'Fernandez', 'Castillo', 'Lim', 'Torres', 'Bautista',
    'Aguilar', 'Cruz', 'Lopez', 'Perez', 'Natividad', 'Ramos', 'Gonzales', 'Alvarez', 'Villanueva', 'Adriano',
    'Mariano', 'Corpuz', 'Salvador', 'Pascual', 'Dizon', 'Valdez', 'Mercado', 'Ortega', 'Sandoval', 'Romero'
]

# Lucena barangays with coordinate bounds
BARANGAYS = [
    {
        "name": "Talao-Talao, Lucena",
        "lat_range": (13.9300, 13.9350),
        "lng_range": (121.6100, 121.6180)
    },
    {
        "name": "Dalahican, Lucena",
        "lat_range": (13.9250, 13.9300),
        "lng_range": (121.6050, 121.6120)
    },
    {
        "name": "Ibabang Talim, Lucena",
        "lat_range": (13.9350, 13.9400),
        "lng_range": (121.6150, 121.6220)
    },
    {
        "name": "Ilayang Talim, Lucena",
        "lat_range": (13.9380, 13.9420),
        "lng_range": (121.6200, 121.6270)
    },
    {
        "name": "Ibabang Dupay, Lucena",
        "lat_range": (13.9200, 13.9250),
        "lng_range": (121.6000, 121.6070)
    },
    {
        "name": "Mayao Crossing, Lucena",
        "lat_range": (13.9280, 13.9330),
        "lng_range": (121.6180, 121.6250)
    },
    {
        "name": "Mayao Kanluran, Lucena",
        "lat_range": (13.9320, 13.9370),
        "lng_range": (121.6220, 121.6300)
    },
    {
        "name": "Market View, Lucena",
        "lat_range": (13.9300, 13.9340),
        "lng_range": (121.6120, 121.6190)
    }
]

class Command(BaseCommand):
    help = 'Generates 400 realistic demo orders for capstone presentation'

    def handle(self, *args, **options):
        self.stdout.write("🧹 Deleting existing orders...")
        Order.objects.all().delete()

        self.stdout.write("🔍 Fetching data...")
        beverages = list(Beverage.objects.select_related('category').all())
        staff_users = list(CustomUser.objects.filter(role='staff'))
        vehicles = list(Vehicle.objects.all())

        if not beverages:
            self.stdout.write(self.style.ERROR("❌ No beverages found!"))
            return
        if not staff_users:
            self.stdout.write(self.style.WARNING("⚠️ No staff users — all delivered orders will have no staff assigned."))
        if not vehicles:
            self.stdout.write(self.style.WARNING("⚠️ No vehicles — skipping vehicle assignment."))

        # Build beverage pool by category weight
        weighted_beverages = []
        for bev in beverages:
            weight = CATEGORY_WEIGHTS.get(bev.category_id, 0)
            if weight > 0:
                weighted_beverages.extend([bev] * weight)

        if not weighted_beverages:
            self.stdout.write(self.style.ERROR("❌ No beverages match the category weights!"))
            return

        self.stdout.write(f"✅ Found {len(weighted_beverages)} weighted beverage choices.")

        orders_created = 0
        total_sales = 0

        while orders_created < NUM_ORDERS and total_sales < TARGET_TOTAL_SALES:
            # Random date in 2025
            random_days = random.randint(0, (END_DATE - START_DATE).days)
            order_date = START_DATE + timedelta(days=random_days)
            order_date = timezone.make_aware(order_date.replace(
                hour=random.randint(8, 18),
                minute=random.randint(0, 59),
                second=0
            ))

            # Customer
            customer_name = f"{random.choice(FIRST_NAMES)} {random.choice(LAST_NAMES)}"
            contact_number = "09" + "".join(random.choices(string.digits, k=9))

            # Delivery type
            delivery_type = random.choices(['Delivered', 'Pickup'], weights=[70, 30])[0]

            # Location (only for Delivered)
            if delivery_type == 'Delivered':
                barangay = random.choice(BARANGAYS)
                lat_min, lat_max = barangay["lat_range"]
                lng_min, lng_max = barangay["lng_range"]
                latitude = round(random.uniform(lat_min, lat_max), 6)
                longitude = round(random.uniform(lng_min, lng_max), 6)
                text_address = barangay["name"]
            else:
                latitude = longitude = None
                text_address = "Pickup at warehouse"

            # Payment
            payment_method = random.choices(['Cash', 'GCash'], weights=[70, 30])[0]
            is_paid = payment_method == 'Cash' or random.random() < 0.8
            payment_status = "Paid" if is_paid else "Pending"

            # Staff & vehicle (only for Delivered)
            assigned_staff = None
            assigned_vehicle = None
            if delivery_type == 'Delivered' and staff_users:
                assigned_staff = random.choice(staff_users)
                if vehicles and random.random() < 0.6:
                    assigned_vehicle = random.choice(vehicles)

            # Status
            status = random.choices(
                ['Completed', 'Pending', 'Processing', 'In Transit', 'Cancelled'],
                weights=[85, 5, 3, 5, 2]
            )[0]

            # Create order
            order = Order.objects.create(
                customer_name=customer_name,
                contact_number=contact_number,
                delivery_type=delivery_type,
                address="",
                text_address=text_address,
                latitude=latitude,
                longitude=longitude,
                payment_method=payment_method,
                is_paid=is_paid,
                payment_status=payment_status,
                status=status,
                assigned_staff=assigned_staff,
                assigned_vehicle=assigned_vehicle,
                created_at=order_date,
                updated_at=order_date,
                gcash_receipt="gcash_receipts/demo.jpg" if payment_method == "GCash" else None,
            )

            # Add 1–5 items
            num_items = random.choices([1, 2, 3, 4, 5], weights=[30, 25, 20, 15, 10])[0]
            order_total = Decimal('0.00')

            for _ in range(num_items):
                beverage = random.choice(weighted_beverages)
                # 15% chance of heavy order (10–50 cases)
                if random.random() < 0.15:
                    cases = round(random.uniform(10, 50), 1)
                else:
                    cases = round(random.uniform(0.5, 5), 1)

                OrderItem.objects.create(
                    order=order,
                    beverage=beverage,
                    cases_ordered=cases,
                    price=beverage.price
                )
                order_total += Decimal(str(cases)) * beverage.price

            total_sales += float(order_total)
            orders_created += 1

            if orders_created % 50 == 0:
                self.stdout.write(f"✅ {orders_created} orders created... (Sales: ₱{total_sales:,.0f})")

        self.stdout.write(
            self.style.SUCCESS(
                f"\n🎉 Generated {orders_created} orders!\n"
                f"Total Gross Sales: ₱{total_sales:,.0f}\n"
                f"Date Range: {START_DATE.date()} to {END_DATE.date()}\n"
                f"Barangays used: {len(BARANGAYS)}"
            )
        )