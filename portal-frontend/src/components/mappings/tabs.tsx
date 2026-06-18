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
    <div className="flex items-center gap-1 border-b border-slate-200">
      {items.map((item) => {
        const isActive = item.key === active;
        return (
          <button
            key={item.key}
            onClick={() => onChange(item.key)}
            className={cn(
              "relative flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors",
              isActive ? "text-blue-600" : "text-slate-500 hover:text-slate-800"
            )}
          >
            {item.label}
            {item.badge !== undefined && item.badge > 0 && (
              <span
                className={cn(
                  "inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full text-[11px] font-semibold",
                  isActive ? "bg-blue-100 text-blue-700" : "bg-amber-50 text-amber-600"
                )}
              >
                {item.badge > 99 ? "99+" : item.badge}
              </span>
            )}
            {isActive && (
              <motion.div
                layoutId="mapTabUnderline"
                className="absolute left-0 right-0 -bottom-px h-0.5 bg-blue-600 rounded-full"
                transition={{ type: "spring", stiffness: 400, damping: 32 }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
