"use client";

import { BarChart, Bar, XAxis, ResponsiveContainer, Tooltip, Cell } from "recharts";
import { motion } from "framer-motion";

interface ChartDataPoint {
  _id: string;
  count: number;
}

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function DayDistributionChart({ data }: { data: ChartDataPoint[] }) {
  // Aggregate reports by day of week (Mon=0 ... Sun=6)
  const dayCounts = [0, 0, 0, 0, 0, 0, 0];

  for (const d of data) {
    const date = new Date(d._id);
    const jsDay = date.getDay(); // 0=Sun, 1=Mon...
    const idx = jsDay === 0 ? 6 : jsDay - 1; // Shift so Mon=0, Sun=6
    dayCounts[idx] += d.count;
  }

  const chartData = DAY_NAMES.map((name, i) => ({
    name,
    count: dayCounts[i],
  }));

  const maxCount = Math.max(...dayCounts, 1);
  const maxDayIndex = dayCounts.indexOf(Math.max(...dayCounts));
  const totalWeekly = dayCounts.reduce((a, b) => a + b, 0);
  const avgPerDay = totalWeekly > 0 ? Math.round(totalWeekly / 7) : 0;

  if (data.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-slate-400 text-sm">
        No data yet
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Chart fills available space */}
      <div className="flex-1 min-h-[180px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 8, right: 4, left: 4, bottom: 0 }} barCategoryGap="20%">
            <XAxis
              dataKey="name"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: "#64748b", fontWeight: 500 }}
            />
            <Tooltip
              cursor={{ fill: "rgba(37, 99, 235, 0.04)", radius: 6 }}
              contentStyle={{
                backgroundColor: "white",
                border: "1px solid #e2e8f0",
                borderRadius: "10px",
                fontSize: "13px",
                boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
                padding: "8px 14px",
              }}
              formatter={(value: number) => [`${value} reports`, ""]}
              labelFormatter={(label) => `${label}`}
            />
            <Bar dataKey="count" radius={[8, 8, 4, 4]} animationDuration={800} maxBarSize={40}>
              {chartData.map((_, i) => (
                <Cell
                  key={i}
                  fill={i === maxDayIndex ? "#2563eb" : "#e8edf5"}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Stats strip at bottom */}
      <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-slate-100">
        <div className="text-center">
          <p className="text-lg font-bold text-slate-900">{maxCount}</p>
          <p className="text-[11px] text-slate-400">Peak day</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-bold text-slate-900">{avgPerDay}</p>
          <p className="text-[11px] text-slate-400">Daily avg</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-bold text-slate-900">{totalWeekly}</p>
          <p className="text-[11px] text-slate-400">This period</p>
        </div>
      </div>
    </div>
  );
}
