"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface ChartDataPoint {
  _id: string;
  count: number;
  failures: number;
}

interface ReportsChartProps {
  data: ChartDataPoint[];
}

export function ReportsChart({ data }: ReportsChartProps) {
  // Format dates for display
  const formattedData = data.map((d) => ({
    ...d,
    date: new Date(d._id).toLocaleDateString("en-IN", { day: "2-digit", month: "short" }),
  }));

  if (data.length === 0) {
    return (
      <div className="h-[240px] flex items-center justify-center text-slate-400 text-sm">
        No report data available yet
      </div>
    );
  }

  return (
    <div className="h-[240px]">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={formattedData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="colorReports" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#2563eb" stopOpacity={0.12} />
              <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis
            dataKey="date"
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 11, fill: "#94a3b8" }}
            interval="preserveStartEnd"
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 11, fill: "#94a3b8" }}
            allowDecimals={false}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "white",
              border: "1px solid #e2e8f0",
              borderRadius: "8px",
              boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
              fontSize: "13px",
            }}
            labelStyle={{ fontWeight: 600, color: "#0f172a" }}
          />
          <Area
            type="monotone"
            dataKey="count"
            stroke="#2563eb"
            strokeWidth={2}
            fill="url(#colorReports)"
            animationDuration={800}
            name="Reports"
          />
          <Area
            type="monotone"
            dataKey="failures"
            stroke="#ef4444"
            strokeWidth={1.5}
            fill="transparent"
            strokeDasharray="4 4"
            animationDuration={1000}
            name="Failures"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
