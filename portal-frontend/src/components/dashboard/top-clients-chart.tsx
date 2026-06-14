"use client";

import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell } from "recharts";
import Link from "next/link";

const COLORS = ["#2563eb", "#3b82f6", "#60a5fa", "#93c5fd", "#bfdbfe"];

interface TopClientsChartProps {
  clients: Array<{
    tenantId: string;
    labName: string;
    totalReports: number;
  }>;
}

export function TopClientsChart({ clients }: TopClientsChartProps) {
  if (!clients || clients.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-sm text-slate-400">
        No client data
      </div>
    );
  }

  const chartData = clients.map((c) => ({
    name: c.labName.length > 20 ? c.labName.substring(0, 18) + "…" : c.labName,
    fullName: c.labName,
    tenantId: c.tenantId,
    reports: c.totalReports || 0,
  }));

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 min-h-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} layout="vertical" margin={{ top: 4, right: 40, left: 8, bottom: 4 }} barCategoryGap="25%">
            <XAxis type="number" hide />
            <YAxis
              type="category"
              dataKey="name"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: "#475569", fontWeight: 500 }}
              width={140}
            />
            <Tooltip
              cursor={{ fill: "rgba(37, 99, 235, 0.04)" }}
              contentStyle={{
                backgroundColor: "white",
                border: "1px solid #e2e8f0",
                borderRadius: "10px",
                fontSize: "13px",
                boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
                padding: "8px 14px",
              }}
              formatter={(value: number) => [`${value.toLocaleString()} reports`, ""]}
              labelFormatter={(label) => `${label}`}
            />
            <Bar dataKey="reports" radius={[0, 6, 6, 0]} animationDuration={800} maxBarSize={28}>
              {chartData.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Summary row */}
      <div className="flex items-center justify-between pt-3 mt-3 border-t border-slate-100">
        <p className="text-xs text-slate-400">
          Top {clients.length} clients • {clients.reduce((s, c) => s + (c.totalReports || 0), 0).toLocaleString()} total reports
        </p>
        <Link href="/admin/clients" className="text-xs font-medium text-blue-600 hover:underline">
          View all →
        </Link>
      </div>
    </div>
  );
}
