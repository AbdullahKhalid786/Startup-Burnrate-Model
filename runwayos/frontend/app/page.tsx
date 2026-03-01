"use client";

import { useMemo, useState } from "react";

import PolicyForm from "@/components/PolicyForm";
import ProjectsEditor from "@/components/ProjectsEditor";
import ResultsPanel from "@/components/ResultsPanel";
import ScenarioEditor from "@/components/ScenarioEditor";
import StartupForm from "@/components/StartupForm";
import {
  ApiError,
  CompareScenariosResponse,
  FundraisingPolicy,
  Project,
  Scenario,
  SimulateResponse,
  SimulationConfig,
  StartupSnapshot,
  compareScenarios,
  makeRiskyDemoPayload,
  makeSafeDemoPayload,
  runSimulation
} from "@/lib/api";

function defaultScenarios(projects: Project[]): Scenario[] {
  if (projects.length === 0) {
    return [];
  }
  const first = projects[0];
  return [
    {
      scenario_id: "cut_burn",
      name: "Reduce burn by 15%",
      base_expense_multiplier: 0.85,
      base_revenue_multiplier: 1.0,
      exclude_project_ids: [],
      delay_projects_by_months: {}
    },
    {
      scenario_id: "delay_first_project",
      name: "Delay first project by 2 months",
      base_expense_multiplier: 1.0,
      base_revenue_multiplier: 1.0,
      exclude_project_ids: [],
      delay_projects_by_months: {
        [first.project_id]: 2
      }
    }
  ];
}

function simulationValidation(
  startup: StartupSnapshot,
  projects: Project[],
  config: SimulationConfig,
  policy: FundraisingPolicy
): string[] {
  const errors: string[] = [];
  if (startup.cash <= 0) errors.push("Cash must be > 0.");
  if (startup.monthly_expenses < 0) errors.push("Monthly expenses must be >= 0.");
  if (startup.monthly_revenue < 0) errors.push("Monthly revenue must be >= 0.");
  if (startup.fragility_q < 0 || startup.fragility_q > 1) errors.push("fragility_q must be in [0,1].");
  if (config.horizon_months < 1 || config.horizon_months > 60) errors.push("horizon_months must be in [1,60].");
  if (config.n_sims < 1000 || config.n_sims > 100000) errors.push("n_sims must be in [1000,100000].");
  if (policy.lead_time_months_min < 0) errors.push("lead_time_months_min must be >= 0.");
  if (policy.lead_time_months_max < policy.lead_time_months_min) {
    errors.push("lead_time_months_max must be >= lead_time_months_min.");
  }
  if (policy.target_ruin_prob_alpha <= 0 || policy.target_ruin_prob_alpha >= 1) {
    errors.push("target_ruin_prob_alpha must be in (0,1).");
  }
  if (policy.post_close_buffer_months < 0) {
    errors.push("post_close_buffer_months must be >= 0.");
  }
  if (
    policy.raise_amount_quantile !== null &&
    (policy.raise_amount_quantile <= 0 || policy.raise_amount_quantile >= 1)
  ) {
    errors.push("raise_amount_quantile must be in (0,1) when provided.");
  }
  if (policy.raise_amount_cap !== null && policy.raise_amount_cap < 0) {
    errors.push("raise_amount_cap must be >= 0.");
  }
  if (policy.raise_amount_floor !== null && policy.raise_amount_floor < 0) {
    errors.push("raise_amount_floor must be >= 0.");
  }
  if (
    policy.raise_amount_cap !== null &&
    policy.raise_amount_floor !== null &&
    policy.raise_amount_floor > policy.raise_amount_cap
  ) {
    errors.push("raise_amount_floor must be <= raise_amount_cap.");
  }

  const ids = new Set<string>();
  projects.forEach((p, idx) => {
    if (!p.project_id.trim()) errors.push(`Project ${idx + 1}: project_id required.`);
    if (ids.has(p.project_id)) errors.push(`Duplicate project_id: ${p.project_id}`);
    ids.add(p.project_id);
    if (p.start_month < 0 || p.start_month >= config.horizon_months) {
      errors.push(`Project ${p.project_id}: start_month must be in [0, horizon-1].`);
    }
    if (p.duration_months < 1) errors.push(`Project ${p.project_id}: duration_months must be >= 1.`);
    if (p.monthly_cost < 0) errors.push(`Project ${p.project_id}: monthly_cost must be >= 0.`);
    if (p.exec_rho < 0 || p.exec_rho > 1) errors.push(`Project ${p.project_id}: exec_rho must be in [0,1].`);
  });

  return errors;
}

function scenariosValidation(scenarios: Scenario[]): string[] {
  const errors: string[] = [];
  if (scenarios.length < 2 || scenarios.length > 4) {
    errors.push("For compare, define 2 to 4 scenarios.");
  }
  const ids = new Set<string>();
  scenarios.forEach((s) => {
    if (!s.scenario_id.trim()) errors.push("Each scenario_id is required.");
    if (ids.has(s.scenario_id)) errors.push(`Duplicate scenario_id: ${s.scenario_id}`);
    ids.add(s.scenario_id);
    if (s.base_expense_multiplier < 0) {
      errors.push(`${s.scenario_id}: base_expense_multiplier must be >= 0.`);
    }
    if (s.base_revenue_multiplier < 0) {
      errors.push(`${s.scenario_id}: base_revenue_multiplier must be >= 0.`);
    }
    Object.entries(s.delay_projects_by_months).forEach(([projectId, delay]) => {
      if (delay < 0) errors.push(`${s.scenario_id}: delay for ${projectId} must be >= 0.`);
    });
  });
  return errors;
}

