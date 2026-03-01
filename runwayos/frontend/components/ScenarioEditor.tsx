"use client";

import { Project, Scenario } from "@/lib/api";

interface ScenarioEditorProps {
  scenarios: Scenario[];
  projects: Project[];
  onChange: (scenarios: Scenario[]) => void;
}

function makeScenarioId() {
  return `scenario_${Math.random().toString(36).slice(2, 7)}`;
}

export default function ScenarioEditor({
  scenarios,
  projects,
  onChange
}: ScenarioEditorProps) {
  const updateScenario = <K extends keyof Scenario>(
    index: number,
    key: K,
    value: Scenario[K]
  ) => {
    const next = [...scenarios];
    next[index] = { ...next[index], [key]: value };
    onChange(next);
  };

  const addScenario = () => {
    if (scenarios.length >= 4) {
      return;
    }
    onChange([
      ...scenarios,
      {
        scenario_id: makeScenarioId(),
        name: `Scenario ${scenarios.length + 1}`,
        base_expense_multiplier: 1,
        base_revenue_multiplier: 1,
        exclude_project_ids: [],
        delay_projects_by_months: {}
      }
    ]);
  };

  const removeScenario = (index: number) => {
    onChange(scenarios.filter((_, i) => i !== index));
  };

  const toggleExcludedProject = (idx: number, projectId: string) => {
    const current = scenarios[idx];
    const exists = current.exclude_project_ids.includes(projectId);
    const nextExcluded = exists
      ? current.exclude_project_ids.filter((id) => id !== projectId)
      : [...current.exclude_project_ids, projectId];
    updateScenario(idx, "exclude_project_ids", nextExcluded);
  };

  const setProjectDelay = (idx: number, projectId: string, delay: number) => {
    const current = scenarios[idx];
    const nextDelays = { ...current.delay_projects_by_months };
    if (delay <= 0) {
      delete nextDelays[projectId];
    } else {
      nextDelays[projectId] = delay;
    }
    updateScenario(idx, "delay_projects_by_months", nextDelays);
  };

  return (
    <section className="card p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">Scenarios</h2>
        <button
          className="btn btn-ghost"
          type="button"
          onClick={addScenario}
          disabled={scenarios.length >= 4}
        >
          Add scenario
        </button>
      </div>
      <div className="mt-4 space-y-4">
        {scenarios.length === 0 ? (
          <p className="text-sm text-slate-600">No scenarios configured yet.</p>
        ) : null}
        {scenarios.map((scenario, idx) => (
          <div
            key={scenario.scenario_id}
            className="rounded-xl border border-slate-200 bg-white p-4"
          >
            <div className="flex items-center justify-between">
              <span className="mono text-xs text-slate-500">{scenario.scenario_id}</span>
              <button
                className="rounded-md border border-rose-300 px-2 py-1 text-xs text-rose-700"
                type="button"
                onClick={() => removeScenario(idx)}
              >
                Remove
              </button>
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              <label className="text-sm">
                Name
                <input
                  className="input mt-1"
                  value={scenario.name}
                  onChange={(e) => updateScenario(idx, "name", e.target.value)}
                />
              </label>
              <label className="text-sm">
                Expense Multiplier
                <input
                  className="input mt-1"
                  type="number"
                  min={0}
                  step="0.01"
                  value={scenario.base_expense_multiplier}
                  onChange={(e) =>
                    updateScenario(
                      idx,
                      "base_expense_multiplier",
                      Number(e.target.value)
                    )
                  }
                />
              </label>
              <label className="text-sm">
                Revenue Multiplier
                <input
                  className="input mt-1"
                  type="number"
                  min={0}
                  step="0.01"
                  value={scenario.base_revenue_multiplier}
                  onChange={(e) =>
                    updateScenario(
                      idx,
                      "base_revenue_multiplier",
                      Number(e.target.value)
                    )
                  }
                />
              </label>
            </div>
            <div className="mt-4 space-y-2">
              <div className="text-sm font-semibold">Exclude Projects</div>
              <div className="grid gap-2 sm:grid-cols-2">
                {projects.map((project) => (
                  <label
                    key={project.project_id}
                    className="flex items-center gap-2 rounded-lg border border-slate-200 px-2 py-1 text-sm"
                  >
                    <input
                      type="checkbox"
                      checked={scenario.exclude_project_ids.includes(project.project_id)}
                      onChange={() => toggleExcludedProject(idx, project.project_id)}
                    />
                    <span>{project.name || project.project_id}</span>
                  </label>
                ))}
                {projects.length === 0 ? (
                  <p className="text-xs text-slate-500">No projects available.</p>
                ) : null}
              </div>
            </div>
            <div className="mt-4 space-y-2">
              <div className="text-sm font-semibold">Project Delays (months)</div>
              <div className="grid gap-2 sm:grid-cols-2">
                {projects.map((project) => (
                  <label key={project.project_id} className="text-sm">
                    {project.name || project.project_id}
                    <input
                      className="input mt-1"
                      type="number"
                      min={0}
                      step={1}
                      value={scenario.delay_projects_by_months[project.project_id] ?? 0}
                      onChange={(e) =>
                        setProjectDelay(
                          idx,
                          project.project_id,
                          Number(e.target.value)
                        )
                      }
                    />
                  </label>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
