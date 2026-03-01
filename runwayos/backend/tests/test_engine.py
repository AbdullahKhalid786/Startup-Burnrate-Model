from __future__ import annotations

import numpy as np

from runwayos.schemas import Project, SimulationConfig, StartupSnapshot
from runwayos.sim.engine import run_simulation


def _sample_startup() -> StartupSnapshot:
    return StartupSnapshot(
        currency="GBP",
        cash=300000.0,
        monthly_expenses=40000.0,
        monthly_revenue=10000.0,
        expense_growth_rate_monthly=0.01,
        revenue_growth_rate_monthly=0.02,
        fragility_q=0.2,
    )


def _sample_projects() -> list[Project]:
    return [
        Project(
            project_id="p1",
            name="Feature A",
            start_month=1,
            duration_months=4,
            monthly_cost=12000.0,
            exec_rho=0.2,
        ),
        Project(
            project_id="p2",
            name="Feature B",
            start_month=6,
            duration_months=3,
            monthly_cost=8000.0,
            exec_rho=0.4,
        ),
    ]


def test_engine_deterministic_seed() -> None:
    startup = _sample_startup()
    projects = _sample_projects()
    config = SimulationConfig(horizon_months=24, n_sims=2000, seed=123)

    run1 = run_simulation(
        startup,
        projects,
        config,
        np.random.Generator(np.random.PCG64(config.seed)),
    )
    run2 = run_simulation(
        startup,
        projects,
        config,
        np.random.Generator(np.random.PCG64(config.seed)),
    )

    assert run1.cash_percentiles["p5"] == run2.cash_percentiles["p5"]
    assert run1.cash_percentiles["p50"] == run2.cash_percentiles["p50"]
    assert run1.cash_percentiles["p95"] == run2.cash_percentiles["p95"]


def test_ruin_probability_monotone() -> None:
    startup = _sample_startup()
    projects = _sample_projects()
    config = SimulationConfig(horizon_months=24, n_sims=3000, seed=99)
    run = run_simulation(
        startup,
        projects,
        config,
        np.random.Generator(np.random.PCG64(config.seed)),
    )
    p_ruin = np.array(run.ruin_probability_by_month["p_ruin"])
    assert np.all(np.diff(p_ruin) >= -1e-12)

