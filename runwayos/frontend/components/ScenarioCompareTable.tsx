"use client";

import { CompareScenariosResponse } from "@/lib/api";

interface ScenarioCompareTableProps {
  data: CompareScenariosResponse;
  currency: string;
}

function formatMoney(value: number, currency: string) {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      maximumFractionDigits: 0
    }).format(value);
  } catch {
    return value.toLocaleString(undefined, { maximumFractionDigits: 0 });
  }
}

export default function ScenarioCompareTable({
  data,
  currency
}: ScenarioCompareTableProps) {
  const rows = [...data.results].sort((a, b) => {
    const rankA = a.rank ?? Number.MAX_SAFE_INTEGER;
    const rankB = b.rank ?? Number.MAX_SAFE_INTEGER;
    return rankA - rankB;
  });

  return (
    <div className="card p-4">
      <div className="mb-3 text-sm font-semibold text-slate-700">Compare Results</div>
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left">
              <th className="py-2 pr-4">Rank</th>
              <th className="py-2 pr-4">Scenario</th>
              <th className="py-2 pr-4">Raise By</th>
              <th className="py-2 pr-4">Raise Amount</th>
              <th className="py-2 pr-4">Ruin @ Horizon</th>
              <th className="py-2 pr-4">Cash P50 End</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-slate-100 bg-emerald-50/40">
              <td className="py-2 pr-4 font-medium">-</td>
              <td className="py-2 pr-4 font-medium">Baseline</td>
              <td className="py-2 pr-4">
                {data.baseline.raise_by_month ?? "No safe month"}
              </td>
              <td className="py-2 pr-4">
                {data.baseline.recommended_raise_amount === null
                  ? "N/A"
                  : formatMoney(data.baseline.recommended_raise_amount, currency)}
              </td>
              <td className="py-2 pr-4">
                {(data.baseline.summary.ruin_prob_horizon * 100).toFixed(2)}%
              </td>
              <td className="py-2 pr-4">{formatMoney(data.baseline.summary.cash_p50_end, currency)}</td>
            </tr>
            {rows.map((row) => (
              <tr key={row.scenario_id} className="border-b border-slate-100 odd:bg-slate-50/60">
                <td className="py-2 pr-4">{row.rank ?? "-"}</td>
                <td className="py-2 pr-4">{row.name}</td>
                <td className="py-2 pr-4">{row.raise_by_month ?? "No safe month"}</td>
                <td className="py-2 pr-4">
                  {row.recommended_raise_amount === null
                    ? "N/A"
                    : formatMoney(row.recommended_raise_amount, currency)}
                </td>
                <td className="py-2 pr-4">
                  {(row.summary.ruin_prob_horizon * 100).toFixed(2)}%
                </td>
                <td className="py-2 pr-4">{formatMoney(row.summary.cash_p50_end, currency)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
