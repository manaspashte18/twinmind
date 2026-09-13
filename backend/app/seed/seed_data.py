from sqlalchemy.orm import Session
from app.models.models import (
    Organization, User, Material, Supplier, Product, Customer,
    PurchaseOrder, PurchaseOrderItem, SalesOrder, SalesOrderItem,
    InventoryRecord, RiskAlert, ProductMaterial, SupplierMaterial
)
from app.auth import hash_password
from datetime import date, datetime, timedelta
import random

random.seed(42)  # Reproducible demo data


def seed_database(db: Session) -> dict:
    """Seed the database with realistic demo data for Precision Auto Components."""
    existing = db.query(Organization).first()
    if existing:
        return {"status": "already_seeded", "message": "Database already contains data"}

    # --- Organization ---
    org = Organization(
        name="Precision Auto Components",
        industry="Auto Component Manufacturing",
        scale="medium",
        location="Pune, India"
    )
    db.add(org)
    db.commit()
    db.refresh(org)

    # --- Demo User ---
    user = User(
        email="demo@twinmind.com",
        password_hash=hash_password("password123"),
        name="Demo Admin",
        role="owner",
        org_id=org.id
    )
    db.add(user)
    db.commit()

    # --- 25 Materials ---
    # (name, code, unit_cost, min_stock_level, avg_daily_usage)
    materials_data = [
        ("Aluminium Sheet 2mm", "MAT-001", 500, 1000, 50),
        ("Steel Rod 10mm", "MAT-002", 300, 500, 30),
        ("Copper Wire 1.5mm", "MAT-003", 800, 200, 15),
        ("Rubber Gasket Set", "MAT-004", 50, 2000, 100),
        ("Plastic Housing ABS", "MAT-005", 150, 1500, 80),
        ("Stainless Steel Bolt M8", "MAT-006", 20, 5000, 300),
        ("Spring Steel Wire", "MAT-007", 400, 300, 20),
        ("Brass Connector Pin", "MAT-008", 30, 4000, 200),
        ("Silicone Seal Ring", "MAT-009", 45, 2500, 120),
        ("Carbon Steel Plate 3mm", "MAT-010", 600, 800, 40),
        ("Zinc Alloy Die Cast", "MAT-011", 250, 1200, 60),
        ("Nylon Bushing", "MAT-012", 60, 3000, 150),
        ("Tungsten Carbide Insert", "MAT-013", 1500, 100, 5),
        ("Ceramic Disc Brake", "MAT-014", 2500, 150, 8),
        ("Glass Fiber Mat", "MAT-015", 350, 600, 25),
        ("Engine Oil 5W30", "MAT-016", 400, 1000, 50),
        ("Brake Fluid DOT4", "MAT-017", 300, 800, 40),
        ("Coolant Antifreeze", "MAT-018", 250, 1200, 60),
        ("Transmission Fluid", "MAT-019", 350, 500, 20),
        ("Power Steering Fluid", "MAT-020", 200, 400, 15),
        ("Bearing Grease", "MAT-021", 150, 600, 30),
        ("Threadlocker Blue", "MAT-022", 500, 200, 10),
        ("Silicone Sealant", "MAT-023", 180, 400, 20),
        ("Electrical Tape", "MAT-024", 20, 1000, 50),
        ("Cable Ties Pack", "MAT-025", 50, 2000, 100),
    ]

    materials = []
    for name, code, cost, min_stock, avg_usage in materials_data:
        m = Material(
            org_id=org.id, name=name, code=code,
            unit_cost=cost, min_stock_level=min_stock, avg_daily_usage=avg_usage
        )
        db.add(m)
        materials.append(m)
    db.commit()
    for m in materials:
        db.refresh(m)

    # --- 8 Suppliers ---
    # (name, on_time_rate, avg_delivery_days)
    suppliers_data = [
        ("Premier Metals Pvt Ltd", 0.96, 3),
        ("Quality Fasteners India", 0.98, 2),
        ("National Steel Corp", 0.88, 5),
        ("Bharat Polymers", 0.92, 4),
        ("Durable Components Ltd", 0.85, 6),
        ("Budget Materials Trading", 0.75, 8),
        ("Eastern Supplies Co", 0.68, 10),
        ("Quick Fix Materials", 0.55, 14),
    ]

    suppliers = []
    for name, ot_rate, avg_days in suppliers_data:
        s = Supplier(
            org_id=org.id, name=name,
            on_time_delivery_rate=ot_rate, avg_delivery_days=avg_days
        )
        db.add(s)
        suppliers.append(s)
    db.commit()
    for s in suppliers:
        db.refresh(s)

    # --- Link suppliers to materials ---
    for m in materials:
        primary = random.choice(suppliers)
        sm = SupplierMaterial(
            supplier_id=primary.id, material_id=m.id,
            is_primary=True, unit_price=m.unit_cost
        )
        db.add(sm)
        if random.random() > 0.4:
            backup = random.choice([s for s in suppliers if s.id != primary.id])
            sm2 = SupplierMaterial(
                supplier_id=backup.id, material_id=m.id,
                is_primary=False, unit_price=m.unit_cost * 1.15
            )
            db.add(sm2)
    db.commit()

    # --- 15 Customers ---
    customers_data = [
        ("Tata Motors Component Div", "critical"),
        ("Maruti Vendor Supply", "critical"),
        ("Mahindra Parts", "high"),
        ("Hyundai Spares", "high"),
        ("Honda Auto Components", "high"),
        ("Ford Spares India", "normal"),
        ("Toyota Parts Central", "normal"),
        ("Bajaj Auto Div", "normal"),
        ("TVS Motors Vendor", "normal"),
        ("Hero MotoCorp Parts", "normal"),
        ("Ashok Leyland Spares", "low"),
        ("Eicher Motors", "low"),
        ("Force Motors Components", "low"),
        ("Skoda Auto Parts", "low"),
        ("Volkswagen India Spares", "low"),
    ]
    customers = []
    for name, priority in customers_data:
        c = Customer(org_id=org.id, name=name, priority=priority)
        db.add(c)
        customers.append(c)
    db.commit()
    for c in customers:
        db.refresh(c)

    # --- 40 Products ---
    products_data = [
        "Brake Pad Assembly", "Engine Mounting Bracket", "Fuel Pump Housing",
        "Door Hinge Assembly", "Radiator Support", "Alternator Pulley",
        "Water Pump Impeller", "Starter Motor Gear", "Timing Belt Tensioner",
        "Clutch Release Bearing", "Steering Column Joint", "Suspension Control Arm",
        "Exhaust Manifold Heat Shield", "Intake Manifold Gasket", "Cylinder Head Cover",
        "Oil Pan Baffle", "Transmission Valve Body", "Differential Pinion Gear",
        "Wheel Hub Bearing", "CV Joint Boot", "Shock Absorber Mount",
        "Sway Bar Link", "Tie Rod End", "Ball Joint",
        "Brake Caliper Bracket", "Master Cylinder Reservoir", "Clutch Slave Cylinder",
        "Power Steering Pump Pulley", "AC Compressor Clutch", "Condenser Fan Motor",
        "Radiator Cooling Fan", "Heater Core", "Evaporator Core",
        "Blower Motor Resistor", "Cabin Air Filter", "Engine Air Filter",
        "Oil Filter", "Fuel Filter", "Spark Plug Wire Set", "Ignition Coil Pack"
    ]
    products = []
    for i, name in enumerate(products_data):
        p = Product(
            org_id=org.id, name=name,
            sku=f"PRD-{i+1:03d}",
            category="Auto Component",
            unit_price=round(random.uniform(500, 15000), 2)
        )
        db.add(p)
        products.append(p)
    db.commit()
    for p in products:
        db.refresh(p)

    # Link products to materials (BOM)
    for p in products:
        num_mats = random.randint(2, 5)
        selected = random.sample(materials, num_mats)
        for m in selected:
            pm = ProductMaterial(
                product_id=p.id, material_id=m.id,
                quantity_required=round(random.uniform(1, 10), 2)
            )
            db.add(pm)
    db.commit()

    # --- Inventory Records ---
    for idx, m in enumerate(materials):
        if idx < 4:
            qty = m.min_stock_level * 0.2  # Critically low
        elif idx < 10:
            qty = m.min_stock_level * 0.8  # Low
        elif idx > 22:
            qty = m.min_stock_level * 3.0  # Overstocked
        else:
            qty = m.min_stock_level * 1.5  # Healthy
        inv = InventoryRecord(
            org_id=org.id, material_id=m.id, quantity=round(qty)
        )
        db.add(inv)
    db.commit()

    # --- 150 Purchase Orders ---
    today = date.today()
    po_statuses = ["delivered", "delivered", "delivered", "shipped", "ordered", "pending"]
    for i in range(150):
        supplier = random.choice(suppliers)
        order_dt = today - timedelta(days=random.randint(1, 90))
        expected_dt = order_dt + timedelta(days=int(supplier.avg_delivery_days))

        st = random.choice(po_statuses)
        actual_dt = None
        if st == "delivered":
            if random.random() > supplier.on_time_delivery_rate:
                actual_dt = expected_dt + timedelta(days=random.randint(1, 10))
            else:
                actual_dt = expected_dt - timedelta(days=random.randint(0, 2))

        po = PurchaseOrder(
            org_id=org.id, supplier_id=supplier.id,
            po_number=f"PO-{1000+i}",
            status=st, order_date=order_dt,
            expected_delivery_date=expected_dt,
            actual_delivery_date=actual_dt,
            total_amount=0
        )
        db.add(po)
        db.flush()

        total = 0.0
        for _ in range(random.randint(1, 4)):
            m = random.choice(materials)
            qty = random.randint(10, 500)
            price = m.unit_cost * random.uniform(0.9, 1.1)
            total += qty * price
            poi = PurchaseOrderItem(
                purchase_order_id=po.id, material_id=m.id,
                quantity=qty, unit_price=round(price, 2)
            )
            db.add(poi)
        po.total_amount = round(total, 2)
    db.commit()

    # --- 200 Sales Orders ---
    so_statuses = ["delivered", "shipped", "in_production", "confirmed", "pending"]
    for i in range(200):
        customer = random.choice(customers)
        order_dt = today - timedelta(days=random.randint(1, 60))
        promised_dt = order_dt + timedelta(days=random.randint(5, 30))

        st = random.choice(so_statuses)
        actual_dt = None
        if st == "delivered":
            actual_dt = promised_dt - timedelta(days=random.randint(-3, 5))

        so = SalesOrder(
            org_id=org.id, customer_id=customer.id,
            so_number=f"SO-{2000+i}",
            status=st, order_date=order_dt,
            promised_delivery_date=promised_dt,
            actual_delivery_date=actual_dt,
            total_amount=0
        )
        db.add(so)
        db.flush()

        total = 0.0
        for _ in range(random.randint(1, 3)):
            p = random.choice(products)
            qty = random.randint(5, 50)
            total += qty * p.unit_price
            soi = SalesOrderItem(
                sales_order_id=so.id, product_id=p.id,
                quantity=qty, unit_price=p.unit_price
            )
            db.add(soi)
        so.total_amount = round(total, 2)
    db.commit()

    # --- Pre-seeded Risk Alerts ---
    alerts = [
        {
            "risk_type": "inventory_stockout", "severity": "critical", "score": 95,
            "entity_type": "material", "entity_id": materials[0].id,
            "title": "Critical: Aluminium Sheet 2mm stockout imminent",
            "description": "Current stock of Aluminium Sheet 2mm is at 200 units against a daily usage of 50 units. Stock will run out in approximately 4 days, but supplier delivery takes 10+ days.",
            "recommendation": "Place an emergency order immediately. Consider using backup supplier.",
            "financial_impact": 320000,
        },
        {
            "risk_type": "inventory_stockout", "severity": "critical", "score": 92,
            "entity_type": "material", "entity_id": materials[1].id,
            "title": "Critical: Steel Rod 10mm running low",
            "description": "Steel Rod 10mm stock is at 100 units with daily usage of 30 units. Estimated 3 days until stockout.",
            "recommendation": "Order from primary supplier or expedite existing PO.",
            "financial_impact": 185000,
        },
        {
            "risk_type": "supplier_delay", "severity": "high", "score": 78,
            "entity_type": "supplier", "entity_id": suppliers[7].id,
            "title": "High risk: Quick Fix Materials unreliable",
            "description": "Quick Fix Materials has an on-time delivery rate of only 55%. Multiple recent deliveries were 5-10 days late.",
            "recommendation": "Switch critical material orders to backup suppliers. Keep Quick Fix for non-urgent orders only.",
            "financial_impact": 150000,
        },
        {
            "risk_type": "order_delay", "severity": "high", "score": 75,
            "entity_type": "order", "entity_id": 1,
            "title": "Customer order at risk of delay",
            "description": "Sales order SO-2050 for Tata Motors is due in 5 days but depends on materials currently in short supply.",
            "recommendation": "Prioritize production for this order. Expedite material procurement.",
            "financial_impact": 250000,
        },
        {
            "risk_type": "inventory_stockout", "severity": "medium", "score": 55,
            "entity_type": "material", "entity_id": materials[3].id,
            "title": "Low stock: Rubber Gasket Set",
            "description": "Rubber Gasket Set is below minimum stock level. Current: 400 units, Minimum: 2000 units.",
            "recommendation": "Place a reorder within the next 2 days.",
            "financial_impact": 45000,
        },
        {
            "risk_type": "inventory_stockout", "severity": "medium", "score": 50,
            "entity_type": "material", "entity_id": materials[4].id,
            "title": "Low stock: Plastic Housing ABS",
            "description": "Plastic Housing ABS approaching minimum stock level.",
            "recommendation": "Monitor closely and prepare purchase order.",
            "financial_impact": 38000,
        },
        {
            "risk_type": "inventory_stockout", "severity": "low", "score": 25,
            "entity_type": "material", "entity_id": materials[24].id,
            "title": "Excess inventory: Cable Ties Pack",
            "description": "Cable Ties Pack has 6000 units against a minimum of 2000. Consider reducing future orders.",
            "recommendation": "Skip next scheduled order for this material.",
            "financial_impact": 0,
        },
    ]

    for a in alerts:
        alert = RiskAlert(org_id=org.id, status="active", **a)
        db.add(alert)
    db.commit()

    return {
        "status": "seeded",
        "message": "Demo data created for Precision Auto Components",
        "credentials": {"email": "demo@twinmind.com", "password": "password123"},
        "counts": {
            "materials": 25, "suppliers": 8, "products": 40,
            "customers": 15, "purchase_orders": 150,
            "sales_orders": 200, "risk_alerts": len(alerts)
        }
    }
