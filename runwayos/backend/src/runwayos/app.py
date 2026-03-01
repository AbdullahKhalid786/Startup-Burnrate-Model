from __future__ import annotations

import numpy as np
from fastapi import FastAPI

from runwayos.schemas import (
    CashPercentiles,
    CloseMonthSummary,
    CompareScenariosRequest,
    CompareScenariosResponse,
    FundraisingPolicy,
    Project,
    RaiseAmountPercentiles,
    RaiseRecommendation,
    RuinProbabilitySeries,
    ScenarioOutcome,
    SimulateRequest,
    SimulationConfig,
    SimulationMeta,
    SimulationResponse,
    StartupSnapshot,
)
from runwayos.sim.engine import run_simulation
from runwayos.sim.policy import recommend_raise_by_month
from runwayos.sim.scenarios import apply_scenario
from runwayos.state import STATE

app = FastAPI(title="RunwayOS", version="0.1.0")


def _run_one_simulation(
    startup: StartupSnapshot,
    projects: list[Project],
    config: SimulationConfig,
    policy: FundraisingPolicy,
    seed_override: int | None = None,
) -> SimulationResponse:
    seed = config.seed if seed_override is None else seed_override
    rng = np.random.Generator(np.random.PCG64(seed))
    sim_run = run_simulation(startup, projects, config, rng)
    policy_result = recommend_raise_by_month(
        cash_paths=sim_run.cash_paths,
        base_revenue_by_month=sim_run.base_revenue_by_month,
        base_expense_by_month=sim_run.base_expense_by_month,
        config=config,
        policy=policy,
        rng=rng,
    )
    return SimulationResponse(
        meta=SimulationMeta(
            horizon_months=config.horizon_months,
            n_sims=config.n_sims,
            seed=seed,
        ),
        cash_percentiles=CashPercentiles(**sim_run.cash_percentiles),
        ruin_probability_by_month=RuinProbabilitySeries(**sim_run.ruin_probability_by_month),
        summary=sim_run.summary,
        raise_recommendation=RaiseRecommendation(
            raise_by_month=policy_result.raise_by_month,
            recommended_raise_amount=policy_result.recommended_raise_amount,
            recommended_raise_amount_quantile=policy_result.recommended_raise_amount_quantile,
            amount_percentiles=(
                RaiseAmountPercentiles(**policy_result.amount_percentiles)
                if policy_result.amount_percentiles is not None
                else None
            ),
            close_month_summary=(
                CloseMonthSummary(**policy_result.close_month_summary)
                if policy_result.close_month_summary is not None
                else None
            ),
            policy=policy,
            diagnostics=policy_result.diagnostics,
        ),
    )


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/v1/simulate", response_model=SimulationResponse)
def simulate(request: SimulateRequest) -> SimulationResponse:
    response = _run_one_simulation(
        startup=request.startup,
        projects=request.projects,
        config=request.config,
        policy=request.policy,
    )
    STATE.latest_simulation = response.model_dump(mode="json")
    return response


@app.post("/v1/scenarios/compare", response_model=CompareScenariosResponse)
def compare_scenarios(request: CompareScenariosRequest) -> CompareScenariosResponse:
    baseline_response = _run_one_simulation(
        startup=request.startup,
        projects=request.projects,
        config=request.config,
        policy=request.policy,
    )
    baseline = ScenarioOutcome(
        scenario_id="baseline",
        name="Baseline",
        summary=baseline_response.summary,
        raise_by_month=baseline_response.raise_recommendation.raise_by_month,
        recommended_raise_amount=baseline_response.raise_recommendation.recommended_raise_amount,
    )

    scenario_results: list[ScenarioOutcome] = []
    for scenario in request.scenarios:
        startup_modified, projects_modified = apply_scenario(
            request.startup, request.projects, scenario
        )
        scenario_response = _run_one_simulation(
            startup=startup_modified,
            projects=projects_modified,
            config=request.config,
            policy=request.policy,
        )
        scenario_results.append(
            ScenarioOutcome(
                scenario_id=scenario.scenario_id,
                name=scenario.name,
                summary=scenario_response.summary,
                raise_by_month=scenario_response.raise_recommendation.raise_by_month,
                recommended_raise_amount=scenario_response.raise_recommendation.recommended_raise_amount,
            )
        )

    ranked = sorted(
        enumerate(scenario_results),
        key=lambda idx_item: (
            idx_item[1].summary.ruin_prob_horizon,
            -idx_item[1].summary.cash_p50_end,
        ),
    )
    for rank, (original_idx, _) in enumerate(ranked, start=1):
        scenario_results[original_idx].rank = rank

    response = CompareScenariosResponse(baseline=baseline, results=scenario_results)
    STATE.latest_compare = response.model_dump(mode="json")
    return response
