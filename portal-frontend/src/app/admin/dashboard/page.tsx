"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { motion } from "framer-motion";
import { Building2, FileText, AlertTriangle, CreditCard, Clock } from "lucide-react";
import { StatCard } from "@/components/dashboard/stat-card";
import { ReportsChart } from "@/components/dashboard/reports-chart";

export default function AdminDashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "dashboard"],
    queryFn: () => apiClient("/admin/dashboard"),
    refetchInterval: 30000,
  });

  const { data: statsData } = useQuery({
    queryKey: ["admin", "reports", "stats"],
    queryFn: () => apiClient("/admin/reports/stats?days=30"),
  });

  const dashboard = data?.data;
  const chartData = statsData?.data?.perDay || [];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-sm text-slate-500 mt-1">Overview of your report platform</p>
      </motion.div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          index={0}
          label="Total Clients"
          value={dashboard?.clients?.total ?? 0}
          sublabel={`${dashboard?.clients?.live ?? 0} active`}
          icon={Building2}
          color="blue"
          isLoading={isLoading}
        />
        <StatCard
          index={1}
          label="Reports Today"
          value={dashboard?.reports?.today ?? 0}
          sublabel={`${dashboard?.reports?.thisMonth ?? 0} this month`}
          icon={FileText}
          color="green"
          isLoading={isLoading}
        />
        <StatCard
          index={2}
          label="Failures Today"
          value={dashboard?.reports?.failuresToday ?? 0}
          sublabel="generation errors"
          icon={AlertTriangle}
          color={dashboard?.reports?.failuresToday > 0 ? "red" : "green"}
          isLoading={isLoading}
        />
        <StatCard
          index={3}
          label="Low Credits"
          value={dashboard?.clients?.lowCredits ?? 0}
          sublabel="clients below 100"
          icon={CreditCard}
          color={dashboard?.clients?.lowCredits > 0 ? "amber" : "green"}
          isLoading={isLoading}
        />
        <StatCard
          index={4}
          label="Expiring Soon"
          value={dashboard?.clients?.expiringSoon ?? 0}
          sublabel="within 7 days"
          icon={Clock}
          color={dashboard?.clients?.expiringSoon > 0 ? "amber" : "green"}
          isLoading={isLoading}
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Reports Chart - Takes 2 columns */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.3 }}
          className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-6 shadow-sm"
        >
          <h2 className="text-base font-semibold text-slate-900 mb-4">Reports Generated</h2>
          <p className="text-xs text-slate-500 -mt-3 mb-4">Last 30 days</p>
          <ReportsChart data={chartData} />
        </motion.div>

        {/* Recent Failures */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.4 }}
          className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm"
        >
          <h2 className="text-base font-semibold text-slate-900 mb-4">Recent Failures</h2>
          {dashboard?.recentFailures?.length > 0 ? (
            <div className="space-y-3">
              {dashboard.recentFailures.map((failure: any, i: number) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-red-50 border border-red-100">
                  <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">{failure.labNo}</p>
                    <p className="text-xs text-slate-500">{failure.tenantId}</p>
                    <p className="text-xs text-red-600 mt-0.5 truncate">{failure.errorMessage}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-slate-400">
              <AlertTriangle className="w-8 h-8 mb-2 opacity-30" />
              <p className="text-sm">No recent failures</p>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
