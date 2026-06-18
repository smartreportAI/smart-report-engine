"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { motion } from "framer-motion";
import { ScrollText, UserPlus, CreditCard, Power, Edit, Trash2, LogIn, Search, Wand2, Database } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Pagination } from "@/components/shared/pagination";
import { useDebounced } from "@/lib/hooks/use-debounced";
import type { LucideIcon } from "lucide-react";

const actionIcons: Record<string, { icon: LucideIcon; color: string; bg: string }> = {
  "client.create": { icon: UserPlus, color: "text-emerald-600", bg: "bg-emerald-50" },
  "client.addCredits": { icon: CreditCard, color: "text-violet-600", bg: "bg-violet-50" },
  "client.enable": { icon: Power, color: "text-emerald-600", bg: "bg-emerald-50" },
  "client.disable": { icon: Power, color: "text-red-600", bg: "bg-red-50" },
  "client.update": { icon: Edit, color: "text-blue-600", bg: "bg-blue-50" },
  "client.delete": { icon: Trash2, color: "text-red-600", bg: "bg-red-50" },
  "auth.login": { icon: LogIn, color: "text-slate-600", bg: "bg-slate-100" },
  "global_mapping.upsert": { icon: Database, color: "text-blue-600", bg: "bg-blue-50" },
  "global_mapping.delete": { icon: Database, color: "text-red-600", bg: "bg-red-50" },
  "client_mapping.upsert": { icon: Database, color: "text-violet-600", bg: "bg-violet-50" },
  "client_mapping.delete": { icon: Database, color: "text-red-600", bg: "bg-red-50" },
  "unmapped.mapped_to_global": { icon: Wand2, color: "text-blue-600", bg: "bg-blue-50" },
  "unmapped.mapped_to_client": { icon: Wand2, color: "text-violet-600", bg: "bg-violet-50" },
};

function getActionStyle(action: string) {
  return actionIcons[action] || { icon: ScrollText, color: "text-slate-600", bg: "bg-slate-100" };
}

export default function AuditPage() {
  const [actionFilter, setActionFilter] = useState("");
  const [tenantFilter, setTenantFilter] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [page, setPage] = useState(1);

  const debouncedAction = useDebounced(actionFilter, 300);
  const debouncedTenant = useDebounced(tenantFilter, 300);

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "audit", debouncedAction, debouncedTenant, fromDate, toDate, page],
    queryFn: () => {
      let url = `/admin/audit-log?page=${page}&limit=20`;
      if (debouncedAction) url += `&action=${debouncedAction}`;
      if (debouncedTenant) url += `&tenantId=${debouncedTenant}`;
      if (fromDate) url += `&from=${fromDate}`;
      if (toDate) url += `&to=${toDate}`;
      return apiClient(url);
    },
  });

  const logs = data?.data || [];
  const meta = data?.meta;
  const hasFilters = !!(actionFilter || tenantFilter || fromDate || toDate);

  return (
    <div className="space-y-6">
      <PageHeader title="Audit Log" subtitle="History of all administrative actions" />

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Filter by action (e.g. client.create)..."
            value={actionFilter}
            onChange={(e) => { setActionFilter(e.target.value); setPage(1); }}
            className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
          />
        </div>
        <div className="relative min-w-[160px] max-w-xs">
          <input
            type="text"
            placeholder="Tenant ID..."
            value={tenantFilter}
            onChange={(e) => { setTenantFilter(e.target.value); setPage(1); }}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
          />
        </div>
        <div className="flex items-center gap-1.5">
          <input type="date" value={fromDate} onChange={(e) => { setFromDate(e.target.value); setPage(1); }} title="From date"
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600" />
          <span className="text-slate-400 text-sm">to</span>
          <input type="date" value={toDate} onChange={(e) => { setToDate(e.target.value); setPage(1); }} title="To date"
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600" />
        </div>
        {hasFilters && (
          <button onClick={() => { setActionFilter(""); setTenantFilter(""); setFromDate(""); setToDate(""); setPage(1); }}
            className="text-sm text-slate-500 hover:text-blue-600 px-2">Clear</button>
        )}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden"
      >
        {isLoading ? (
          <div className="p-8 text-center text-slate-400">Loading audit log...</div>
        ) : logs.length === 0 ? (
          <EmptyState icon={ScrollText} title="No audit entries" description={hasFilters ? "Try adjusting your filters." : "Admin actions will be logged here."} />
        ) : (
          <div className="divide-y divide-slate-100">
            {logs.map((log: any, i: number) => {
              const style = getActionStyle(log.action);
              const Icon = style.icon;
              return (
                <motion.div
                  key={log._id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.02 }}
                  className="flex items-start gap-3 px-5 py-3.5 hover:bg-slate-50 transition-colors"
                >
                  <div className={`w-8 h-8 rounded-lg ${style.bg} flex items-center justify-center flex-shrink-0`}>
                    <Icon className={`w-4 h-4 ${style.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-900">{log.description || log.action}</p>
                    <div className="flex items-center flex-wrap gap-x-2 gap-y-0.5 mt-0.5">
                      <span className="text-xs text-slate-500">{log.userEmail}</span>
                      <span className="text-xs text-slate-300">•</span>
                      <span className="text-xs font-mono text-slate-400">{log.action}</span>
                      {log.targetTenantId && (
                        <>
                          <span className="text-xs text-slate-300">•</span>
                          <span className="text-xs font-mono text-blue-500">{log.targetTenantId}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <span className="text-xs text-slate-400 flex-shrink-0 whitespace-nowrap">
                    {new Date(log.createdAt).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </span>
                </motion.div>
              );
            })}
          </div>
        )}

        {meta && <Pagination page={meta.page} totalPages={meta.totalPages} total={meta.total} noun="entry" onPageChange={setPage} />}
      </motion.div>
    </div>
  );
}
