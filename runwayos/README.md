# RunwayOS (Phase 0 + Phase 1)

RunwayOS is a risk-aware runway simulator for startups. This repo includes:

- Monte Carlo cash trajectory simulation
- Cash fan chart percentiles (`p5`, `p50`, `p95`)
- Ruin probability curve `P(cash < 0 by month t)`
- Raise-by month recommendation under fundraising policy constraints
- Recommended raise amount at chosen raise-by month (quantile-based capital need)
- Scenario transforms and scenario comparison API

No ML models are used in this phase. Optional priors (`fragility_q`, `exec_rho`) are accepted and used in heuristic uncertainty sampling.

Policy semantics: `raise_by_month` is the latest safe fundraising start month
within the horizon (a deadline), not the earliest month.
`recommended_raise_amount` is the estimated capital required at close for the
selected policy quantile (default `1 - alpha`).

## Prerequisites

- Linux
- Python 3.11+
- `pip` and `venv`
- Node.js 18+ and npm (for frontend demo UI)

## Setup

```bash
cd runwayos
python3 -m venv .venv
source .venv/bin/activate
pip install -U pip
pip install -e "backend[dev]"
```

## Run

```bash
make dev
```

Backend starts at `http://127.0.0.1:8000`.
Frontend (Next.js) runs at `http://localhost:3000`.

Health check:

```bash
curl http://127.0.0.1:8000/health
```

## Test

```bash
make test
```

## Format and Lint

```bash
make fmt
make lint
```

## Frontend Setup (Demo UI)

```bash
cd frontend
npm install
npm run dev
```

The frontend uses a Next.js rewrite proxy:

- Browser calls `/api/...` on `http://localhost:3000`
- Next.js forwards to backend `http://127.0.0.1:8000/...`

No FastAPI CORS middleware changes are needed for local demo.

## Run Backend + Frontend Together

Terminal 1:

```bash
cd runwayos
source .venv/bin/activate
make dev
```

Terminal 2:

```bash
cd runwayos/frontend
npm install
npm run dev
```

Then open `http://localhost:3000`.

Demo flow:

1. Click `Load Safe Demo`, then `Run Simulation`.
2. Review key metrics, Raise Plan card (raise-by + recommended raise amount), fan chart, and ruin curve.
3. Click `Load Risky Demo`, then `Run Simulation` to compare behavior.
4. Configure/edit scenarios, then click `Compare Scenarios` to render ranked table with raise amounts.

## Demo Payloads

Generate two example JSON payloads (safe and risky):

```bash
python backend/scripts/demo_payloads.py
```

## `/v1/simulate` sample calls

Safe payload:

```bash
cat > /tmp/runway_safe.json <<'JSON'
{
  "startup": {
    "currency": "GBP",
    "cash": 300000.0,
    "monthly_expenses": 40000.0,
    "monthly_revenue": 10000.0,
    "expense_growth_rate_monthly": 0.01,
    "revenue_growth_rate_monthly": 0.02,
    "fragility_q": 0.0
  },
  "projects": [
    {
      "project_id": "proj_marketing",
      "name": "Marketing Revamp",
      "start_month": 2,
      "duration_months": 4,
      "monthly_cost": 8000.0,
      "exec_rho": 0.2
    },
    {
      "project_id": "proj_mobile",
      "name": "Mobile MVP",
      "start_month": 6,
      "duration_months": 5,
      "monthly_cost": 12000.0,
      "exec_rho": 0.3
    }
  ],
  "config": {
    "horizon_months": 24,
    "n_sims": 20000,
    "seed": 42,
    "include_projects": true
  },
  "policy": {
    "lead_time_months_min": 3,
    "lead_time_months_max": 6,
    "target_ruin_prob_alpha": 0.05,
    "post_close_buffer_months": 6.0
  }
}
JSON

curl -sS -X POST http://127.0.0.1:8000/v1/simulate \
  -H "Content-Type: application/json" \
  -d @/tmp/runway_safe.json
```

Risky payload:

```bash
cat > /tmp/runway_risky.json <<'JSON'
{
  "startup": {
    "currency": "GBP",
    "cash": 120000.0,
    "monthly_expenses": 55000.0,
    "monthly_revenue": 5000.0,
    "expense_growth_rate_monthly": 0.01,
    "revenue_growth_rate_monthly": 0.01,
    "fragility_q": 0.6
  },
  "projects": [
    {
      "project_id": "proj_platform",
      "name": "Platform Rebuild",
      "start_month": 1,
      "duration_months": 6,
      "monthly_cost": 18000.0,
      "exec_rho": 0.8
    }
  ],
  "config": {
    "horizon_months": 24,
    "n_sims": 20000,
    "seed": 42,
    "include_projects": true
  },
  "policy": {
    "lead_time_months_min": 3,
    "lead_time_months_max": 6,
    "target_ruin_prob_alpha": 0.05,
    "post_close_buffer_months": 6.0
  }
}
JSON

curl -sS -X POST http://127.0.0.1:8000/v1/simulate \
  -H "Content-Type: application/json" \
  -d @/tmp/runway_risky.json
```

## `/v1/scenarios/compare` sample call

```bash
cat > /tmp/runway_compare.json <<'JSON'
{
  "startup": {
    "currency": "GBP",
    "cash": 300000.0,
    "monthly_expenses": 40000.0,
    "monthly_revenue": 10000.0,
    "expense_growth_rate_monthly": 0.01,
    "revenue_growth_rate_monthly": 0.02,
    "fragility_q": 0.2
  },
  "projects": [
    {
      "project_id": "proj_a",
      "name": "Project A",
      "start_month": 1,
      "duration_months": 4,
      "monthly_cost": 10000.0,
      "exec_rho": 0.3
    }
  ],
  "config": {
    "horizon_months": 24,
    "n_sims": 10000,
    "seed": 42,
    "include_projects": true
  },
  "policy": {
    "lead_time_months_min": 3,
    "lead_time_months_max": 6,
    "target_ruin_prob_alpha": 0.05,
    "post_close_buffer_months": 6.0
  },
  "scenarios": [
    {
      "scenario_id": "cut_burn",
      "name": "Reduce burn by 15%",
      "base_expense_multiplier": 0.85,
      "base_revenue_multiplier": 1.0,
      "exclude_project_ids": [],
      "delay_projects_by_months": {}
    },
    {
      "scenario_id": "delay_project",
      "name": "Delay Project A by 2 months",
      "base_expense_multiplier": 1.0,
      "base_revenue_multiplier": 1.0,
      "exclude_project_ids": [],
      "delay_projects_by_months": {
        "proj_a": 2
      }
    }
  ]
}
JSON

curl -sS -X POST http://127.0.0.1:8000/v1/scenarios/compare \
  -H "Content-Type: application/json" \
  -d @/tmp/runway_compare.json
```
