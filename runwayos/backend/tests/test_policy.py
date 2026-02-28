from __future__ import annotations

import numpy as np

from runwayos.schemas import FundraisingPolicy, SimulationConfig, StartupSnapshot
from runwayos.sim.engine import run_simulation
from runwayos.sim.policy import recommend_raise_by_month


def test_raise_by_basic() -> None:
    stable_startup = StartupSnapshot(
        cash=2000000.0,
        monthly_expenses=20000.0,
        monthly_revenue=19000.0,
    )
    config = SimulationConfig(horizon_months=24, n_sims=2000, seed=777)
    policy = FundraisingPolicy(
        lead_time_months_min=3,
        lead_time_months_max=6,
        target_ruin_prob_alpha=0.05,
        post_close_buffer_months=6.0,
    )
    rng_stable = np.random.Generator(np.random.PCG64(config.seed))
    stable_run = run_simulation(stable_startup, [], config, rng_stable)
    stable_policy_result = recommend_raise_by_month(
        cash_paths=stable_run.cash_paths,
        base_revenue_by_month=stable_run.base_revenue_by_month,
        base_expense_by_month=stable_run.base_expense_by_month,
        config=config,
        policy=policy,
        rng=rng_stable,
    )
    assert stable_policy_result.raise_by_month in {0, None}

    fragile_startup = StartupSnapshot(
        cash=300000.0,
        monthly_expenses=70000.0,
        monthly_revenue=20000.0,
    )
    high_alpha_policy = FundraisingPolicy(
        lead_time_months_min=3,
        lead_time_months_max=6,
        target_ruin_prob_alpha=0.8,
        post_close_buffer_months=1.0,
    )
    rng_fragile = np.random.Generator(np.random.PCG64(config.seed))
    fragile_run = run_simulation(fragile_startup, [], config, rng_fragile)
    fragile_policy_result = recommend_raise_by_month(
        cash_paths=fragile_run.cash_paths,
        base_revenue_by_month=fragile_run.base_revenue_by_month,
        base_expense_by_month=fragile_run.base_expense_by_month,
        config=config,
        policy=high_alpha_policy,
        rng=rng_fragile,
    )
    assert fragile_policy_result.raise_by_month is not None
    assert fragile_policy_result.raise_by_month <= 2
