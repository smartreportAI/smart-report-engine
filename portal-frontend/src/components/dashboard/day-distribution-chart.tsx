"use client";

import { motion } from "framer-motion";
import { useState } from "react";

interface ChartDataPoint {
  _id: string;
  count: number;
}

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function DayDistributionChart({ data }: { data: ChartDataPoint[] }) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const dayCounts = [0, 0, 0, 0, 0, 0, 0];

  for (const d of data) {
    const date = new Date(d._id);
    const jsDay = date.getDay(); // 0=Sun, 1=Mon...
    const idx = jsDay === 0 ? 6 : jsDay - 1; // Shift so Mon=0, Sun=6
    dayCounts[idx] += d.count;
  }

  const maxCount = Math.max(...dayCounts, 1);
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
      {/* Chart container */}
      <div className="flex-1 flex items-end justify-between gap-1.5 min-h-[160px] pb-4 pt-8">
        {dayCounts.map((count, i) => {
          const heightPercent = (count / maxCount) * 100;
          const isMax = count === maxCount && count > 0;
          const isHovered = hoveredIndex === i;
          
          return (
            <div 
              key={DAY_NAMES[i]} 
              className="flex flex-col items-center gap-2 group w-full relative h-full justify-end cursor-crosshair"
              onMouseEnter={() => setHoveredIndex(i)}
              onMouseLeave={() => setHoveredIndex(null)}
            >
              
              {/* Tooltip on hover */}
              <motion.div 
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: isHovered ? 1 : 0, y: isHovered ? 0 : 5 }}
                className="absolute -top-8 pointer-events-none z-10 flex flex-col items-center"
              >
                <div className="bg-slate-900 text-white text-[10px] font-semibold px-2 py-1 rounded shadow-lg whitespace-nowrap">
                  {count} reports
                </div>
                <div className="w-1.5 h-1.5 bg-slate-900 rotate-45 -mt-1" />
              </motion.div>

              {/* Bar Wrapper */}
              <div className="w-full max-w-[28px] h-full bg-slate-50/50 rounded-t-lg flex items-end overflow-hidden border-x border-t border-slate-100 relative">
                
                {/* Fill */}
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: `${heightPercent}%` }}
                  transition={{ duration: 0.8, delay: i * 0.05, ease: [0.16, 1, 0.3, 1] }}
                  className={`w-full rounded-t-lg transition-colors duration-300 relative ${
                    isMax 
                      ? 'bg-blue-600 shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]' 
                      : isHovered 
                        ? 'bg-blue-400' 
                        : 'bg-slate-200'
                  }`}
                >
                  {/* Subtle inner top highlight */}
                  <div className="absolute top-0 left-0 right-0 h-0.5 bg-white/20" />
                </motion.div>

              </div>

              {/* Label */}
              <span className={`text-[10px] uppercase tracking-widest transition-colors duration-300 ${
                isHovered || isMax ? 'text-slate-900 font-semibold' : 'text-slate-400 font-medium'
              }`}>
                {DAY_NAMES[i]}
              </span>
            </div>
          );
        })}
      </div>

      {/* Stats strip at bottom */}
      <div className="grid grid-cols-3 gap-3 mt-2 pt-3 border-t border-slate-100">
        <div className="text-center">
          <p className="text-xl font-semibold text-slate-900">{Math.max(...dayCounts)}</p>
          <p className="text-[9px] uppercase tracking-widest font-medium text-slate-400">Peak</p>
        </div>
        <div className="text-center border-x border-slate-100">
          <p className="text-xl font-semibold text-slate-900">{avgPerDay}</p>
          <p className="text-[9px] uppercase tracking-widest font-medium text-slate-400">Avg / Day</p>
        </div>
        <div className="text-center">
          <p className="text-xl font-semibold text-slate-900">{totalWeekly}</p>
          <p className="text-[9px] uppercase tracking-widest font-medium text-slate-400">Total</p>
        </div>
      </div>
    </div>
  );
}
