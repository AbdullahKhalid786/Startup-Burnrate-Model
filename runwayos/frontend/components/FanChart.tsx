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

import { CashPercentiles } from "@/lib/api";

interface FanChartProps {
  series: CashPercentiles;
}

export default function FanChart({ series }: FanChartProps) {
  const data = series.months.map((month, i) => ({
    month,
    p5: series.p5[i],
    p50: series.p50[i],
    p95: series.p95[i]
  }));

  return (
    <div className="card p-4">
      <div className="mb-2 text-sm font-semibold text-slate-700">
        Cash Fan Chart (p5 / p50 / p95)
      </div>
      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 8, left: 8, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line
              type="monotone"
              dataKey="p5"
              stroke="#dc2626"
              strokeWidth={2}
              dot={false}
              name="P5"
            />
            <Line
              type="monotone"
              dataKey="p50"
              stroke="#0f766e"
              strokeWidth={2.5}
              dot={false}
              name="P50"
            />
            <Line
              type="monotone"
              dataKey="p95"
              stroke="#0ea5e9"
              strokeWidth={2}
              dot={false}
              name="P95"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
