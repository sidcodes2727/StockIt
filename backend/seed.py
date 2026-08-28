"""Seed the database with realistic demo data.

    python seed.py            # populate an empty database
    python seed.py --reset    # wipe all data first, then populate
    python seed.py --users-only

Generates a coherent history rather than isolated rows: products are stocked by
purchases, then drawn down by sales spread over the last several weeks, so the
dashboard charts, reports and stock levels all agree with each other.
"""

from __future__ import annotations

import argparse
import os
import random
import sys
from datetime import date, timedelta
from decimal import Decimal

from sqlalchemy import delete, func, select

from app import create_app
from app.extensions import db
from app.models import Category, Product, Purchase, Sale, Supplier, User, UserRole
from app.utils.references import slug_prefix

# Fixed seed: re-running produces the same demo dataset, which makes screenshots
# and bug reports reproducible.
RNG = random.Random(20260828)

TODAY = date.today()

CATEGORIES = [
    ("Medicines", "Prescription and over-the-counter pharmaceuticals"),
    ("Personal Care", "Hygiene, skincare and grooming products"),
    ("Beverages", "Bottled drinks, juices and hot beverages"),
    ("Packaged Foods", "Shelf-stable groceries and snacks"),
    ("Household", "Cleaning supplies and home essentials"),
    ("Stationery", "Paper, writing instruments and office supplies"),
]

SUPPLIERS = [
    (
        "MedSupply Distributors",
        "Rahul Deshmukh",
        "+91 98200 41277",
        "orders@medsupply.example",
        "Unit 14, Andheri Industrial Estate, Mumbai, Maharashtra 400053",
    ),
    (
        "Greenfield Wholesale",
        "Anita Nair",
        "+91 99401 88325",
        "sales@greenfieldwholesale.example",
        "Plot 22, Ambattur Industrial Area, Chennai, Tamil Nadu 600058",
    ),
    (
        "Nova Consumer Goods",
        "Vikram Shah",
        "+91 98104 33019",
        "vikram@novaconsumer.example",
        "B-7 Okhla Phase II, New Delhi 110020",
    ),
    (
        "Sunrise Beverage Co",
        "Priya Menon",
        "+91 96320 57744",
        "priya@sunrisebev.example",
        "Survey 41, Hinjawadi Phase 1, Pune, Maharashtra 411057",
    ),
]

# (name, category, supplier_index, cost_price, unit_price, reorder_level, description)
PRODUCTS = [
    ("Paracetamol 500mg Tablets", "Medicines", 0, "18.40", "32.00", 40,
     "Pack of 15 tablets. Analgesic and antipyretic."),
    ("Amoxicillin 250mg Capsules", "Medicines", 0, "62.00", "98.50", 25,
     "Strip of 10 capsules. Broad-spectrum antibiotic."),
    ("Cetirizine 10mg Tablets", "Medicines", 0, "14.25", "26.00", 30,
     "Pack of 10 tablets. Antihistamine for allergy relief."),
    ("ORS Rehydration Sachets", "Medicines", 0, "9.50", "18.00", 60,
     "Orange flavour oral rehydration salts, 21.8g sachet."),
    ("Digital Thermometer", "Medicines", 0, "185.00", "329.00", 10,
     "Fast-read digital clinical thermometer with fever alarm."),
    ("Antiseptic Liquid 500ml", "Personal Care", 2, "132.00", "215.00", 15,
     "Multi-purpose antiseptic disinfectant for first aid and household use."),
    ("Herbal Shampoo 340ml", "Personal Care", 2, "148.00", "249.00", 18,
     "Sulphate-free shampoo with amla and neem extract."),
    ("Toothpaste Mint 150g", "Personal Care", 2, "58.00", "95.00", 35,
     "Fluoride toothpaste with cavity protection."),
    ("Hand Sanitiser 200ml", "Personal Care", 2, "62.00", "110.00", 25,
     "70% isopropyl alcohol gel with aloe vera."),
    ("Green Tea Bags (25)", "Beverages", 3, "96.00", "165.00", 20,
     "Whole leaf green tea, individually foil-wrapped."),
    ("Cold Pressed Orange Juice 1L", "Beverages", 3, "88.00", "149.00", 24,
     "No added sugar, pasteurised. Refrigerate after opening."),
    ("Instant Coffee 100g", "Beverages", 3, "215.00", "349.00", 12,
     "Freeze-dried arabica blend."),
    ("Whole Wheat Biscuits 400g", "Packaged Foods", 1, "72.00", "120.00", 30,
     "High-fibre digestive biscuits."),
    ("Basmati Rice 5kg", "Packaged Foods", 1, "480.00", "699.00", 8,
     "Aged long-grain basmati rice."),
    ("Roasted Almonds 250g", "Packaged Foods", 1, "268.00", "425.00", 14,
     "Dry-roasted, unsalted California almonds."),
    ("Dishwash Liquid 750ml", "Household", 2, "94.00", "159.00", 20,
     "Lemon-scented concentrated dishwashing gel."),
    ("Floor Cleaner 1L", "Household", 2, "108.00", "179.00", 18,
     "Disinfectant floor cleaner, kills 99.9% of germs."),
    ("Garbage Bags Medium (30)", "Household", 2, "78.00", "135.00", 22,
     "Biodegradable drawstring bin liners."),
    ("A4 Copier Paper 500 Sheets", "Stationery", 1, "285.00", "419.00", 10,
     "75 GSM multipurpose printing paper."),
    ("Gel Pen Pack (10)", "Stationery", 1, "88.00", "150.00", 25,
     "0.7mm blue gel pens, smudge-free ink."),
]


