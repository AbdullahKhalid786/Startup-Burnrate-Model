"use client";

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

import { RaisePolicyDiagnostics } from "@/lib/api";

interface RaiseAmountTradeoffChartProps {
  diagnostics: RaisePolicyDiagnostics;
}

export default function RaiseAmountTradeoffChart({
  diagnostics
}: RaiseAmountTradeoffChartProps) {
  const data = diagnostics.months.map((month, i) => ({
    month,
    star: diagnostics.raise_amount_star_by_s[i],
    p95: diagnostics.raise_amount_p95_by_s[i]
  }));
  const hasData = data.some((row) => row.star !== null || row.p95 !== null);
  if (!hasData) {
    return null;
  }

  return (
    <div className="card p-4">
      <div className="mb-2 text-sm font-semibold text-slate-700">
        Raise Amount vs Candidate Start Month
      </div>
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 8, left: 8, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line
              type="monotone"
              dataKey="star"
              name="Recommended (q)"
              stroke="#0f766e"
              strokeWidth={2.5}
              dot={false}
              connectNulls={false}
            />
            <Line
              type="monotone"
              dataKey="p95"
              name="P95 amount"
              stroke="#ea580c"
              strokeWidth={2}
              dot={false}
              connectNulls={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
