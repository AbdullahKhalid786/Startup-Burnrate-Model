"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

import { RuinProbabilitySeries } from "@/lib/api";

interface RuinCurveChartProps {
  series: RuinProbabilitySeries;
}

export default function RuinCurveChart({ series }: RuinCurveChartProps) {
  const data = series.months.map((month, i) => ({
    month,
    p_ruin: series.p_ruin[i]
  }));

  return (
    <div className="card p-4">
      <div className="mb-2 text-sm font-semibold text-slate-700">
        Ruin Probability Curve P(cash &lt; 0 by t)
      </div>
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 8, left: 8, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" />
            <XAxis dataKey="month" />
            <YAxis domain={[0, 1]} />
            <Tooltip />
            <Line
              type="monotone"
              dataKey="p_ruin"
              stroke="#ea580c"
              strokeWidth={2.5}
              dot={false}
              name="P(ruin)"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