def _confirm_or_exit(message: str) -> None:
    if os.getenv("SEED_ASSUME_YES", "").lower() in {"1", "true", "yes"}:
        return
    reply = input(f"{message} [y/N]: ").strip().lower()
    if reply not in {"y", "yes"}:
        print("Aborted. Nothing was changed.")
        sys.exit(1)


def wipe() -> None:
    """Delete all rows, children first, in one transaction."""
    print("  Clearing existing data...")
    for model in (Sale, Purchase, Product, Category, Supplier, User):
        db.session.execute(delete(model))
    db.session.commit()


def seed_users() -> list[User]:
    admin_email = os.getenv("SEED_ADMIN_EMAIL", "admin@stockflow.test").lower()
    staff_email = os.getenv("SEED_STAFF_EMAIL", "staff@stockflow.test").lower()
    admin_password = os.getenv("SEED_ADMIN_PASSWORD", "Admin@123")
    staff_password = os.getenv("SEED_STAFF_PASSWORD", "Staff@123")

    specs = [
        ("Asha Menon", admin_email, admin_password, UserRole.ADMIN, True),
        ("Rohit Verma", staff_email, staff_password, UserRole.STAFF, True),
        ("Neha Kulkarni", "neha.staff@stockflow.test", "Staff@123", UserRole.STAFF, True),
        # Deliberately inactive, so the Users page shows both states.
        ("Imran Sheikh", "imran.staff@stockflow.test", "Staff@123", UserRole.STAFF, False),
    ]

    users: list[User] = []
    for name, email, password, role, is_active in specs:
        existing = db.session.scalar(
            select(User).where(func.lower(User.email) == email)
        )
        if existing is not None:
            users.append(existing)
            print(f"  = user {email} already exists, skipped")
            continue

        user = User(name=name, email=email, role=role, is_active=is_active)
        user.set_password(password)
        db.session.add(user)
        users.append(user)
        print(f"  + {role:5} {email}")

    db.session.commit()
    return users


def seed_catalogue() -> tuple[dict[str, Category], list[Supplier], list[Product]]:
    categories: dict[str, Category] = {}
    for name, description in CATEGORIES:
        category = Category(name=name, description=description)
        db.session.add(category)
        categories[name] = category

    suppliers: list[Supplier] = []
    for name, contact, phone, email, address in SUPPLIERS:
        supplier = Supplier(
            name=name,
            contact_person=contact,
            phone=phone,
            email=email,
            address=address,
        )
        db.session.add(supplier)
        suppliers.append(supplier)

    db.session.flush()
    print(f"  + {len(categories)} categories, {len(suppliers)} suppliers")

    products: list[Product] = []
    sku_counters: dict[str, int] = {}
    for name, category_name, supplier_index, cost, price, reorder, description in PRODUCTS:
        prefix = slug_prefix(category_name, fallback="SKU")
        sku_counters[prefix] = sku_counters.get(prefix, 0) + 1

        product = Product(
            name=name,
            sku=f"{prefix}-{sku_counters[prefix]:04d}",
            category_id=categories[category_name].id,
            supplier_id=suppliers[supplier_index].id,
            cost_price=Decimal(cost),
            unit_price=Decimal(price),
            quantity=0,  # built up by the seeded purchases below
            reorder_level=reorder,
            description=description,
        )
        db.session.add(product)
        products.append(product)

    db.session.flush()
    print(f"  + {len(products)} products")
    return categories, suppliers, products


