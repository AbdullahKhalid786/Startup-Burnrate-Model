from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field, model_validator


class StartupSnapshot(BaseModel):
    currency: str = "GBP"
    cash: float = Field(..., gt=0)
    monthly_expenses: float = Field(..., ge=0)
    monthly_revenue: float = Field(default=0.0, ge=0)
    expense_growth_rate_monthly: float = 0.0
    revenue_growth_rate_monthly: float = 0.0
    fragility_q: float = Field(default=0.0, ge=0, le=1)


class Project(BaseModel):
    project_id: str
    name: str
    start_month: int = Field(..., ge=0)
    duration_months: int = Field(..., ge=1)
    monthly_cost: float = Field(..., ge=0)
    exec_rho: float = Field(default=0.0, ge=0, le=1)


class SimulationConfig(BaseModel):
    horizon_months: int = Field(default=24, ge=1, le=60)
    n_sims: int = Field(default=20000, ge=1000, le=100000)
    seed: int = 42
    include_projects: bool = True


class FundraisingPolicy(BaseModel):
    lead_time_months_min: int = Field(default=3, ge=0)
    lead_time_months_max: int = Field(default=6, ge=0)
    target_ruin_prob_alpha: float = Field(default=0.05, gt=0, lt=1)
    post_close_buffer_months: float = Field(default=6.0, ge=0)
    raise_amount_quantile: float | None = Field(default=None)
    enforce_nonnegative_post_close: bool = True
    raise_amount_cap: float | None = Field(default=None, ge=0)
    raise_amount_floor: float | None = Field(default=0.0, ge=0)

    @model_validator(mode="after")
    def validate_lead_time_window(self) -> FundraisingPolicy:
        if self.lead_time_months_max < self.lead_time_months_min:
            raise ValueError("lead_time_months_max must be >= lead_time_months_min")
        if self.raise_amount_quantile is not None and not (
            0 < self.raise_amount_quantile < 1
        ):
            raise ValueError("raise_amount_quantile must be in (0,1) when provided")
        if (
            self.raise_amount_cap is not None
            and self.raise_amount_floor is not None
            and self.raise_amount_floor > self.raise_amount_cap
        ):
            raise ValueError("raise_amount_floor must be <= raise_amount_cap")
        return self


class Scenario(BaseModel):
    scenario_id: str
    name: str
    base_expense_multiplier: float = Field(default=1.0, ge=0)
    base_revenue_multiplier: float = Field(default=1.0, ge=0)
    exclude_project_ids: list[str] = Field(default_factory=list)
    delay_projects_by_months: dict[str, int] = Field(default_factory=dict)

    @model_validator(mode="after")
    def validate_delays(self) -> Scenario:
        if any(delay < 0 for delay in self.delay_projects_by_months.values()):
            raise ValueError("delay_projects_by_months values must be >= 0")
        return self


class SimulateRequest(BaseModel):
    startup: StartupSnapshot
    projects: list[Project] = Field(default_factory=list)
    config: SimulationConfig = Field(default_factory=SimulationConfig)
    policy: FundraisingPolicy = Field(default_factory=FundraisingPolicy)

    @model_validator(mode="after")
    def validate_project_ids_and_bounds(self) -> SimulateRequest:
        project_ids = [project.project_id for project in self.projects]
        if len(project_ids) != len(set(project_ids)):
            raise ValueError("project_id values must be unique")
        horizon = self.config.horizon_months
        if any(project.start_month >= horizon for project in self.projects):
            raise ValueError("project.start_month must be in 0..horizon-1")
        return self


class CompareScenariosRequest(BaseModel):
    startup: StartupSnapshot
    projects: list[Project] = Field(default_factory=list)
    config: SimulationConfig = Field(default_factory=SimulationConfig)
    policy: FundraisingPolicy = Field(default_factory=FundraisingPolicy)
    scenarios: list[Scenario] = Field(default_factory=list)

    @model_validator(mode="after")
    def validate_request(self) -> CompareScenariosRequest:
        project_ids = [project.project_id for project in self.projects]
        if len(project_ids) != len(set(project_ids)):
            raise ValueError("project_id values must be unique")
        horizon = self.config.horizon_months
        if any(project.start_month >= horizon for project in self.projects):
            raise ValueError("project.start_month must be in 0..horizon-1")
        scenario_ids = [scenario.scenario_id for scenario in self.scenarios]
        if len(scenario_ids) != len(set(scenario_ids)):
            raise ValueError("scenario_id values must be unique")
        return self


class CashPercentiles(BaseModel):
    months: list[int]
    p5: list[float]
    p50: list[float]
    p95: list[float]


class RuinProbabilitySeries(BaseModel):
    months: list[int]
    p_ruin: list[float]


class SimulationSummary(BaseModel):
    ruin_prob_horizon: float
    cash_p50_end: float
    cash_p5_end: float
    cash_p95_end: float
    median_ruin_month_if_ruined: int | None


class RaisePolicyDiagnostics(BaseModel):
    months: list[int]
    p_die_before_close_by_s: list[float]
    p_buffer_fail_by_s: list[float]
    raise_amount_p95_by_s: list[float | None]
    raise_amount_star_by_s: list[float | None]
    min_p_die_before_close: float
    min_p_buffer_fail: float
    extra: dict[str, Any] = Field(default_factory=dict)


class RaiseAmountPercentiles(BaseModel):
    p50: float
    p95: float
    p99: float


class CloseMonthSummary(BaseModel):
    p50: int
    p95: int


class RaiseRecommendation(BaseModel):
    raise_by_month: int | None
    recommended_raise_amount: float | None
    recommended_raise_amount_quantile: float
    amount_percentiles: RaiseAmountPercentiles | None
    close_month_summary: CloseMonthSummary | None
    policy: FundraisingPolicy
    diagnostics: RaisePolicyDiagnostics


class SimulationMeta(BaseModel):
    horizon_months: int
    n_sims: int
    seed: int


class SimulationResponse(BaseModel):
    meta: SimulationMeta
    cash_percentiles: CashPercentiles
    ruin_probability_by_month: RuinProbabilitySeries
    summary: SimulationSummary
    raise_recommendation: RaiseRecommendation


class ScenarioOutcome(BaseModel):
    scenario_id: str
    name: str
    summary: SimulationSummary
    raise_by_month: int | None
    recommended_raise_amount: float | None
    rank: int | None = None


class CompareScenariosResponse(BaseModel):
    baseline: ScenarioOutcome
    results: list[ScenarioOutcome]
