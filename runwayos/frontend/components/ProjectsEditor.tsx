"use client";

import { Project } from "@/lib/api";

interface ProjectsEditorProps {
  projects: Project[];
  horizonMonths: number;
  onChange: (projects: Project[]) => void;
}

function makeProjectId() {
  return `proj_${Math.random().toString(36).slice(2, 8)}`;
}

export default function ProjectsEditor({
  projects,
  horizonMonths,
  onChange
}: ProjectsEditorProps) {
  const updateProject = <K extends keyof Project>(
    index: number,
    key: K,
    value: Project[K]
  ) => {
    const next = [...projects];
    next[index] = { ...next[index], [key]: value };
    onChange(next);
  };

  const addProject = () => {
    onChange([
      ...projects,
      {
        project_id: makeProjectId(),
        name: "New Project",
        start_month: 0,
        duration_months: 3,
        monthly_cost: 5000,
        exec_rho: 0.2
      }
    ]);
  };

  const removeProject = (idx: number) => {
    onChange(projects.filter((_, i) => i !== idx));
  };

  return (
    <section className="card p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">Projects</h2>
        <button className="btn btn-ghost" onClick={addProject} type="button">
          Add project
        </button>
      </div>
      <div className="mt-4 space-y-4">
        {projects.length === 0 ? (
          <p className="text-sm text-slate-600">
            No projects yet. Add one to model execution risk and project burn.
          </p>
        ) : null}
        {projects.map((project, idx) => (
          <div
            key={project.project_id}
            className="rounded-xl border border-slate-200 bg-white p-4"
          >
            <div className="flex items-center justify-between">
              <div className="mono text-xs text-slate-500">{project.project_id}</div>
              <button
                className="rounded-md border border-rose-300 px-2 py-1 text-xs text-rose-700"
                onClick={() => removeProject(idx)}
                type="button"
              >
                Remove
              </button>
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <label className="text-sm">
                Name
                <input
                  className="input mt-1"
                  value={project.name}
                  onChange={(e) => updateProject(idx, "name", e.target.value)}
                />
              </label>
              <label className="text-sm">
                Start Month
                <input
                  className="input mt-1"
                  type="number"
                  min={0}
                  max={Math.max(0, horizonMonths - 1)}
                  value={project.start_month}
                  onChange={(e) =>
                    updateProject(idx, "start_month", Number(e.target.value))
                  }
                />
              </label>
              <label className="text-sm">
                Duration (months)
                <input
                  className="input mt-1"
                  type="number"
                  min={1}
                  value={project.duration_months}
                  onChange={(e) =>
                    updateProject(idx, "duration_months", Number(e.target.value))
                  }
                />
              </label>
              <label className="text-sm">
                Monthly Cost
                <input
                  className="input mt-1"
                  type="number"
                  min={0}
                  value={project.monthly_cost}
                  onChange={(e) =>
                    updateProject(idx, "monthly_cost", Number(e.target.value))
                  }
                />
              </label>
            </div>
            <div className="mt-3">
              <label className="text-sm font-medium">
                Exec rho: <span className="mono">{project.exec_rho.toFixed(2)}</span>
              </label>
              <input
                className="mt-2 w-full accent-amber-600"
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={project.exec_rho}
                onChange={(e) =>
                  updateProject(idx, "exec_rho", Number(e.target.value))
                }
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
