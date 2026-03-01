from __future__ import annotations

from dataclasses import dataclass

import numpy as np

from runwayos.schemas import FundraisingPolicy, RaisePolicyDiagnostics, SimulationConfig


@dataclass(frozen=True)
class PolicyResult:
    raise_by_month: int | None
    recommended_raise_amount: float | None
    recommended_raise_amount_quantile: float
    amount_percentiles: dict[str, float] | None
    close_month_summary: dict[str, int] | None
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
    suffix_min = np.minimum.accumulate(cash_paths[:, ::-1], axis=1)[:, ::-1]
    sim_idx = np.arange(n_sims, dtype=np.int64)

    net_burn_by_month = np.maximum(base_expense_by_month - base_revenue_by_month, 0.0)
    alpha = policy.target_ruin_prob_alpha
    q_amount = (
        policy.raise_amount_quantile
        if policy.raise_amount_quantile is not None
        else (1.0 - alpha)
    )
    raise_floor = (
        policy.raise_amount_floor if policy.raise_amount_floor is not None else 0.0
    )
    raise_cap = policy.raise_amount_cap

    p_die_before_close_by_s: list[float] = []
    p_buffer_fail_by_s: list[float] = []
    raise_amount_p95_by_s: list[float | None] = []
    raise_amount_star_by_s: list[float | None] = []
    safe_start_months: list[int] = []
    amount_percentiles_by_s: list[dict[str, float] | None] = []
    close_month_summary_by_s: list[dict[str, int]] = []

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

        close_month_summary_by_s.append(
            {
                "p50": int(np.quantile(close_month, 0.50)),
                "p95": int(np.quantile(close_month, 0.95)),
            }
        )

        survivors = ~die_before_close
        survivors_count = int(np.count_nonzero(survivors))
        if survivors_count == 0:
            raise_amount_p95_by_s.append(None)
            raise_amount_star_by_s.append(None)
            amount_percentiles_by_s.append(None)
            continue

        if policy.enforce_nonnegative_post_close:
            min_post_close = suffix_min[sim_idx, close_month]
            a_nonneg = -min_post_close
        else:
            a_nonneg = np.zeros(n_sims, dtype=np.float64)

        a_buffer = required_buffer - cash_at_close
        a_req = np.maximum(np.maximum(a_buffer, a_nonneg), 0.0)
        a_req_survivors = a_req[survivors]

        raw_star = float(np.quantile(a_req_survivors, q_amount))
        raw_p50 = float(np.quantile(a_req_survivors, 0.50))
        raw_p95 = float(np.quantile(a_req_survivors, 0.95))
        raw_p99 = float(np.quantile(a_req_survivors, 0.99))

        star = max(raw_star, raise_floor)
        p50 = max(raw_p50, raise_floor)
        p95 = max(raw_p95, raise_floor)
        p99 = max(raw_p99, raise_floor)

        cap_allows = raise_cap is None or star <= raise_cap
        is_feasible = p_die <= alpha and cap_allows

        if is_feasible:
            safe_start_months.append(start_month)
            raise_amount_p95_by_s.append(p95)
            raise_amount_star_by_s.append(star)
        else:
            raise_amount_p95_by_s.append(None)
            raise_amount_star_by_s.append(None)

        amount_percentiles_by_s.append({"p50": p50, "p95": p95, "p99": p99})

    raise_by_month = max(safe_start_months) if safe_start_months else None
    recommended_raise_amount = (
        raise_amount_star_by_s[raise_by_month] if raise_by_month is not None else None
    )
    amount_percentiles = (
        amount_percentiles_by_s[raise_by_month] if raise_by_month is not None else None
    )
    close_month_summary = (
        close_month_summary_by_s[raise_by_month] if raise_by_month is not None else None
    )

    diag_len = min(horizon, diagnostics_cap_months)
    diagnostics = RaisePolicyDiagnostics(
        months=list(range(diag_len)),
        p_die_before_close_by_s=p_die_before_close_by_s[:diag_len],
        p_buffer_fail_by_s=p_buffer_fail_by_s[:diag_len],
        raise_amount_p95_by_s=raise_amount_p95_by_s[:diag_len],
        raise_amount_star_by_s=raise_amount_star_by_s[:diag_len],
        min_p_die_before_close=float(min(p_die_before_close_by_s)),
        min_p_buffer_fail=float(min(p_buffer_fail_by_s)),
        extra={
            "searched_start_months": horizon,
            "safe_start_month_count": len(safe_start_months),
            "earliest_safe_start_month": min(safe_start_months) if safe_start_months else None,
            "latest_safe_start_month": raise_by_month,
            "raise_amount_quantile_used": q_amount,
            "raise_amount_cap": raise_cap,
            "raise_amount_floor": raise_floor,
            "enforce_nonnegative_post_close": policy.enforce_nonnegative_post_close,
        },
    )
    return PolicyResult(
        raise_by_month=raise_by_month,
        recommended_raise_amount=recommended_raise_amount,
        recommended_raise_amount_quantile=q_amount,
        amount_percentiles=amount_percentiles,
        close_month_summary=close_month_summary,
        diagnostics=diagnostics,
    )
