"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export interface TabItem {
  key: string;
  label: string;
  badge?: number;
}

interface TabsProps {
  items: TabItem[];
  active: string;
  onChange: (key: string) => void;
}

export function Tabs({ items, active, onChange }: TabsProps) {
  return (
    <div className="inline-flex items-center gap-1.5 p-1.5 bg-slate-100/80 backdrop-blur-xl rounded-2xl border border-slate-200/50 shadow-inner">
      {items.map((item) => {
        const isActive = item.key === active;
        return (
          <button
            key={item.key}
            onClick={() => onChange(item.key)}
            className={cn(
              "relative flex items-center gap-2.5 px-6 py-2.5 text-[13px] font-bold rounded-xl transition-all duration-300 z-10 outline-none uppercase tracking-wider",
              isActive ? "text-slate-900" : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"
            )}
          >
            {isActive && (
              <motion.div
                layoutId="mapTabPill"
                className="absolute inset-0 bg-white rounded-xl shadow-[0_4px_12px_rgba(15,23,42,0.06)] border border-slate-200/60 -z-10"
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />
            )}
            <span>{item.label}</span>
            {item.badge !== undefined && item.badge > 0 && (
              <span
                className={cn(
                  "inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full text-[10px] font-black",
                  isActive ? "bg-amber-500 text-white shadow-md shadow-amber-500/20" : "bg-slate-200 text-slate-500"
                )}
              >
                {item.badge > 99 ? "99+" : item.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
