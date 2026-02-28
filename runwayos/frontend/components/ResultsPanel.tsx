"use client";

import {
  CompareScenariosResponse,
  SimulateResponse
} from "@/lib/api";

import FanChart from "./FanChart";
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
            <div className="text-xs uppercase tracking-wide text-slate-500">Raise By Month</div>
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
          <FanChart series={simulation.cash_percentiles} />
          <RuinCurveChart series={simulation.ruin_probability_by_month} />
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
