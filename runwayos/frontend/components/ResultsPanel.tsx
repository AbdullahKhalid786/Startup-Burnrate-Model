"use client";

import {
  CompareScenariosResponse,
  SimulateResponse
} from "@/lib/api";

import FanChart from "./FanChart";
import RaiseAmountTradeoffChart from "./RaiseAmountTradeoffChart";
import RuinCurveChart from "./RuinCurveChart";
import ScenarioCompareTable from "./ScenarioCompareTable";

interface ResultsPanelProps {
  simulation: SimulateResponse | null;
  comparison: CompareScenariosResponse | null;
  loadingSimulation: boolean;
  loadingCompare: boolean;
  errorMessage: string | null;
}

function formatMoney(value: number) {
  return value.toLocaleString(undefined, { maximumFractionDigits: 0 });
}

export default function ResultsPanel({
  simulation,
  comparison,
  loadingSimulation,
  loadingCompare,
  errorMessage
}: ResultsPanelProps) {
  const metrics = simulation?.summary ?? comparison?.baseline.summary;
  const raiseBy =
    simulation?.raise_recommendation.raise_by_month ??
    comparison?.baseline.raise_by_month;
  const recommendedRaiseAmount =
    simulation?.raise_recommendation.recommended_raise_amount ??
    comparison?.baseline.recommended_raise_amount ??
    null;
  const amountPercentiles = simulation?.raise_recommendation.amount_percentiles ?? null;
  const amountQuantile = simulation?.raise_recommendation.recommended_raise_amount_quantile;
  const closeMonthSummary = simulation?.raise_recommendation.close_month_summary ?? null;

  return (
    <section className="space-y-5">
      {(loadingSimulation || loadingCompare) && (
        <div className="card p-4 text-sm text-slate-700">
          Running simulation...
        </div>
      )}
      {errorMessage ? (
        <div className="card border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
          <div className="font-semibold">Request failed</div>
          <pre className="mt-2 overflow-x-auto whitespace-pre-wrap text-xs">
            {errorMessage}
          </pre>
        </div>
      ) : null}

      {metrics ? (
        <div className="grid gap-4 md:grid-cols-3">
          <div className="card p-4">
            <div className="text-xs uppercase tracking-wide text-slate-500">
              Ruin Prob @ Horizon
            </div>
            <div className="mt-2 text-2xl font-bold text-rose-700">
              {(metrics.ruin_prob_horizon * 100).toFixed(2)}%
            </div>
          </div>
          <div className="card p-4">
            <div className="text-xs uppercase tracking-wide text-slate-500">
              Cash P50 End
            </div>
            <div className="mt-2 text-2xl font-bold text-teal-700">
              {formatMoney(metrics.cash_p50_end)}
            </div>
          </div>
          <div className="card p-4">
            <div className="text-xs uppercase tracking-wide text-slate-500">
              Raise By Month (Latest Safe)
            </div>
            <div className="mt-2 text-xl font-bold text-slate-900">
              {raiseBy === null ? "No safe raise-by within horizon" : raiseBy}
            </div>
          </div>
        </div>
      ) : (
        <div className="card p-5 text-sm text-slate-600">
          Run a simulation to see metrics and charts.
        </div>
      )}

      {simulation ? (
        <>
          <div className="card p-5">
            <div className="text-sm font-semibold text-slate-700">Raise Plan</div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <div className="text-xs uppercase tracking-wide text-slate-500">
                  Start Raising By
                </div>
                <div className="mt-1 text-lg font-bold">
                  {raiseBy === null ? "No safe month" : `Month ${raiseBy}`}
                </div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-wide text-slate-500">
                  Recommended Raise
                </div>
                <div className="mt-1 text-lg font-bold text-emerald-700">
                  {recommendedRaiseAmount === null
                    ? "N/A"
                    : formatMoney(recommendedRaiseAmount)}
                </div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-wide text-slate-500">
                  Quantile Used
                </div>
                <div className="mt-1 text-lg font-bold">
                  {amountQuantile !== undefined
                    ? `${(amountQuantile * 100).toFixed(1)}%`
                    : "N/A"}
                </div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-wide text-slate-500">
                  Close Month (p50/p95)
                </div>
                <div className="mt-1 text-lg font-bold">
                  {closeMonthSummary
                    ? `${closeMonthSummary.p50} / ${closeMonthSummary.p95}`
                    : "N/A"}
                </div>
              </div>
            </div>
            {amountPercentiles ? (
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <div className="rounded-lg border border-slate-200 bg-white p-3">
                  <div className="text-xs uppercase tracking-wide text-slate-500">Amount p50</div>
                  <div className="mt-1 text-base font-semibold">
                    {formatMoney(amountPercentiles.p50)}
                  </div>
                </div>
                <div className="rounded-lg border border-slate-200 bg-white p-3">
                  <div className="text-xs uppercase tracking-wide text-slate-500">Amount p95</div>
                  <div className="mt-1 text-base font-semibold">
                    {formatMoney(amountPercentiles.p95)}
                  </div>
                </div>
                <div className="rounded-lg border border-slate-200 bg-white p-3">
                  <div className="text-xs uppercase tracking-wide text-slate-500">Amount p99</div>
                  <div className="mt-1 text-base font-semibold">
                    {formatMoney(amountPercentiles.p99)}
                  </div>
                </div>
              </div>
            ) : null}
          </div>
          <FanChart series={simulation.cash_percentiles} />
          <RuinCurveChart series={simulation.ruin_probability_by_month} />
          <RaiseAmountTradeoffChart
            diagnostics={simulation.raise_recommendation.diagnostics}
          />
          <details className="card p-4">
            <summary className="cursor-pointer font-semibold">Raw Simulation JSON</summary>
            <pre className="mt-3 max-h-96 overflow-auto rounded-lg bg-slate-900 p-3 text-xs text-slate-100">
              {JSON.stringify(simulation, null, 2)}
            </pre>
          </details>
        </>
      ) : null}

      {comparison ? (
        <>
          <ScenarioCompareTable data={comparison} />
          <details className="card p-4">
            <summary className="cursor-pointer font-semibold">Raw Compare JSON</summary>
            <pre className="mt-3 max-h-96 overflow-auto rounded-lg bg-slate-900 p-3 text-xs text-slate-100">
              {JSON.stringify(comparison, null, 2)}
            </pre>
          </details>
        </>
      ) : null}
    </section>
  );
}
