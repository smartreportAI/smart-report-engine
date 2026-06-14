"use client";

import { motion } from "framer-motion";

interface CreditsGaugeProps {
  percent: number;
  remaining: number;
  total: number;
}

export function CreditsGauge({ percent, remaining, total }: CreditsGaugeProps) {
  const radius = 60;
  const strokeWidth = 10;
  const center = radius + strokeWidth + 4;
  const size = center * 2;
  const circumference = 2 * Math.PI * radius;
  const filled = (percent / 100) * circumference;
  const offset = circumference - filled;

  // Color
  const color = percent >= 60 ? "#10b981" : percent >= 30 ? "#f59e0b" : "#ef4444";
  const bgColor = percent >= 60 ? "#d1fae5" : percent >= 30 ? "#fef3c7" : "#fee2e2";

  const used = total - remaining;

  return (
    <div className="flex flex-col items-center justify-center h-full py-2">
      {/* Donut */}
      <div className="relative">
        <svg width={size} height={size} className="-rotate-90">
          {/* Background circle */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke="#f1f5f9"
            strokeWidth={strokeWidth}
          />
          {/* Filled arc */}
          <motion.circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1.2, delay: 0.3, ease: "easeOut" }}
          />
        </svg>
        {/* Center text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <motion.p
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.6 }}
            className="text-2xl font-bold"
            style={{ color }}
          >
            {percent}%
          </motion.p>
          <p className="text-[10px] text-slate-400">remaining</p>
        </div>
      </div>

      {/* Stats below donut */}
      <div className="grid grid-cols-2 gap-4 mt-4 w-full max-w-[180px]">
        <div className="text-center">
          <div className="flex items-center justify-center gap-1.5 mb-0.5">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
            <span className="text-sm font-semibold text-slate-900">{remaining.toLocaleString()}</span>
          </div>
          <p className="text-[10px] text-slate-400">Available</p>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center gap-1.5 mb-0.5">
            <span className="w-2 h-2 rounded-full bg-slate-200" />
            <span className="text-sm font-semibold text-slate-900">{used.toLocaleString()}</span>
          </div>
          <p className="text-[10px] text-slate-400">Used</p>
        </div>
      </div>
    </div>
  );
}
