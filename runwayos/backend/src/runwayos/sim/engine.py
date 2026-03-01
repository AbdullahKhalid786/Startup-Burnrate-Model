from __future__ import annotations

from dataclasses import dataclass

import numpy as np

from runwayos.schemas import Project, SimulationConfig, SimulationSummary, StartupSnapshot
from runwayos.utils.stats import (
    compute_cash_percentiles,
    compute_ruin_probability_by_month,
    median_ruin_month_if_ruined,
)


def _clamp(value: float, lower: float, upper: float) -> float:
    return max(lower, min(value, upper))


def _sample_lognormal_from_mean(
    rng: np.random.Generator, mean: float, sigma: float, size: int
) -> np.ndarray:
    stabilized_mean = max(mean, 1e-9)
    stabilized_sigma = max(sigma, 1e-9)
    mu = np.log(stabilized_mean) - 0.5 * (stabilized_sigma**2)
    samples = rng.lognormal(mean=mu, sigma=stabilized_sigma, size=size)
    return samples.astype(np.float64)


def _project_cost_matrix(
    startup: StartupSnapshot,
    projects: list[Project],
    config: SimulationConfig,
    rng: np.random.Generator,
) -> np.ndarray:
    n_sims = config.n_sims
    horizon = config.horizon_months
    costs = np.zeros((n_sims, horizon), dtype=np.float64)
    if not config.include_projects or not projects:
        return costs

    q = startup.fragility_q
    for project in projects:
        rho = project.exec_rho
        lam_slip = 0.2 + 1.5 * rho
        slip = np.clip(rng.poisson(lam=lam_slip, size=n_sims), 0, 6).astype(np.int64)

        mean_mi = 1.0 + 0.6 * rho + 0.3 * q
        sigma_mi = 0.10 + 0.25 * rho + 0.15 * q
        m_i = _sample_lognormal_from_mean(rng, mean_mi, sigma_mi, n_sims)

        start = project.start_month + slip
        monthly_cost = project.monthly_cost * m_i

        for offset in range(project.duration_months):
            month_idx = start + offset
            mask = month_idx < horizon
            if np.any(mask):
                costs[mask, month_idx[mask]] += monthly_cost[mask]

    return costs


def _base_revenue_expense_series(
    startup: StartupSnapshot, horizon_months: int
) -> tuple[np.ndarray, np.ndarray]:
    months = np.arange(horizon_months + 1, dtype=np.float64)
    revenue = startup.monthly_revenue * np.power(1.0 + startup.revenue_growth_rate_monthly, months)
    expenses = startup.monthly_expenses * np.power(
        1.0 + startup.expense_growth_rate_monthly, months
    )
    return revenue, expenses


@dataclass(frozen=True)
class SimulationRun:
    cash_paths: np.ndarray
    cash_percentiles: dict[str, list[float]]
    ruin_probability_by_month: dict[str, list[float]]
    summary: SimulationSummary
    base_revenue_by_month: np.ndarray
    base_expense_by_month: np.ndarray


def simulate_cash_paths(
    startup: StartupSnapshot,
    projects: list[Project],
    config: SimulationConfig,
    rng: np.random.Generator,
) -> np.ndarray:
    n_sims = config.n_sims
    horizon = config.horizon_months
    cash_paths = np.empty((n_sims, horizon + 1), dtype=np.float64)
    cash_paths[:, 0] = startup.cash

    q = startup.fragility_q
    mean_u = _clamp(1.0 - 0.4 * q, 0.05, 1.2)
    sigma_u = 0.10 + 0.25 * q
    u = _sample_lognormal_from_mean(rng, mean_u, sigma_u, n_sims)

    mean_m_base = 1.0 + 0.2 * q
    sigma_m_base = 0.05 + 0.10 * q
    m_base = _sample_lognormal_from_mean(rng, mean_m_base, sigma_m_base, n_sims)

    months = np.arange(horizon, dtype=np.float64)
    revenue_by_month = startup.monthly_revenue * np.power(
        1.0 + startup.revenue_growth_rate_monthly, months
    )
    expense_by_month = startup.monthly_expenses * np.power(
        1.0 + startup.expense_growth_rate_monthly, months
    )
    project_costs = _project_cost_matrix(startup, projects, config, rng)

    monthly_delta = (
        revenue_by_month[None, :] * u[:, None]
        - expense_by_month[None, :] * m_base[:, None]
        - project_costs
    )
    cash_paths[:, 1:] = startup.cash + np.cumsum(monthly_delta, axis=1)
    return cash_paths


def run_simulation(
    startup: StartupSnapshot,
    projects: list[Project],
    config: SimulationConfig,
    rng: np.random.Generator,
) -> SimulationRun:
    cash_paths = simulate_cash_paths(startup, projects, config, rng)
    cash_percentiles = compute_cash_percentiles(cash_paths)
    ruin_probability_by_month = compute_ruin_probability_by_month(cash_paths)
    median_ruin_month = median_ruin_month_if_ruined(cash_paths)
    summary = SimulationSummary(
        ruin_prob_horizon=float(ruin_probability_by_month["p_ruin"][-1]),
        cash_p50_end=float(cash_percentiles["p50"][-1]),
        cash_p5_end=float(cash_percentiles["p5"][-1]),
        cash_p95_end=float(cash_percentiles["p95"][-1]),
        median_ruin_month_if_ruined=median_ruin_month,
    )
    base_revenue_by_month, base_expense_by_month = _base_revenue_expense_series(
        startup, config.horizon_months
    )
    return SimulationRun(
        cash_paths=cash_paths,
        cash_percentiles=cash_percentiles,
        ruin_probability_by_month=ruin_probability_by_month,
        summary=summary,
        base_revenue_by_month=base_revenue_by_month,
        base_expense_by_month=base_expense_by_month,
    )

