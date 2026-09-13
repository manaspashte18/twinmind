from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import date, datetime, timedelta
from typing import Dict, Any

from app.models.models import (
    Material, Supplier, InventoryRecord, PurchaseOrder,
    SalesOrder, SalesOrderItem, ProductMaterial, RiskAlert
)

def calculate_health_score(db: Session, org_id: int) -> Dict[str, Any]:
    today = date.today()

    # 1. Inventory Stability (Weight: 25%)
    # Evaluates the percentage of materials above minimum safety stock
    inv_records = db.query(InventoryRecord, Material).join(
        Material, InventoryRecord.material_id == Material.id
    ).filter(InventoryRecord.org_id == org_id).all()

    total_materials = len(inv_records)
    if total_materials == 0:
        mat_count = db.query(func.count(Material.id)).filter(Material.org_id == org_id).scalar() or 0
        if mat_count == 0:
            inv_stability = 100
            low_stock_materials = []
            critical_stock_materials = []
        else:
            inv_stability = 40
            low_stock_materials = ["Unstocked items"]
            critical_stock_materials = []
    else:
        healthy_count = 0
        low_stock_materials = []
        critical_stock_materials = []
        ratios = []

        for rec, mat in inv_records:
            qty = rec.quantity or 0.0
            min_stock = mat.min_stock_level or 0.0

            if min_stock > 0:
                ratio = min(1.2, qty / min_stock)
                ratios.append(min(1.0, ratio))
            else:
                ratios.append(1.0 if qty > 0 else 0.5)

            if qty <= 0:
                critical_stock_materials.append(mat.name)
            elif qty < min_stock:
                low_stock_materials.append(mat.name)
            else:
                healthy_count += 1

        avg_ratio = sum(ratios) / max(total_materials, 1)
        base_stability = avg_ratio * 100

        # Penalize critical stockouts
        crit_penalty = min(25, len(critical_stock_materials) * 8)
        inv_stability = round(max(10, min(100, base_stability - crit_penalty)))

    # 2. Supplier Reliability (Weight: 20%)
    # Average on-time delivery rate across active vendors + penalty for overdue POs
    suppliers = db.query(Supplier).filter(Supplier.org_id == org_id).all()
    if not suppliers:
        supplier_reliability = 100
        unreliable_suppliers = []
    else:
        rates = []
        unreliable_suppliers = []
        for s in suppliers:
            rate = s.on_time_delivery_rate if s.on_time_delivery_rate is not None else 0.85
            rates.append(rate)
            if rate < 0.80:
                unreliable_suppliers.append(s.name)

        avg_supplier_rate = sum(rates) / len(rates)
        base_supp_score = avg_supplier_rate * 100

        # Check for currently overdue purchase orders
        overdue_pos = db.query(func.count(PurchaseOrder.id)).filter(
            PurchaseOrder.org_id == org_id,
            PurchaseOrder.status.in_(["pending", "ordered", "shipped"]),
            PurchaseOrder.expected_delivery_date != None,
            PurchaseOrder.expected_delivery_date < today
        ).scalar() or 0

        po_penalty = min(20, overdue_pos * 5)
        supplier_reliability = round(max(15, min(100, base_supp_score - po_penalty)))

    # 3. Order Fulfillment (Weight: 25%)
    # % of active sales orders that are on-track and not overdue
    open_sales_orders = db.query(SalesOrder).filter(
        SalesOrder.org_id == org_id,
        SalesOrder.status.in_(["pending", "confirmed", "in_production"])
    ).all()

    delayed_orders_count = 0
    at_risk_orders_count = 0
    total_open_so = len(open_sales_orders)
    revenue_at_risk = 0.0
    total_open_revenue = 0.0

    if total_open_so == 0:
        order_fulfillment = 100
    else:
        for so in open_sales_orders:
            amt = float(so.total_amount or 0.0)
            total_open_revenue += amt
            promised = so.promised_delivery_date
            if promised:
                days_left = (promised - today).days
                if days_left < 0:
                    delayed_orders_count += 1
                    revenue_at_risk += amt
                elif days_left <= 4:
                    at_risk_orders_count += 1
                    revenue_at_risk += amt * 0.5
            elif so.status == "pending":
                at_risk_orders_count += 1
                revenue_at_risk += amt * 0.3

        on_track_count = total_open_so - delayed_orders_count - (at_risk_orders_count * 0.5)
        order_fulfillment = round(max(10, min(100, (on_track_count / total_open_so) * 100)))

    # 4. Production Readiness (Weight: 15%)
    # Coverage of bill of materials for in-production & confirmed orders
    if total_open_so == 0 or total_materials == 0:
        production_readiness = 100
    else:
        low_ratio = (len(low_stock_materials) + len(critical_stock_materials) * 1.5) / max(total_materials, 1)
        production_readiness = round(max(15, min(100, (1.0 - min(0.85, low_ratio)) * 100)))

    # 5. Financial Health (Weight: 15%)
    # Revenue at risk as proportion of total open pipeline + active risk financial impact
    active_risks = db.query(RiskAlert).filter(
        RiskAlert.org_id == org_id,
        RiskAlert.status == "active"
    ).all()

    total_risk_financial_impact = sum(float(r.financial_impact or 0.0) for r in active_risks)

    if total_open_revenue > 0:
        rev_risk_ratio = min(1.0, revenue_at_risk / total_open_revenue)
        financial_health = round(max(15, min(100, (1.0 - rev_risk_ratio) * 100)))
    else:
        if total_risk_financial_impact > 100000:
            financial_health = 65
        elif total_risk_financial_impact > 0:
            financial_health = 80
        else:
            financial_health = 100

    # Composite Overall Score
    overall_score = round(
        0.25 * inv_stability +
        0.20 * supplier_reliability +
        0.25 * order_fulfillment +
        0.15 * production_readiness +
        0.15 * financial_health
    )
    overall_score = max(5, min(100, overall_score))

    # Category determination
    if overall_score >= 90:
        category = "excellent"
    elif overall_score >= 75:
        category = "good"
    elif overall_score >= 50:
        category = "fair"
    elif overall_score >= 25:
        category = "poor"
    else:
        category = "critical"

    # Trend determination
    critical_risks_count = sum(1 for r in active_risks if str(r.severity).lower() in ["critical", "high"])
    if critical_risks_count >= 3 or overall_score < 60:
        trend = "declining"
    elif critical_risks_count == 0 and overall_score >= 80:
        trend = "improving"
    else:
        trend = "stable"

    # Natural Language Explanation
    issues = []
    if critical_stock_materials:
        issues.append(f"{len(critical_stock_materials)} material{'s' if len(critical_stock_materials) > 1 else ''} completely stocked out")
    elif low_stock_materials:
        issues.append(f"{len(low_stock_materials)} low-stock material{'s' if len(low_stock_materials) > 1 else ''}")

    if len(unreliable_suppliers) > 0:
        issues.append(f"lead time delays from {len(unreliable_suppliers)} supplier{'s' if len(unreliable_suppliers) > 1 else ''}")

    delayed_total = delayed_orders_count + at_risk_orders_count
    if delayed_total > 0:
        issues.append(f"{delayed_total} customer order{'s' if delayed_total > 1 else ''} at risk of delivery delay")

    if issues:
        explanation = (
            f"Your operational health is {category.capitalize()} ({overall_score}/100). "
            f"Inventory stability is at {inv_stability}/100 and supplier reliability is at {supplier_reliability}/100. "
            f"Current bottlenecks include: {', '.join(issues)}."
        )
    else:
        explanation = (
            f"Your operational health is {category.capitalize()} ({overall_score}/100). "
            f"All inventory thresholds, supplier delivery commitments, and customer order schedules are currently on track."
        )

    return {
        "score": overall_score,
        "category": category,
        "breakdown": {
            "inventory_stability": inv_stability,
            "supplier_reliability": supplier_reliability,
            "order_fulfillment": order_fulfillment,
            "production_readiness": production_readiness,
            "financial_health": financial_health
        },
        "trend": trend,
        "explanation": explanation
    }
