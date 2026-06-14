"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { motion } from "framer-motion";
import { ScrollText, UserPlus, CreditCard, Power, Edit, Trash2, LogIn } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import type { LucideIcon } from "lucide-react";

const actionIcons: Record<string, { icon: LucideIcon; color: string; bg: string }> = {
  "client.create": { icon: UserPlus, color: "text-emerald-600", bg: "bg-emerald-50" },
  "client.addCredits": { icon: CreditCard, color: "text-violet-600", bg: "bg-violet-50" },
  "client.enable": { icon: Power, color: "text-emerald-600", bg: "bg-emerald-50" },
  "client.disable": { icon: Power, color: "text-red-600", bg: "bg-red-50" },
  "client.update": { icon: Edit, color: "text-blue-600", bg: "bg-blue-50" },
  "client.delete": { icon: Trash2, color: "text-red-600", bg: "bg-red-50" },
  "auth.login": { icon: LogIn, color: "text-slate-600", bg: "bg-slate-100" },
};

function getActionStyle(action: string) {
  return actionIcons[action] || { icon: ScrollText, color: "text-slate-600", bg: "bg-slate-100" };
}

export default function AuditPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "audit"],
    queryFn: () => apiClient("/admin/audit-log?page=1&limit=50"),
  });

  const logs = data?.data || [];

  return (
    <div className="space-y-6">
      <PageHeader title="Audit Log" subtitle="History of all administrative actions" />

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white rounded-xl border border-slate-200 shadow-sm"
      >
        {isLoading ? (
          <div className="p-8 text-center text-slate-400">Loading audit log...</div>
        ) : logs.length === 0 ? (
          <EmptyState icon={ScrollText} title="No audit entries" description="Admin actions will be logged here." />
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
                  transition={{ delay: i * 0.03 }}
                  className="flex items-start gap-3 px-5 py-3.5 hover:bg-slate-50 transition-colors"
                >
                  <div className={`w-8 h-8 rounded-lg ${style.bg} flex items-center justify-center flex-shrink-0`}>
                    <Icon className={`w-4 h-4 ${style.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-900">{log.description || log.action}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-slate-500">{log.userEmail}</span>
                      <span className="text-xs text-slate-300">•</span>
                      <span className="text-xs font-mono text-slate-400">{log.action}</span>
                    </div>
                  </div>
                  <span className="text-xs text-slate-400 flex-shrink-0">
                    {new Date(log.createdAt).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </span>
                </motion.div>
              );
            })}
          </div>
        )}
      </motion.div>
    </div>
  );
}