def seed_history(products: list[Product], users: list[User]) -> tuple[int, int]:
    """Stock everything in, then sell it down over the last 45 days."""
    recorders = [u for u in users if u.is_active] or users

    # --- opening stock: one goods-received note per supplier, 45 days ago ----
    opening_date = TODAY - timedelta(days=45)
    by_supplier: dict[int | None, list[Product]] = {}
    for product in products:
        by_supplier.setdefault(product.supplier_id, []).append(product)

    purchase_count = 0
    po_counter = 0
    for supplier_id, group in by_supplier.items():
        po_counter += 1
        reference = f"PO-{opening_date.strftime('%Y%m%d')}-{po_counter:04d}"
        for product in group:
            # Open with 4-9x the reorder level so there is room to sell.
            quantity = max(product.reorder_level, 10) * RNG.randint(4, 9)
            product.quantity += quantity
            db.session.add(
                Purchase(
                    reference_no=reference,
                    product_id=product.id,
                    supplier_id=supplier_id,
                    quantity=quantity,
                    cost_price=product.cost_price,
                    purchase_date=opening_date,
                    created_by=recorders[0].id,
                )
            )
            purchase_count += 1

    # --- restocking runs every ~10 days -------------------------------------
    for days_ago in (34, 23, 12, 4):
        restock_date = TODAY - timedelta(days=days_ago)
        po_counter += 1
        reference = f"PO-{restock_date.strftime('%Y%m%d')}-{po_counter:04d}"
        supplier_id = RNG.choice(list(by_supplier))
        for product in RNG.sample(by_supplier[supplier_id], k=min(4, len(by_supplier[supplier_id]))):
            quantity = max(product.reorder_level, 8) * RNG.randint(1, 3)
            product.quantity += quantity
            db.session.add(
                Purchase(
                    reference_no=reference,
                    product_id=product.id,
                    supplier_id=supplier_id,
                    quantity=quantity,
                    cost_price=product.cost_price,
                    purchase_date=restock_date,
                    created_by=RNG.choice(recorders).id,
                )
            )
            purchase_count += 1

    db.session.flush()

    # --- sales: 1-6 invoices a day for the last 45 days ---------------------
    customers = [
        None, None, None,  # walk-in customers are the common case
        "Sunita Rao", "Dev Patel", "Meera Iyer", "Kabir Singh",
        "Lakshmi Narayan", "Arjun Bose", "Fatima Qureshi",
        "City Clinic Pharmacy", "Sunrise Dental Care", "Hostel Mess Committee",
    ]

    sale_count = 0
    inv_counter: dict[str, int] = {}

    for days_ago in range(45, -1, -1):
        day = TODAY - timedelta(days=days_ago)

        # Weekends are busier; the most recent days are busier still.
        invoices = RNG.randint(2, 5)
        if day.weekday() >= 5:
            invoices += RNG.randint(1, 2)
        if days_ago <= 6:
            invoices += 1

        for _ in range(invoices):
            key = day.strftime("%Y%m%d")
            inv_counter[key] = inv_counter.get(key, 0) + 1
            invoice_no = f"INV-{key}-{inv_counter[key]:04d}"

            basket = RNG.sample(products, k=RNG.randint(1, 4))
            customer = RNG.choice(customers)
            recorder = RNG.choice(recorders)

            wrote_line = False
            for product in basket:
                if product.quantity <= 0:
                    continue
                quantity = min(product.quantity, RNG.randint(1, 6))
                if quantity <= 0:
                    continue

                # Occasional small discount, to make reports less uniform.
                price = product.unit_price
                if RNG.random() < 0.12:
                    price = (price * Decimal("0.95")).quantize(Decimal("0.01"))

                product.quantity -= quantity
                db.session.add(
                    Sale(
                        invoice_no=invoice_no,
                        product_id=product.id,
                        quantity=quantity,
                        sale_price=price,
                        customer_name=customer,
                        sale_date=day,
                        created_by=recorder.id,
                    )
                )
                sale_count += 1
                wrote_line = True

            if not wrote_line:
                inv_counter[key] -= 1

    db.session.commit()
    print(f"  + {purchase_count} purchase lines, {sale_count} sale lines")
    return purchase_count, sale_count