function stringifyError(error: unknown): string {
  if (error instanceof ApiError) {
    return JSON.stringify(
      {
        message: error.message,
        status: error.status,
        details: error.details
      },
      null,
      2
    );
  }
  if (error instanceof Error) {
    return error.message;
  }
  return JSON.stringify(error, null, 2);
}

export default function Page() {
  const safe = useMemo(() => makeSafeDemoPayload(), []);
  const [startup, setStartup] = useState<StartupSnapshot>(safe.startup);
  const [projects, setProjects] = useState<Project[]>(safe.projects);
  const [config, setConfig] = useState<SimulationConfig>(safe.config);
  const [policy, setPolicy] = useState<FundraisingPolicy>(safe.policy);
  const [scenarios, setScenarios] = useState<Scenario[]>(defaultScenarios(safe.projects));

  const [simulationResult, setSimulationResult] = useState<SimulateResponse | null>(null);
  const [compareResult, setCompareResult] = useState<CompareScenariosResponse | null>(null);
  const [loadingSimulation, setLoadingSimulation] = useState(false);
  const [loadingCompare, setLoadingCompare] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadSafeDemo = () => {
    const payload = makeSafeDemoPayload();
    setStartup(payload.startup);
    setProjects(payload.projects);
    setConfig(payload.config);
    setPolicy(payload.policy);
    setScenarios(defaultScenarios(payload.projects));
    setErrorMessage(null);
  };

  const loadRiskyDemo = () => {
    const payload = makeRiskyDemoPayload();
    setStartup(payload.startup);
    setProjects(payload.projects);
    setConfig(payload.config);
    setPolicy(payload.policy);
    setScenarios(defaultScenarios(payload.projects));
    setErrorMessage(null);
  };

  const handleRunSimulation = async () => {
    const errors = simulationValidation(startup, projects, config, policy);
    if (errors.length > 0) {
      setErrorMessage(errors.join("\n"));
      return;
    }
    setLoadingSimulation(true);
    setErrorMessage(null);
    try {
      const result = await runSimulation({ startup, projects, config, policy });
      setSimulationResult(result);
    } catch (error) {
      setErrorMessage(stringifyError(error));
    } finally {
      setLoadingSimulation(false);
    }
  };

  const handleCompare = async () => {
    const baseErrors = simulationValidation(startup, projects, config, policy);
    const scenarioErrors = scenariosValidation(scenarios);
    const errors = [...baseErrors, ...scenarioErrors];
    if (errors.length > 0) {
      setErrorMessage(errors.join("\n"));
      return;
    }
    setLoadingCompare(true);
    setErrorMessage(null);
    try {
      const result = await compareScenarios({
        startup,
        projects,
        config,
        policy,
        scenarios
      });
      setCompareResult(result);
    } catch (error) {
      setErrorMessage(stringifyError(error));
    } finally {
      setLoadingCompare(false);
    }
  };

  return (
    <main className="mx-auto max-w-[1550px] px-4 py-6 md:px-6">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Runway Dashboard</h1>
        </div>
        <div className="flex gap-2">
          <button type="button" className="btn btn-ghost" onClick={loadSafeDemo}>
            Load Safe Demo
          </button>
          <button type="button" className="btn btn-ghost" onClick={loadRiskyDemo}>
            Load Risky Demo
          </button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[0.92fr_1.28fr]">
        <section className="space-y-4 lg:sticky lg:top-4 lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto lg:pr-1">
          <StartupForm startup={startup} onChange={setStartup} />
          <ProjectsEditor
            projects={projects}
            horizonMonths={config.horizon_months}
            onChange={setProjects}
          />

          <section className="card p-5">
            <h2 className="text-lg font-bold">Simulation</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              <label className="text-sm">
                Horizon Months (1-60)
                <input
                  className="input mt-1"
                  type="number"
                  min={1}
                  max={60}
                  value={config.horizon_months}
                  onChange={(e) =>
                    setConfig({ ...config, horizon_months: Number(e.target.value) })
                  }
                />
              </label>
              <label className="text-sm">
                Simulations (1000-100000)
                <input
                  className="input mt-1"
                  type="number"
                  min={1000}
                  max={100000}
                  step={1000}
                  value={config.n_sims}
                  onChange={(e) =>
                    setConfig({ ...config, n_sims: Number(e.target.value) })
                  }
                />
              </label>
              <label className="text-sm">
                Seed
                <input
                  className="input mt-1"
                  type="number"
                  value={config.seed}
                  onChange={(e) => setConfig({ ...config, seed: Number(e.target.value) })}
                />
              </label>
              <label className="flex items-center gap-2 pt-6 text-sm">
                <input
                  type="checkbox"
                  checked={config.include_projects}
                  onChange={(e) =>
                    setConfig({ ...config, include_projects: e.target.checked })
                  }
                />
                Include project costs
              </label>
            </div>
          </section>

          <PolicyForm policy={policy} onChange={setPolicy} />
          <ScenarioEditor
            scenarios={scenarios}
            projects={projects}
            onChange={setScenarios}
          />

          <section className="card p-5">
            <div className="grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleRunSimulation}
                disabled={loadingSimulation || loadingCompare}
              >
                Run Simulation
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleCompare}
                disabled={loadingSimulation || loadingCompare}
              >
                Compare Scenarios
              </button>
            </div>
          </section>
        </section>

        <ResultsPanel
          simulation={simulationResult}
          comparison={compareResult}
          currency={startup.currency}
          loadingSimulation={loadingSimulation}
          loadingCompare={loadingCompare}
          errorMessage={errorMessage}
        />
      </div>
    </main>
  );
}
