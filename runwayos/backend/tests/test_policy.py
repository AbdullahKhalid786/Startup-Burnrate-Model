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
    assert stable_policy_result.raise_by_month is not None
    assert stable_policy_result.raise_by_month == config.horizon_months - 1
    assert (
        stable_policy_result.diagnostics.extra.get("earliest_safe_start_month")
        == 0
    )
    assert (
        stable_policy_result.diagnostics.extra.get("latest_safe_start_month")
        == config.horizon_months - 1
    )

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
    earliest_safe = fragile_policy_result.diagnostics.extra.get(
        "earliest_safe_start_month"
    )
    assert isinstance(earliest_safe, int)
    assert fragile_policy_result.raise_by_month >= earliest_safe


def test_raise_amount_present_when_raise_by_found() -> None:
    startup = StartupSnapshot(
        cash=600000.0,
        monthly_expenses=45000.0,
        monthly_revenue=15000.0,
        fragility_q=0.1,
    )
    config = SimulationConfig(horizon_months=24, n_sims=3000, seed=1234)
    policy = FundraisingPolicy(
        lead_time_months_min=2,
        lead_time_months_max=4,
        target_ruin_prob_alpha=0.15,
        post_close_buffer_months=6.0,
        enforce_nonnegative_post_close=True,
    )

    rng1 = np.random.Generator(np.random.PCG64(config.seed))
    run1 = run_simulation(startup, [], config, rng1)
    result1 = recommend_raise_by_month(
        cash_paths=run1.cash_paths,
        base_revenue_by_month=run1.base_revenue_by_month,
        base_expense_by_month=run1.base_expense_by_month,
        config=config,
        policy=policy,
        rng=rng1,
    )
    assert result1.raise_by_month is not None
    assert result1.recommended_raise_amount is not None
    assert result1.recommended_raise_amount >= 0.0
    assert result1.amount_percentiles is not None
    assert result1.amount_percentiles["p95"] >= result1.amount_percentiles["p50"]
    assert result1.amount_percentiles["p99"] >= result1.amount_percentiles["p95"]

    rng2 = np.random.Generator(np.random.PCG64(config.seed))
    run2 = run_simulation(startup, [], config, rng2)
    result2 = recommend_raise_by_month(
        cash_paths=run2.cash_paths,
        base_revenue_by_month=run2.base_revenue_by_month,
        base_expense_by_month=run2.base_expense_by_month,
        config=config,
        policy=policy,
        rng=rng2,
    )
    assert result1.recommended_raise_amount == result2.recommended_raise_amount


def test_raise_amount_monotonic_trend_sanity() -> None:
    horizon = 12
    n_sims = 1000
    months = np.arange(horizon + 1, dtype=np.float64)
    deterministic_cash = 400.0 - 10.0 * months
    cash_paths = np.tile(deterministic_cash, (n_sims, 1))

    base_revenue = np.zeros(horizon + 1, dtype=np.float64)
    base_expenses = np.full(horizon + 1, 20.0, dtype=np.float64)
    config = SimulationConfig(horizon_months=horizon, n_sims=n_sims, seed=5)
    policy = FundraisingPolicy(
        lead_time_months_min=1,
        lead_time_months_max=1,
        target_ruin_prob_alpha=0.2,
        post_close_buffer_months=6.0,
        enforce_nonnegative_post_close=False,
        raise_amount_quantile=0.95,
    )

    result = recommend_raise_by_month(
        cash_paths=cash_paths,
        base_revenue_by_month=base_revenue,
        base_expense_by_month=base_expenses,
        config=config,
        policy=policy,
        rng=np.random.Generator(np.random.PCG64(config.seed)),
    )

    values = [
        value
        for value in result.diagnostics.raise_amount_star_by_s
        if value is not None
    ]
    diffs = np.diff(np.array(values))
    assert np.all(diffs >= -1e-9)


def test_cap_blocks_late_s() -> None:
    horizon = 14
    n_sims = 1000
    months = np.arange(horizon + 1, dtype=np.float64)
    deterministic_cash = 150.0 - 5.0 * months
    cash_paths = np.tile(deterministic_cash, (n_sims, 1))

    base_revenue = np.zeros(horizon + 1, dtype=np.float64)
    base_expenses = np.full(horizon + 1, 20.0, dtype=np.float64)
    config = SimulationConfig(horizon_months=horizon, n_sims=n_sims, seed=11)

    no_cap_policy = FundraisingPolicy(
        lead_time_months_min=1,
        lead_time_months_max=1,
        target_ruin_prob_alpha=0.2,
        post_close_buffer_months=6.0,
        enforce_nonnegative_post_close=False,
        raise_amount_quantile=0.95,
    )
    no_cap_result = recommend_raise_by_month(
        cash_paths=cash_paths,
        base_revenue_by_month=base_revenue,
        base_expense_by_month=base_expenses,
        config=config,
        policy=no_cap_policy,
        rng=np.random.Generator(np.random.PCG64(config.seed)),
    )
    assert no_cap_result.raise_by_month is not None

    cap_policy = no_cap_policy.model_copy(update={"raise_amount_cap": 30.0})
    cap_result = recommend_raise_by_month(
        cash_paths=cash_paths,
        base_revenue_by_month=base_revenue,
        base_expense_by_month=base_expenses,
        config=config,
        policy=cap_policy,
        rng=np.random.Generator(np.random.PCG64(config.seed)),
    )

    if cap_result.raise_by_month is not None:
        assert cap_result.raise_by_month < no_cap_result.raise_by_month
    else:
        assert cap_result.recommended_raise_amount is None
