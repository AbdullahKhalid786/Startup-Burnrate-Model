"use client";

import { StartupSnapshot } from "@/lib/api";

interface StartupFormProps {
  startup: StartupSnapshot;
  onChange: (startup: StartupSnapshot) => void;
}

export default function StartupForm({ startup, onChange }: StartupFormProps) {
  const update = <K extends keyof StartupSnapshot>(
    key: K,
    value: StartupSnapshot[K]
  ) => {
    onChange({ ...startup, [key]: value });
  };

  return (
    <section className="card p-5">
      <h2 className="text-lg font-bold">Startup</h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <label className="text-sm">
          Currency
          <input
            className="input mt-1"
            value={startup.currency}
            onChange={(e) => update("currency", e.target.value)}
          />
        </label>
        <label className="text-sm">
          Cash
          <input
            className="input mt-1"
            type="number"
            min={0}
            value={startup.cash}
            onChange={(e) => update("cash", Number(e.target.value))}
          />
        </label>
        <label className="text-sm">
          Monthly Expenses
          <input
            className="input mt-1"
            type="number"
            min={0}
            value={startup.monthly_expenses}
            onChange={(e) => update("monthly_expenses", Number(e.target.value))}
          />
        </label>
        <label className="text-sm">
          Monthly Revenue
          <input
            className="input mt-1"
            type="number"
            min={0}
            value={startup.monthly_revenue}
            onChange={(e) => update("monthly_revenue", Number(e.target.value))}
          />
        </label>
        <label className="text-sm">
          Expense Growth (monthly)
          <input
            className="input mt-1"
            type="number"
            step="0.001"
            value={startup.expense_growth_rate_monthly}
            onChange={(e) =>
              update("expense_growth_rate_monthly", Number(e.target.value))
            }
          />
        </label>
        <label className="text-sm">
          Revenue Growth (monthly)
          <input
            className="input mt-1"
            type="number"
            step="0.001"
            value={startup.revenue_growth_rate_monthly}
            onChange={(e) =>
              update("revenue_growth_rate_monthly", Number(e.target.value))
            }
          />
        </label>
      </div>
      <div className="mt-4">
        <label className="text-sm font-medium">
          Fragility q: <span className="mono">{startup.fragility_q.toFixed(2)}</span>
        </label>
        <input
          className="mt-2 w-full accent-teal-700"
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={startup.fragility_q}
          onChange={(e) => update("fragility_q", Number(e.target.value))}
        />
      </div>
    </section>
  );
}
