from __future__ import annotations

from dataclasses import dataclass

import numpy as np

from runwayos.schemas import FundraisingPolicy, RaisePolicyDiagnostics, SimulationConfig


@dataclass(frozen=True)
class PolicyResult:
    raise_by_month: int | None
    diagnostics: RaisePolicyDiagnostics


def recommend_raise_by_month(
    cash_paths: np.ndarray,
    base_revenue_by_month: np.ndarray,
    base_expense_by_month: np.ndarray,
    config: SimulationConfig,
    policy: FundraisingPolicy,
    rng: np.random.Generator,
    diagnostics_cap_months: int = 24,
) -> PolicyResult:
    n_sims = config.n_sims
    horizon = config.horizon_months
    min_prefix = np.minimum.accumulate(cash_paths, axis=1)
    sim_idx = np.arange(n_sims, dtype=np.int64)

    net_burn_by_month = np.maximum(base_expense_by_month - base_revenue_by_month, 0.0)

    p_die_before_close_by_s: list[float] = []
    p_buffer_fail_by_s: list[float] = []
    raise_by_month: int | None = None

    for start_month in range(horizon):
        lead_times = rng.integers(
            policy.lead_time_months_min,
            policy.lead_time_months_max + 1,
            size=n_sims,
        )
        close_month = np.minimum(start_month + lead_times, horizon).astype(np.int64)

        min_to_close = np.take_along_axis(min_prefix, close_month[:, None], axis=1).ravel()
        die_before_close = min_to_close < 0.0

        cash_at_close = cash_paths[sim_idx, close_month]
        net_burn_at_close = net_burn_by_month[close_month]
        required_buffer = policy.post_close_buffer_months * net_burn_at_close
        buffer_fail = (net_burn_at_close > 0.0) & (cash_at_close < required_buffer)

        p_die = float(np.mean(die_before_close))
        p_buffer = float(np.mean(buffer_fail))
        p_die_before_close_by_s.append(p_die)
        p_buffer_fail_by_s.append(p_buffer)

        if (
            raise_by_month is None
            and p_die <= policy.target_ruin_prob_alpha
            and p_buffer <= policy.target_ruin_prob_alpha
        ):
            raise_by_month = start_month

    diag_len = min(horizon, diagnostics_cap_months)
    diagnostics = RaisePolicyDiagnostics(
        months=list(range(diag_len)),
        p_die_before_close_by_s=p_die_before_close_by_s[:diag_len],
        p_buffer_fail_by_s=p_buffer_fail_by_s[:diag_len],
        min_p_die_before_close=float(min(p_die_before_close_by_s)),
        min_p_buffer_fail=float(min(p_buffer_fail_by_s)),
        extra={"searched_start_months": horizon},
    )
    return PolicyResult(raise_by_month=raise_by_month, diagnostics=diagnostics)
