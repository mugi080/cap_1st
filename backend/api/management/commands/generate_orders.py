# generate_orders.py
import random
from datetime import datetime, timedelta
from django.core.management.base import BaseCommand
from django.utils import timezone
from django.contrib.auth import get_user_model
from api.models import Order, OrderItem, Beverage, Vehicle
from decimal import Decimal

User = get_user_model()

class Command(BaseCommand):
    help = 'Generate realistic dummy orders for Jan-Apr 2025 with proper case-based quantities'

    def add_arguments(self, parser):
        parser.add_argument(
            '--orders-per-month',
            type=int,
            default=30,  # 🆕 Changed from 50 to 30
            help='Number of orders to generate per month (default: 30)'
        )

    def handle(self, *args, **kwargs):
        orders_per_month = kwargs['orders_per_month']

        # Check if we have the required data
        beverages = list(Beverage.objects.all())
        if not beverages:
            self.stdout.write(self.style.ERROR("❌ Please add some Beverages first."))
            return

        vehicles = list(Vehicle.objects.all())
        staff_users = list(User.objects.filter(is_staff=True))

        # Display what beverages we have
        self.stdout.write(self.style.SUCCESS("📦 Available Beverages:"))
        for bev in beverages:
            self.stdout.write(f"  - {bev.name} (₱{bev.price}) - {bev.units_per_case} units/case")

        # Generate orders for these months only
        months = [
            (1, 'January', 2025, 30),
            (2, 'February', 2025, 35), 
            (3, 'March', 2025, 45),
            (4, 'April', 2025, 53)
        ]


        # Realistic Filipino names
        first_names = [
            "Juan", "Maria", "Jose", "Ana", "Antonio", "Carmen", "Francisco", "Luz",
            "Manuel", "Esperanza", "Pedro", "Rosario", "Jesus", "Dolores", "Ramon",
            "Josefa", "Miguel", "Teresa", "Angel", "Remedios", "Ricardo", "Elena",
            "Roberto", "Rosa", "Fernando", "Soledad", "Eduardo", "Concepcion"
        ]
        
        last_names = [
            "Dela Cruz", "Garcia", "Reyes", "Ramos", "Mendoza", "Santos", "Flores",
            "Gonzales", "Bautista", "Martinez", "Torres", "Lopez", "Morales", "Castro",
            "Rivera", "Villanueva", "Aquino", "Fernandez", "Valdez", "Soriano"
        ]

        phone_prefixes = ["0917", "0918", "0919", "0920", "0921", "0922", "0923", "0905", "0906", "0915", "0916"]

        total_orders_created = 0

        for month, month_name, year, orders_count in months:
            self.stdout.write(f"\n🗓️  Generating orders for {month_name} {year}...")

            start_of_month = datetime(year, month, 1)
            if month == 12:
                end_of_month = datetime(year + 1, 1, 1)
            else:
                end_of_month = datetime(year, month + 1, 1)

            days_in_month = (end_of_month - start_of_month).days

            month_orders = 0

            for order_num in range(orders_count):  # Use orders_count instead of orders_per_month
                try:
                    # Random time within the month
                    day = random.randint(1, days_in_month)
                    hour = random.randint(8, 20)  # 8 AM to 8 PM
                    minute = random.randint(0, 59)

                    naive_date = datetime(year, month, day, hour, minute)
                    aware_date = timezone.make_aware(naive_date)

                    # Generate customer info
                    customer_name = f"{random.choice(first_names)} {random.choice(last_names)}"
                    contact_number = f"{random.choice(phone_prefixes)}{random.randint(1000000, 9999999)}"

                    # Order details
                    delivery_type = random.choices(
                        ['Pickup', 'Delivered'], 
                        weights=[60, 40]
                    )[0]

                    status = random.choices(
                        ['Pending', 'Processing', 'In Transit', 'Completed'],
                        weights=[10, 15, 20, 55]
                    )[0]

                    payment_method = random.choices(
                        ['Cash', 'GCash', 'Card'],
                        weights=[50, 35, 15]
                    )[0]

                    assigned_staff = random.choice(staff_users) if delivery_type == 'Delivered' and staff_users else None
                    assigned_vehicle = random.choice(vehicles) if delivery_type == 'Delivered' and vehicles else None

                    addresses = [
                        "Barangay Dalahican, Lucena, Quezon City",
                        "Barangay Talao-talao, Lucena, Quezon City", 
                        "Barangay Isabang, Lucena, Quezon City",
                        "Barangay Marketview, Lucena, Quezon City",
                        "Barangay Mayao, Lucena, Quezon City",
                        "Barangay Gulang, Lucena, Quezon City",
                        "Barangay Barra, Lucena, Quezon City"
                    ]

                    address = random.choice(addresses) if delivery_type == 'Delivered' else ""
                    text_address = f"Near {random.choice(['Mall', 'Church', 'School', 'Market', 'Hospital'])}" if delivery_type == 'Delivered' else ""

                    order = Order.objects.create(
                        user=None,
                        customer_name=customer_name,
                        contact_number=contact_number,
                        payment_method=payment_method,
                        delivery_type=delivery_type,
                        status=status,
                        address=address,
                        text_address=text_address,
                        assigned_staff=assigned_staff,
                        assigned_vehicle=assigned_vehicle,
                        created_at=aware_date,
                        updated_at=aware_date
                    )

                    self.generate_realistic_order_items(order, beverages)
                    month_orders += 1
                    total_orders_created += 1

                except Exception as e:
                    self.stdout.write(self.style.ERROR(f"Error creating order {order_num + 1}: {str(e)}"))
                    continue

            self.stdout.write(self.style.SUCCESS(f"✅ Created {month_orders} orders for {month_name}"))

        self.stdout.write(self.style.SUCCESS(f"\n🎉 Successfully generated {total_orders_created} total orders!"))
        self.stdout.write(self.style.SUCCESS("📊 You can now check your beverage sales report."))

    def generate_realistic_order_items(self, order, beverages):
        """Generate realistic order items based on beverage cases"""
        num_beverage_types = random.choices([1, 2, 3, 4], weights=[40, 35, 20, 5])[0]
        selected_beverages = random.sample(beverages, min(num_beverage_types, len(beverages)))

        for beverage in selected_beverages:
            try:
                units_per_case = beverage.units_per_case or 12

                # Quantity patterns based on case size
                if units_per_case <= 6:
                    quantity = int(units_per_case * random.choice([0.5, 1, 1, 2]))
                elif units_per_case <= 12:
                    quantity = int(units_per_case * random.choice([0.5, 1, 1, 1, 2, 2, 3]))
                else:
                    quantity = int(units_per_case * random.choice([0.5, 1, 1, 2]))

                quantity = max(1, quantity)

                price = beverage.price if beverage.price else Decimal('15.00')

                OrderItem.objects.create(
                    order=order,
                    beverage=beverage,
                    quantity=quantity,
                    price=price
                )

            except Exception as e:
                self.stdout.write(self.style.WARNING(f"⚠️  Error adding {beverage.name}: {str(e)}"))
                continue