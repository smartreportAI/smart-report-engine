"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { motion } from "framer-motion";
import {
  FileText,
  Building2,
  Activity,
  CheckCircle,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CreditCard,
} from "lucide-react";
import { ReportsChart } from "@/components/dashboard/reports-chart";
import { DayDistributionChart } from "@/components/dashboard/day-distribution-chart";
import { CreditsGauge } from "@/components/dashboard/credits-gauge";
import { TopClientsChart } from "@/components/dashboard/top-clients-chart";
import { SparkLine } from "@/components/dashboard/sparkline";
import Link from "next/link";

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

  const { data: clientsData } = useQuery({
    queryKey: ["admin", "clients", "all"],
    queryFn: () => apiClient("/admin/clients?limit=50"),
  });

  const dashboard = data?.data;
  const chartData = statsData?.data?.perDay || [];
  const allClients = clientsData?.data || [];

  // KPI values
  const totalReports = dashboard?.reports?.total ?? 0;
  const reportsToday = dashboard?.reports?.today ?? 0;
  const reportsThisMonth = dashboard?.reports?.thisMonth ?? 0;
  const reportsThisWeek = dashboard?.reports?.thisWeek ?? 0;
  const failuresToday = dashboard?.reports?.failuresToday ?? 0;
  const liveClients = dashboard?.clients?.live ?? 0;
  const totalClients = dashboard?.clients?.total ?? 0;
  const lowCredits = dashboard?.clients?.lowCredits ?? 0;
  const expiringSoon = dashboard?.clients?.expiringSoon ?? 0;

  // Credits totals
  const totalCreditsAll = allClients.reduce((sum: number, c: any) => sum + (c.totalCredits || 0), 0);
  const remainingCreditsAll = allClients.reduce((sum: number, c: any) => sum + (c.remainingCredits || 0), 0);
  const creditsHealthPercent = totalCreditsAll > 0 ? Math.round((remainingCreditsAll / totalCreditsAll) * 100) : 0;

  // Top clients
  const topClients = [...allClients]
    .sort((a: any, b: any) => (b.totalReports || 0) - (a.totalReports || 0))
    .slice(0, 5);

  // Sparkline data from chart (last 7 days for inline mini-charts)
  const last7 = chartData.slice(-7).map((d: any) => d.count || 0);

  // Loading
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-40 bg-slate-100 rounded animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-slate-200 p-6 h-[140px] animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Dashboard</h1>
        <p className="text-sm text-slate-500 mt-0.5">Showing data for the last 30 days</p>
      </motion.div>

      {/* ── Row 1: 4 KPI Cards with Sparklines ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <KpiCard
          index={0}
          label="Total Reports"
          value={totalReports}
          comparison={`${reportsThisMonth} this month`}
          positive
          icon={FileText}
          iconBg="bg-blue-50"
          iconColor="text-blue-600"
          sparkData={last7}
          sparkColor="#2563eb"
        />
        <KpiCard
          index={1}
          label="Active Clients"
          value={liveClients}
          comparison={`${totalClients} total registered`}
          positive
          icon={Building2}
          iconBg="bg-emerald-50"
          iconColor="text-emerald-600"
          sparkData={[]}
          sparkColor="#10b981"
        />
        <KpiCard
          index={2}
          label="Reports Today"
          value={reportsToday}
          comparison={`${reportsThisWeek} this week`}
          positive={reportsToday > 0}
          icon={Activity}
          iconBg="bg-violet-50"
          iconColor="text-violet-600"
          sparkData={last7}
          sparkColor="#7c3aed"
        />
        <KpiCard
          index={3}
          label="Credits Remaining"
          value={remainingCreditsAll.toLocaleString()}
          comparison={lowCredits > 0 ? `${lowCredits} client${lowCredits > 1 ? 's' : ''} low` : "All healthy"}
          positive={lowCredits === 0}
          icon={CreditCard}
          iconBg={lowCredits > 0 ? "bg-amber-50" : "bg-emerald-50"}
          iconColor={lowCredits > 0 ? "text-amber-600" : "text-emerald-600"}
          sparkData={[]}
          sparkColor={lowCredits > 0 ? "#f59e0b" : "#10b981"}
        />
      </div>

      {/* ── Row 2: Main Chart + Day Distribution ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-6"
        >
          <div className="flex items-start justify-between mb-1">
            <div>
              <h2 className="text-base font-semibold text-slate-900">Reports Generated</h2>
              <div className="flex items-baseline gap-3 mt-1">
                <p className="text-3xl font-bold text-slate-900">{reportsThisMonth}</p>
                <span className="text-sm text-slate-400">this month</span>
              </div>
            </div>
            <span className="px-2.5 py-1 text-xs font-medium text-slate-500 bg-slate-100 rounded-md">Last 30 days</span>
          </div>
          <div className="mt-4">
            <ReportsChart data={chartData} />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col"
        >
          <h2 className="text-base font-semibold text-slate-900 mb-2">Busiest Days</h2>
          <div className="flex-1">
            <DayDistributionChart data={chartData} />
          </div>
        </motion.div>
      </div>

      {/* ── Row 3: Top Clients + Credits Health ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-6"
        >
          <h2 className="text-base font-semibold text-slate-900 mb-2">Top Clients by Volume</h2>
          <TopClientsChart clients={topClients} />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col"
        >
          <h2 className="text-base font-semibold text-slate-900 mb-2">Credits Health</h2>
          <div className="flex-1 flex flex-col items-center justify-center">
            <CreditsGauge percent={creditsHealthPercent} remaining={remainingCreditsAll} total={totalCreditsAll} />
          </div>
          {(lowCredits > 0 || expiringSoon > 0) && (
            <div className="space-y-2 mt-4 pt-3 border-t border-slate-100">
              {lowCredits > 0 && (
                <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 px-3 py-2 rounded-lg">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>{lowCredits} client{lowCredits > 1 ? 's' : ''} below 100 credits</span>
                </div>
              )}
              {expiringSoon > 0 && (
                <div className="flex items-center gap-2 text-xs text-red-700 bg-red-50 px-3 py-2 rounded-lg">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>{expiringSoon} subscription{expiringSoon > 1 ? 's' : ''} expiring within 7 days</span>
                </div>
              )}
            </div>
          )}
        </motion.div>
      </div>

      {/* ── Row 4: Recent Failures (only if any) ── */}
      {dashboard?.recentFailures?.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white rounded-2xl border border-slate-200 p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-slate-900">Recent Failures</h2>
            <Link href="/admin/reports?status=failed" className="text-xs text-red-600 hover:underline font-medium">View all</Link>
          </div>
          <div className="space-y-2">
            {dashboard.recentFailures.map((f: any, i: number) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-red-50/50 border border-red-100">
                <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium text-slate-900 font-mono">{f.labNo}</span>
                  <span className="text-xs text-slate-400 ml-2">{f.tenantId}</span>
                </div>
                <p className="text-xs text-red-600 truncate max-w-[240px]">{f.errorMessage}</p>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}

/* ── KPI Card with optional sparkline ── */
function KpiCard({
  index, label, value, comparison, positive, icon: Icon, iconBg, iconColor, sparkData, sparkColor,
}: {
  index: number; label: string; value: string | number; comparison: string; positive: boolean;
  icon: any; iconBg: string; iconColor: string; sparkData: number[]; sparkColor: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.07 }}
      className="bg-white rounded-2xl border border-slate-200 p-5 flex flex-col justify-between min-h-[140px]"
    >
      <div className="flex items-start justify-between">
        <p className="text-sm font-medium text-slate-500">{label}</p>
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${iconBg}`}>
          <Icon className={`w-4.5 h-4.5 ${iconColor}`} />
        </div>
      </div>

      <div className="flex items-end justify-between mt-auto">
        <div>
          <p className="text-2xl font-bold text-slate-900 tracking-tight">
            {typeof value === "number" ? value.toLocaleString() : value}
          </p>
          <div className="flex items-center gap-1 mt-1">
            {positive ? (
              <TrendingUp className="w-3 h-3 text-emerald-500" />
            ) : (
              <TrendingDown className="w-3 h-3 text-amber-500" />
            )}
            <span className="text-[11px] text-slate-400">{comparison}</span>
          </div>
        </div>

        {/* Mini sparkline */}
        {sparkData.length > 0 && (
          <SparkLine data={sparkData} color={sparkColor} width={64} height={28} />
        )}
      </div>
    </motion.div>
  );
}
