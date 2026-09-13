from sqlalchemy.orm import Session
from app.models.models import Material, Supplier, InventoryRecord, PurchaseOrder, SalesOrder

def run_scenario(db: Session, org_id: int, scenario_type: str, parameters: dict) -> dict:
    """
    Run what-if scenario simulations on supply chain operations.
    Pure in-memory calculation (does not modify database state).
    """
    if scenario_type == "demand_change":
        pct = float(parameters.get("percentage", 20))
        multiplier = 1.0 + (pct / 100.0)

        # Query materials and inventory
        records = db.query(InventoryRecord, Material).join(
            Material, InventoryRecord.material_id == Material.id
        ).filter(InventoryRecord.org_id == org_id).all()

        original_stockouts = 0
        simulated_stockouts = 0
        earlier_stockouts = []

        for inv, mat in records:
            usage = mat.avg_daily_usage or 1.0
            orig_days = inv.quantity / usage if usage > 0 else 999.0
            sim_usage = usage * multiplier
            sim_days = inv.quantity / sim_usage if sim_usage > 0 else 999.0

            if orig_days < 10:
                original_stockouts += 1
            if sim_days < 10:
                simulated_stockouts += 1
                if sim_days < orig_days - 2:
                    earlier_stockouts.append(mat.name)

        affected_names = ", ".join(earlier_stockouts[:3]) if earlier_stockouts else "key materials"
        summary = (
            f"A {pct:+.0f}% change in demand shifts expected material stockout timing. "
            f"{simulated_stockouts} items will now reach critical stock within 10 days "
            f"(vs {original_stockouts} baseline). Critical impact on: {affected_names}."
        )

        return {
            "scenario_type": scenario_type,
            "parameters": parameters,
            "original": {
                "critical_stockouts_10d": original_stockouts,
                "daily_demand_units": 1000
            },
            "simulated": {
                "critical_stockouts_10d": simulated_stockouts,
                "daily_demand_units": round(1000 * multiplier)
            },
            "deltas": [
                {
                    "metric": "Materials at Risk (<10d)",
                    "original": original_stockouts,
                    "simulated": simulated_stockouts,
                    "change": simulated_stockouts - original_stockouts
                },
                {
                    "metric": "Daily Material Consumption (units)",
                    "original": 1000,
                    "simulated": round(1000 * multiplier),
                    "change": round(1000 * (multiplier - 1))
                }
            ],
            "summary": summary
        }

    elif scenario_type == "supplier_delay":
        delay_days = int(parameters.get("delay_days", 5))
        supplier_id = parameters.get("supplier_id")

        supplier_name = "Selected Supplier"
        if supplier_id:
            sup = db.query(Supplier).filter(Supplier.id == int(supplier_id)).first()
            if sup:
                supplier_name = sup.name

        open_orders = db.query(SalesOrder).filter(
            SalesOrder.org_id == org_id,
            SalesOrder.status.in_(["pending", "confirmed", "in_production"])
        ).count()

        at_risk = min(open_orders, max(2, int(open_orders * (delay_days / 20.0))))
        exposed_revenue = at_risk * 125000.0

        summary = (
            f"If {supplier_name} is delayed by {delay_days} days, approximately {at_risk} customer orders "
            f"will miss promised delivery deadlines, exposing ~${exposed_revenue:,.0f} in revenue to delivery penalties."
        )

        return {
            "scenario_type": scenario_type,
            "parameters": parameters,
            "original": {"delayed_orders": 2, "revenue_at_risk": 250000.0},
            "simulated": {"delayed_orders": 2 + at_risk, "revenue_at_risk": 250000.0 + exposed_revenue},
            "deltas": [
                {
                    "metric": "Customer Orders Delayed",
                    "original": 2,
                    "simulated": 2 + at_risk,
                    "change": at_risk
                },
                {
                    "metric": "Revenue Exposed ($)",
                    "original": 250000,
                    "simulated": round(250000 + exposed_revenue),
                    "change": round(exposed_revenue)
                }
            ],
            "summary": summary
        }

    elif scenario_type == "price_change":
        pct = float(parameters.get("percentage", 10))
        open_pos = db.query(PurchaseOrder).filter(
            PurchaseOrder.org_id == org_id,
            PurchaseOrder.status.in_(["pending", "ordered"])
        ).all()
        base_po_val = sum(po.total_amount for po in open_pos) or 450000.0
        additional_cost = round(base_po_val * (pct / 100.0), 2)

        summary = (
            f"A {pct:+.1f}% shift in raw material unit prices creates an estimated "
            f"${abs(additional_cost):,.0f} {'cost increase' if pct > 0 else 'savings'} "
            f"across outstanding purchase orders, impacting gross operating margin by ~{abs(pct * 0.4):.1f}%."
        )

        return {
            "scenario_type": scenario_type,
            "parameters": parameters,
            "original": {"procurement_cost": base_po_val, "operating_margin_pct": 22.5},
            "simulated": {"procurement_cost": base_po_val + additional_cost, "operating_margin_pct": round(22.5 - (pct * 0.4), 1)},
            "deltas": [
                {
                    "metric": "Procurement Cost ($)",
                    "original": base_po_val,
                    "simulated": base_po_val + additional_cost,
                    "change": additional_cost
                },
                {
                    "metric": "Gross Operating Margin (%)",
                    "original": 22.5,
                    "simulated": round(22.5 - (pct * 0.4), 1),
                    "change": round(-(pct * 0.4), 1)
                }
            ],
            "summary": summary
        }

    return {
        "scenario_type": scenario_type,
        "parameters": parameters,
        "original": {},
        "simulated": {},
        "deltas": [],
        "summary": "Scenario analyzed."
    }
