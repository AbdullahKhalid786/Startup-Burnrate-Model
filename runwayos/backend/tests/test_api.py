from __future__ import annotations

from fastapi.testclient import TestClient

from runwayos.app import app

client = TestClient(app)


def test_api_smoke() -> None:
    health_resp = client.get("/health")
    assert health_resp.status_code == 200
    assert health_resp.json() == {"status": "ok"}

    payload = {
        "startup": {
            "currency": "GBP",
            "cash": 300000,
            "monthly_expenses": 40000,
            "monthly_revenue": 10000,
            "expense_growth_rate_monthly": 0.01,
            "revenue_growth_rate_monthly": 0.02,
            "fragility_q": 0.1,
        },
        "projects": [
            {
                "project_id": "proj_a",
                "name": "Project A",
                "start_month": 1,
                "duration_months": 4,
                "monthly_cost": 12000,
                "exec_rho": 0.3,
            }
        ],
        "config": {
            "horizon_months": 12,
            "n_sims": 1000,
            "seed": 42,
            "include_projects": True,
        },
        "policy": {
            "lead_time_months_min": 3,
            "lead_time_months_max": 6,
            "target_ruin_prob_alpha": 0.05,
            "post_close_buffer_months": 6.0,
        },
    }
    sim_resp = client.post("/v1/simulate", json=payload)
    assert sim_resp.status_code == 200
    data = sim_resp.json()
    assert "meta" in data
    assert "cash_percentiles" in data
    assert "ruin_probability_by_month" in data
    assert "summary" in data
    assert "raise_recommendation" in data

