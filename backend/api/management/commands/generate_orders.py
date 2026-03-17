# api/management/commands/generate_orders.py
import random
from datetime import datetime
from decimal import Decimal
from django.core.management.base import BaseCommand
from django.utils import timezone
from django.contrib.auth import get_user_model
from api.models import Order, OrderItem, Beverage, Vehicle, LUCENA_BARANGAYS

User = get_user_model()

class Command(BaseCommand):
    help = 'Generate realistic dummy orders (Jan-Nov 2025) with accurate popularity, barangay weights, and auto-cleanup'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show stats without creating data'
        )

    def handle(self, *args, **kwargs):
        dry_run = kwargs['dry_run']

        # 🔥 AUTO-DELETE PREVIOUS DUMMY ORDERS (user=None)
        if not dry_run:
            deleted_count, _ = Order.objects.filter(user__isnull=True).delete()
            self.stdout.write(self.style.WARNING(f"🗑️  Deleted {deleted_count} previous dummy orders"))

        # Get data
        beverages = list(Beverage.objects.all())
        if not beverages:
            self.stdout.write(self.style.ERROR("❌ Please add Beverages first!"))
            return

        staff_users = list(User.objects.filter(role='staff'))
        vehicles = list(Vehicle.objects.filter(is_available=True))

        # 🥇 BEVERAGE POPULARITY (Coca-Cola Regular is #1)
        BEVERAGE_WEIGHTS = {
            'coca-cola regular': 10,
            'coke regular': 10,
            'coca cola regular': 10,
            'kasalo': 5,
            'mismo': 2,
            'swakto': 1,
            '1.5l': 1,
            '1.5 liter': 1,
            'beer': 3,
            'san miguel': 3,
            'heineken': 3,
            'alcohol': 3,
            'monster': 2,
            'red bull': 2,
            'energy': 2,
            # Default fallback
            'default': 1
        }

        # 🏘️ BARANGAY WEIGHTS (higher = more orders)
        BARANGAY_WEIGHTS = {
            "Dalahican": 10,
            "Cotta": 10,
            "Market View": 8,
            "Mayao": 8,
            "Iyam": 7,
            "Dupay": 6,
            "Talao-talao": 5,
        }

        # Expand barangay list with weights
        weighted_barangays = []
        for brgy, weight in BARANGAY_WEIGHTS.items():
            weighted_barangays.extend([brgy] * weight)

        # 📈 MONTHLY SALES TARGETS (₱ in millions) — PEAK IN MAR-JUL
        MONTHLY_SALES_TARGET = {
            1: 9_000_000,   # Jan
            2: 9_500_000,   # Feb
            3: 12_500_000,  # 🌞 MAR - PEAK START
            4: 13_000_000,  # 🌞 APR - HIGHEST
            5: 12_800_000,  # 🌞 MAY
            6: 12_200_000,  # 🌞 JUN
            7: 11_800_000,  # 🌞 JUL
            8: 10_500_000,  # Aug
            9: 10_000_000,  # Sep
            10: 10_500_000, # Oct
            11: 11_000_000, # Nov
        }

        # Realistic full names
        names = [
            "Andrea Nicole Dela Cruz", "Rafael Miguel Santos", "Gabrielle Marie Garcia",
            "Diego Antonio Reyes", "Isabel Grace Mendoza", "Luis Carlos Torres",
            "Camille Elena Flores", "Javier Daniel Bautista", "Patricia Lourdes Aguilar",
            "Sebastian Rafael Navarro", "Valerie Monique Castro", "Nathalie Francis Perez",
            "Miguel Jose Villanueva", "Samantha Grace Cruz", "Gabriel Daniel Lopez"
        ]

        phone_prefixes = ["0917", "0918", "0919", "0905", "0926"]

        total_orders = 0
        total_sales = Decimal('0.00')

        for month in range(1, 12):  # Jan to Nov
            target_sales = Decimal(MONTHLY_SALES_TARGET[month])
            monthly_sales = Decimal('0.00')
            orders_this_month = 0

            start_date = datetime(2025, month, 1)
            days_in_month = 28 + (1 if month == 2 else (30 if month in [4,6,9,11] else 31))

            self.stdout.write(f"\n🗓️  {start_date.strftime('%B %Y')} (Target: ₱{target_sales:,.0f})")

            # Adjust order count based on season (more in peak months)
            base_orders = 30
            if month in [3, 4, 5, 6, 7]:  # Peak hot months
                max_orders = random.randint(40, 60)
            else:
                max_orders = random.randint(25, 40)

            while monthly_sales < target_sales and orders_this_month < max_orders:
                try:
                    # Random timestamp
                    day = random.randint(1, days_in_month)
                    hour = random.randint(8, 18)
                    naive_date = datetime(2025, month, day, hour, random.randint(0, 59))
                    aware_date = timezone.make_aware(naive_date)

                    customer_name = random.choice(names)
                    contact = f"{random.choice(phone_prefixes)}{random.randint(1000000, 9999999)}"

                    # Barangay selection with weights
                    barangay = random.choice(weighted_barangays)
                    address = f"{barangay}, Lucena City, Quezon"
                    text_addr = f"Near Barangay {barangay} Hall"

                    assigned_staff = random.choice(staff_users) if staff_users else None
                    assigned_vehicle = random.choice(vehicles) if vehicles else None

                    if not dry_run:
                        order = Order.objects.create(
                            user=None,
                            customer_name=customer_name,
                            contact_number=contact,
                            payment_method=random.choice(['Cash', 'GCash']),
                            delivery_type='Delivered',
                            status='Completed',
                            address=address,
                            text_address=text_addr,
                            barangay=barangay,
                            assigned_staff=assigned_staff,
                            assigned_vehicle=assigned_vehicle,
                            created_at=aware_date,
                            updated_at=aware_date,
                            is_paid=True,
                            payment_status="Paid"
                        )

                    # === ITEM GENERATION ===
                    order_total = Decimal('0.00')
                    is_bulk = random.random() < 0.65  # 65% bulk

                    # Determine number of items
                    if is_bulk:
                        num_items = random.randint(2, 4)
                        case_options = [3, 4, 5, 6, 8, 10, 12, 15]
                    else:
                        num_items = random.randint(1, 2)
                        case_options = [0.5, 1, 1.5, 2, 2.5, 3, 4]

                    # Build weighted beverage list
                    weighted_bevs = []
                    for bev in beverages:
                        name_lower = bev.name.lower()
                        weight = 1  # default
                        matched = False
                        for keyword in BEVERAGE_WEIGHTS:
                            if keyword == 'default':
                                continue
                            if keyword in name_lower:
                                weight = BEVERAGE_WEIGHTS[keyword]
                                matched = True
                                break
                        if not matched:
                            weight = BEVERAGE_WEIGHTS['default']
                        weighted_bevs.extend([bev] * weight)

                    if not weighted_bevs:
                        continue

                    selected_bevs = random.sample(
                        weighted_bevs,
                        min(num_items, len(weighted_bevs))
                    )

                    for beverage in selected_bevs:
                        case_qty = Decimal(str(random.choice(case_options)))
                        if beverage.stock < case_qty:
                            case_qty = beverage.stock if beverage.stock > 0 else Decimal('0.5')
                        if case_qty <= 0:
                            continue

                        item_total = case_qty * beverage.price
                        order_total += item_total

                        if not dry_run:
                            OrderItem.objects.create(
                                order=order,
                                beverage=beverage,
                                cases_ordered=case_qty,
                                price=beverage.price
                            )

                    monthly_sales += order_total
                    orders_this_month += 1
                    total_sales += order_total

                except Exception as e:
                    if not dry_run:
                        self.stdout.write(self.style.WARNING(f"⚠️ Skipped order: {str(e)}"))
                    continue

            total_orders += orders_this_month
            avg = monthly_sales / orders_this_month if orders_this_month else 0
            self.stdout.write(
                self.style.SUCCESS(
                    f"✅ {orders_this_month} orders | Sales: ₱{monthly_sales:,.0f} | Avg: ₱{avg:,.0f}"
                )
            )

        self.stdout.write("\n" + "="*60)
        self.stdout.write(self.style.SUCCESS(f"🎉 TOTAL: {total_orders} orders | Sales: ₱{total_sales:,.0f}"))
        self.stdout.write("✅ All orders are COMPLETED and use weighted popularity/barangays")
        self.stdout.write("="*60)