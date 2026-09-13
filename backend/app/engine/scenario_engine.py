from sqlalchemy.orm import Session

def run_scenario(db: Session, org_id: int, scenario_type: str, parameters: dict) -> dict:
    # Simplified simulation
    return {
        "scenario_type": scenario_type,
        "parameters": parameters,
        "original": {"metric": 100},
        "simulated": {"metric": 120},
        "deltas": [{"metric": "metric", "original": 100, "simulated": 120, "change": 20}],
        "summary": "Simulation complete."
    }
