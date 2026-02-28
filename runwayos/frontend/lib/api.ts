export interface StartupSnapshot {
  currency: string;
  cash: number;
  monthly_expenses: number;
  monthly_revenue: number;
  expense_growth_rate_monthly: number;
  revenue_growth_rate_monthly: number;
  fragility_q: number;
}

export interface Project {
  project_id: string;
  name: string;
  start_month: number;
  duration_months: number;
  monthly_cost: number;
  exec_rho: number;
}

export interface SimulationConfig {
  horizon_months: number;
  n_sims: number;
  seed: number;
  include_projects: boolean;
}

export interface FundraisingPolicy {
  lead_time_months_min: number;
  lead_time_months_max: number;
  target_ruin_prob_alpha: number;
  post_close_buffer_months: number;
}

export interface Scenario {
  scenario_id: string;
  name: string;
  base_expense_multiplier: number;
  base_revenue_multiplier: number;
  exclude_project_ids: string[];
  delay_projects_by_months: Record<string, number>;
}

export interface SimulateRequest {
  startup: StartupSnapshot;
  projects: Project[];
  config: SimulationConfig;
  policy: FundraisingPolicy;
}

export interface CompareScenariosRequest extends SimulateRequest {
  scenarios: Scenario[];
}

export interface SimulationSummary {
  ruin_prob_horizon: number;
  cash_p50_end: number;
  cash_p5_end: number;
  cash_p95_end: number;
  median_ruin_month_if_ruined: number | null;
}

export interface CashPercentiles {
  months: number[];
  p5: number[];
  p50: number[];
  p95: number[];
}

export interface RuinProbabilitySeries {
  months: number[];
  p_ruin: number[];
}

export interface RaisePolicyDiagnostics {
  months: number[];
  p_die_before_close_by_s: number[];
  p_buffer_fail_by_s: number[];
  min_p_die_before_close: number;
  min_p_buffer_fail: number;
  extra: Record<string, unknown>;
}

export interface SimulateResponse {
  meta: {
    horizon_months: number;
    n_sims: number;
    seed: number;
  };
  cash_percentiles: CashPercentiles;
  ruin_probability_by_month: RuinProbabilitySeries;
  summary: SimulationSummary;
  raise_recommendation: {
    raise_by_month: number | null;
    policy: FundraisingPolicy;
    diagnostics: RaisePolicyDiagnostics;
  };
}

export interface ScenarioOutcome {
  scenario_id: string;
  name: string;
  summary: SimulationSummary;
  raise_by_month: number | null;
  rank: number | null;
}

export interface CompareScenariosResponse {
  baseline: ScenarioOutcome;
  results: ScenarioOutcome[];
}

export class ApiError extends Error {
  status: number;
  details: unknown;

  constructor(message: string, status: number, details: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
}

async function postJson<TResponse>(
  path: string,
  payload: unknown
): Promise<TResponse> {
  const response = await fetch(`/api/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    cache: "no-store"
  });
  const text = await response.text();
  const parsed = text ? safeParseJson(text) : null;
  if (!response.ok) {
    throw new ApiError(
      `Request failed with status ${response.status}`,
      response.status,
      parsed
    );
  }
  return parsed as TResponse;
}

function safeParseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

export function runSimulation(
  payload: SimulateRequest
): Promise<SimulateResponse> {
  return postJson<SimulateResponse>("v1/simulate", payload);
}

export function compareScenarios(
  payload: CompareScenariosRequest
): Promise<CompareScenariosResponse> {
  return postJson<CompareScenariosResponse>("v1/scenarios/compare", payload);
}

export function makeSafeDemoPayload(): SimulateRequest {
  return {
    startup: {
      currency: "GBP",
      cash: 300000.0,
      monthly_expenses: 40000.0,
      monthly_revenue: 10000.0,
      expense_growth_rate_monthly: 0.01,
      revenue_growth_rate_monthly: 0.02,
      fragility_q: 0.0
    },
    projects: [
      {
        project_id: "proj_marketing",
        name: "Marketing Revamp",
        start_month: 2,
        duration_months: 4,
        monthly_cost: 8000.0,
        exec_rho: 0.2
      },
      {
        project_id: "proj_mobile",
        name: "Mobile MVP",
        start_month: 6,
        duration_months: 5,
        monthly_cost: 12000.0,
        exec_rho: 0.3
      }
    ],
    config: {
      horizon_months: 24,
      n_sims: 20000,
      seed: 42,
      include_projects: true
    },
    policy: {
      lead_time_months_min: 3,
      lead_time_months_max: 6,
      target_ruin_prob_alpha: 0.05,
      post_close_buffer_months: 6.0
    }
  };
}

export function makeRiskyDemoPayload(): SimulateRequest {
  return {
    startup: {
      currency: "GBP",
      cash: 120000.0,
      monthly_expenses: 55000.0,
      monthly_revenue: 5000.0,
      expense_growth_rate_monthly: 0.01,
      revenue_growth_rate_monthly: 0.01,
      fragility_q: 0.6
    },
    projects: [
      {
        project_id: "proj_platform",
        name: "Platform Rebuild",
        start_month: 1,
        duration_months: 6,
        monthly_cost: 18000.0,
        exec_rho: 0.8
      }
    ],
    config: {
      horizon_months: 24,
      n_sims: 20000,
      seed: 42,
      include_projects: true
    },
    policy: {
      lead_time_months_min: 3,
      lead_time_months_max: 6,
      target_ruin_prob_alpha: 0.05,
      post_close_buffer_months: 6.0
    }
  };
}
