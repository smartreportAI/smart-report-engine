"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  index: number;
  label: string;
  value: number;
  sublabel: string;
  icon: LucideIcon;
  color: "blue" | "green" | "red" | "amber" | "violet";
  isLoading?: boolean;
}

const colorMap = {
  blue: { bg: "bg-blue-50", icon: "text-blue-600", border: "border-blue-100" },
  green: { bg: "bg-emerald-50", icon: "text-emerald-600", border: "border-emerald-100" },
  red: { bg: "bg-red-50", icon: "text-red-600", border: "border-red-100" },
  amber: { bg: "bg-amber-50", icon: "text-amber-600", border: "border-amber-100" },
  violet: { bg: "bg-violet-50", icon: "text-violet-600", border: "border-violet-100" },
};

function AnimatedNumber({ value }: { value: number }) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    if (value === 0) {
      setDisplayValue(0);
      return;
    }

    let start = 0;
    const duration = 800;
    const startTime = Date.now();

    function animate() {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(eased * value);

      setDisplayValue(current);

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    }

    requestAnimationFrame(animate);
  }, [value]);

  return <>{displayValue.toLocaleString()}</>;
}

export function StatCard({ index, label, value, sublabel, icon: Icon, color, isLoading }: StatCardProps) {
  const colors = colorMap[color];

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
        <div className="animate-pulse space-y-3">
          <div className="w-10 h-10 bg-slate-100 rounded-lg" />
          <div className="h-8 bg-slate-100 rounded w-16" />
          <div className="h-4 bg-slate-100 rounded w-24" />
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.08 }}
      whileHover={{ y: -2, boxShadow: "0 4px 12px rgba(0,0,0,0.06)" }}
      className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm transition-shadow cursor-default"
    >
      {/* Icon */}
      <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center mb-3", colors.bg, colors.border, "border")}>
        <Icon className={cn("w-5 h-5", colors.icon)} />
      </div>

      {/* Value */}
      <p className="text-3xl font-bold text-slate-900 tracking-tight">
        <AnimatedNumber value={value} />
      </p>

      {/* Label */}
      <p className="text-sm font-medium text-slate-600 mt-1">{label}</p>

      {/* Sub-label */}
      <p className="text-xs text-slate-400 mt-0.5">{sublabel}</p>
    </motion.div>
  );
}
