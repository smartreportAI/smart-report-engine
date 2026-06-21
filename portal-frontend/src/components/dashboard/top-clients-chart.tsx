"use client";

import { motion } from "framer-motion";
import Link from "next/link";

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

  const maxReports = Math.max(...clients.map((c) => c.totalReports || 0));

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 flex flex-col gap-4 min-h-[200px] justify-center">
        {clients.map((client, index) => {
          const widthPercent = maxReports > 0 ? ((client.totalReports || 0) / maxReports) * 100 : 0;
          return (
            <div key={client.tenantId} className="flex flex-col gap-1.5 group cursor-default">
              <div className="flex items-end justify-between">
                <span className="text-xs font-medium text-slate-700 truncate pr-4 group-hover:text-slate-900 transition-colors">
                  {client.labName}
                </span>
                <span className="text-[11px] font-semibold text-slate-900 tabular-nums">
                  {(client.totalReports || 0).toLocaleString()}
                </span>
              </div>
              <div className="h-2.5 w-full bg-slate-100/80 rounded-full overflow-hidden border border-slate-200/50">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${widthPercent}%` }}
                  transition={{ duration: 0.8, delay: index * 0.1, ease: [0.16, 1, 0.3, 1] }}
                  className="h-full bg-blue-600 rounded-full group-hover:bg-blue-500 transition-colors shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]"
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary row */}
      <div className="flex items-center justify-between pt-4 mt-2 border-t border-slate-100">
        <p className="text-[11px] text-slate-400 font-medium">
          Top {clients.length} clients • {clients.reduce((s, c) => s + (c.totalReports || 0), 0).toLocaleString()} total reports
        </p>
        <Link href="/admin/clients" className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 transition-colors uppercase tracking-wider">
          View all &rarr;
        </Link>
      </div>
    </div>
  );
}
