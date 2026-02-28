"use client";

import { CompareScenariosResponse } from "@/lib/api";

interface ScenarioCompareTableProps {
  data: CompareScenariosResponse;
}

function formatMoney(value: number) {
  return value.toLocaleString(undefined, {
    maximumFractionDigits: 0
  });
}

export default function ScenarioCompareTable({ data }: ScenarioCompareTableProps) {
  const rows = [...data.results].sort((a, b) => {
    const rankA = a.rank ?? Number.MAX_SAFE_INTEGER;
    const rankB = b.rank ?? Number.MAX_SAFE_INTEGER;
    return rankA - rankB;
  });

  return (
    <div className="card p-4">
      <div className="mb-3 text-sm font-semibold text-slate-700">Scenario Ranking</div>
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left">
              <th className="py-2 pr-4">Rank</th>
              <th className="py-2 pr-4">Scenario</th>
              <th className="py-2 pr-4">Ruin @ Horizon</th>
              <th className="py-2 pr-4">Cash P50 End</th>
              <th className="py-2 pr-4">Raise By</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-slate-100 bg-emerald-50/40">
              <td className="py-2 pr-4 font-medium">-</td>
              <td className="py-2 pr-4 font-medium">Baseline</td>
              <td className="py-2 pr-4">
                {(data.baseline.summary.ruin_prob_horizon * 100).toFixed(2)}%
              </td>
              <td className="py-2 pr-4">{formatMoney(data.baseline.summary.cash_p50_end)}</td>
              <td className="py-2 pr-4">
                {data.baseline.raise_by_month ?? "No safe month"}
              </td>
            </tr>
            {rows.map((row) => (
              <tr key={row.scenario_id} className="border-b border-slate-100">
                <td className="py-2 pr-4">{row.rank ?? "-"}</td>
                <td className="py-2 pr-4">{row.name}</td>
                <td className="py-2 pr-4">
                  {(row.summary.ruin_prob_horizon * 100).toFixed(2)}%
                </td>
                <td className="py-2 pr-4">{formatMoney(row.summary.cash_p50_end)}</td>
                <td className="py-2 pr-4">{row.raise_by_month ?? "No safe month"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
