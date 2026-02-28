from __future__ import annotations

import json


def safe_payload() -> dict:
    return {
        "startup": {
            "currency": "GBP",
            "cash": 300000.0,
            "monthly_expenses": 40000.0,
            "monthly_revenue": 10000.0,
            "expense_growth_rate_monthly": 0.01,
            "revenue_growth_rate_monthly": 0.02,
            "fragility_q": 0.0,
        },
        "projects": [
            {
                "project_id": "proj_marketing",
                "name": "Marketing Revamp",
                "start_month": 2,
                "duration_months": 4,
                "monthly_cost": 8000.0,
                "exec_rho": 0.2,
            },
            {
                "project_id": "proj_mobile",
                "name": "Mobile MVP",
                "start_month": 6,
                "duration_months": 5,
                "monthly_cost": 12000.0,
                "exec_rho": 0.3,
            },
        ],
        "config": {
            "horizon_months": 24,
            "n_sims": 20000,
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


def risky_payload() -> dict:
    return {
        "startup": {
            "currency": "GBP",
            "cash": 120000.0,
            "monthly_expenses": 55000.0,
            "monthly_revenue": 5000.0,
            "expense_growth_rate_monthly": 0.01,
            "revenue_growth_rate_monthly": 0.01,
            "fragility_q": 0.6,
        },
        "projects": [
            {
                "project_id": "proj_platform",
                "name": "Platform Rebuild",
                "start_month": 1,
                "duration_months": 6,
                "monthly_cost": 18000.0,
                "exec_rho": 0.8,
            }
        ],
        "config": {
            "horizon_months": 24,
            "n_sims": 20000,
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


if __name__ == "__main__":
    print("### SAFE_PAYLOAD")
    print(json.dumps(safe_payload(), indent=2))
    print()
    print("### RISKY_PAYLOAD")
    print(json.dumps(risky_payload(), indent=2))

