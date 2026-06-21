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

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-900/90 backdrop-blur-xl border border-slate-700/50 p-4 rounded-2xl shadow-[0_12px_40px_rgba(0,0,0,0.15)] ring-1 ring-white/10">
        <p className="text-[10px] uppercase tracking-widest font-medium text-slate-400 mb-2">{label}</p>
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center">
            <span className="absolute w-4 h-4 rounded-full bg-blue-500/20 animate-ping" />
            <span className="w-2 h-2 rounded-full bg-blue-400 shadow-[0_0_12px_rgba(96,165,250,0.8)]" />
          </div>
          <p className="text-xl font-semibold text-white tracking-tight">
            {payload[0].value} <span className="text-xs font-normal text-slate-400 ml-1">Reports</span>
          </p>
        </div>
      </div>
    );
  }
  return null;
};

export function ReportsChart({ data }: ReportsChartProps) {
  const formattedData = data.map((d) => ({
    ...d,
    date: new Date(d._id).toLocaleDateString("en-IN", { day: "numeric", month: "short" }),
  }));

  if (data.length === 0) {
    return (
      <div className="h-[240px] flex items-center justify-center text-slate-400 text-sm">
        No report data available yet
      </div>
    );
  }

  return (
    <div className="h-[240px] w-full -ml-4">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={formattedData} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
          <defs>
            {/* High-end Multi-stop Gradient */}
            <linearGradient id="colorReportsGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.25} />
              <stop offset="50%" stopColor="#3b82f6" stopOpacity={0.05} />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
            </linearGradient>
            
            {/* Outer Glow Filter for the Active Dot */}
            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Minimalist Grid */}
          <CartesianGrid 
            strokeDasharray="4 4" 
            stroke="#f1f5f9" 
            vertical={false} 
          />
          
          <XAxis
            dataKey="date"
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 10, fill: "#94a3b8", fontWeight: 500 }}
            tickMargin={12}
            minTickGap={20}
          />
          
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 10, fill: "#94a3b8", fontWeight: 500 }}
            tickMargin={12}
            width={40}
            allowDecimals={false}
          />

          <Tooltip 
            content={<CustomTooltip />} 
            cursor={{ stroke: '#cbd5e1', strokeWidth: 1, strokeDasharray: '4 4' }} 
            animationDuration={200}
          />

          <Area
            type="monotone"
            dataKey="count"
            stroke="#2563eb"
            strokeWidth={3}
            fill="url(#colorReportsGrad)"
            animationDuration={1500}
            animationEasing="ease-out"
            activeDot={{ 
              r: 5, 
              fill: "#ffffff", 
              stroke: "#2563eb", 
              strokeWidth: 3,
              filter: "url(#glow)"
            }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