def force_stock_states(products: list[Product]) -> None:
    """Guarantee the demo shows every stock badge and a populated alerts panel."""
    if len(products) < 6:
        return

    # Two out of stock, three low, so the dashboard alert panel is never empty.
    for product in products[4:6]:
        product.quantity = 0
    for product in products[6:9]:
        product.quantity = max(1, product.reorder_level - RNG.randint(1, 4))

    # And make sure plenty are comfortably in stock.
    for product in products[9:]:
        if product.quantity <= product.reorder_level:
            product.quantity = product.reorder_level * RNG.randint(2, 5) + 5

    db.session.commit()

    statuses = {"in_stock": 0, "low_stock": 0, "out_of_stock": 0}
    for product in products:
        statuses[product.stock_status] += 1
    print(
        f"  = stock states: {statuses['in_stock']} in stock, "
        f"{statuses['low_stock']} low, {statuses['out_of_stock']} out"
    )


def main() -> None:
    parser = argparse.ArgumentParser(description="Seed the StockFlow database.")
    parser.add_argument(
        "--reset",
        action="store_true",
        help="delete ALL existing rows before seeding",
    )
    parser.add_argument(
        "--users-only",
        action="store_true",
        help="only create the demo user accounts",
    )
    args = parser.parse_args()

    app = create_app()
    with app.app_context():
        print(f"\nDatabase: {app.config['SQLALCHEMY_DATABASE_URI'].split('@')[-1]}\n")

        existing_products = db.session.scalar(select(func.count(Product.id))) or 0
        existing_users = db.session.scalar(select(func.count(User.id))) or 0

        if args.reset:
            if existing_products or existing_users:
                _confirm_or_exit(
                    f"This will DELETE all data ({existing_products} products, "
                    f"{existing_users} users). Continue?"
                )
            wipe()
        elif existing_products:
            print(
                f"Database already holds {existing_products} products.\n"
                "Run `python seed.py --reset` to wipe and re-seed, or "
                "`python seed.py --users-only` to just add the demo accounts."
            )
            return

        print("Seeding users...")
        users = seed_users()

        if args.users_only:
            print("\nDone (users only).\n")
            _print_credentials()
            return

        print("Seeding catalogue...")
        _, _, products = seed_catalogue()

        print("Seeding transaction history...")
        seed_history(products, users)

        print("Adjusting stock states for the demo...")
        force_stock_states(products)

        total_value = db.session.scalar(
            select(func.coalesce(func.sum(Product.cost_price * Product.quantity), 0))
        )
        print(f"\n  Total stock value at cost: {float(total_value or 0):,.2f}")
        print("\nSeed complete.\n")
        _print_credentials()


def _print_credentials() -> None:
    admin_email = os.getenv("SEED_ADMIN_EMAIL", "admin@stockflow.test")
    admin_password = os.getenv("SEED_ADMIN_PASSWORD", "Admin@123")
    staff_email = os.getenv("SEED_STAFF_EMAIL", "staff@stockflow.test")
    staff_password = os.getenv("SEED_STAFF_PASSWORD", "Staff@123")

    print("Demo sign-in credentials")
    print("------------------------------------------------")
    print(f"  Admin  {admin_email:32} {admin_password}")
    print(f"  Staff  {staff_email:32} {staff_password}")
    print("------------------------------------------------")
    print("Change these before exposing the app to anyone else.\n")


if __name__ == "__main__":
    main()
