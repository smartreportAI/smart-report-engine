"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { motion, type Variants } from "framer-motion";
import {
  FileText,
  Building2,
  Activity,
  CreditCard,
  AlertCircle
} from "lucide-react";
import { ReportsChart } from "@/components/dashboard/reports-chart";
import { DayDistributionChart } from "@/components/dashboard/day-distribution-chart";
import { CreditsGauge } from "@/components/dashboard/credits-gauge";
import { TopClientsChart } from "@/components/dashboard/top-clients-chart";
import { SparkLine } from "@/components/dashboard/sparkline";
import Link from "next/link";

// Professional, Subtle Entrance Animation
const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05, delayChildren: 0.05 },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: "easeOut" },
  },
};

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

  const last7 = chartData.slice(-7).map((d: any) => d.count || 0);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-slate-200 rounded-md animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-slate-100 rounded-xl h-[120px] animate-pulse border border-slate-200" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6 max-w-7xl mx-auto"
    >
      {/* ── Page Header ── */}
      <motion.div variants={itemVariants} className="flex flex-col gap-1.5 mb-2">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          Overview
        </h1>
        <p className="text-sm text-slate-500">
          System-wide performance and high-level metrics.
        </p>
      </motion.div>

      {/* ── Row 1: KPI Cards ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Monthly Volume"
          value={reportsThisMonth}
          subtext={`+${reportsThisWeek} this week`}
          icon={FileText}
          sparkColor="#3b82f6"
        />
        <KpiCard
          label="Daily Processing"
          value={reportsToday}
          subtext={`${reportsThisMonth} total this month`}
          icon={Activity}
          sparkColor="#8b5cf6"
        />
        <KpiCard
          label="Active Networks"
          value={liveClients}
          subtext={`${totalClients} total registered`}
          icon={Building2}
          sparkColor="#10b981"
        />
        <KpiCard
          label="System Credits"
          value={remainingCreditsAll.toLocaleString()}
          subtext={lowCredits > 0 ? `${lowCredits} low clients` : "All clients healthy"}
          icon={CreditCard}
          sparkColor={lowCredits > 0 ? "#f59e0b" : "#10b981"}
          status={lowCredits > 0 ? "warning" : "healthy"}
        />
      </div>

      {/* ── Row 2: Charts ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
        <DashboardCard className="lg:col-span-2">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h2 className="text-sm font-medium text-slate-900">Reports Volume</h2>
              <div className="flex items-baseline gap-2 mt-1">
                <p className="text-2xl font-semibold tracking-tight text-slate-900">{reportsThisMonth}</p>
                <span className="text-xs text-slate-500">last 30 days</span>
              </div>
            </div>
          </div>
          <div className="flex-1 min-h-[240px]">
            <ReportsChart data={chartData} />
          </div>
        </DashboardCard>

        <DashboardCard>
          <h2 className="text-sm font-medium text-slate-900 mb-6">Traffic Distribution</h2>
          <div className="flex-1 min-h-[240px]">
            <DayDistributionChart data={chartData} />
          </div>
        </DashboardCard>
      </div>

      {/* ── Row 3: Clients & Health ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
        <DashboardCard className="lg:col-span-2">
          <h2 className="text-sm font-medium text-slate-900 mb-4">Top Performers</h2>
          <TopClientsChart clients={topClients} />
        </DashboardCard>

        <DashboardCard>
          <h2 className="text-sm font-medium text-slate-900 mb-6">System Health</h2>
          <div className="flex-1 flex flex-col items-center justify-center">
            <CreditsGauge percent={creditsHealthPercent} remaining={remainingCreditsAll} total={totalCreditsAll} />
          </div>
          {(lowCredits > 0 || expiringSoon > 0) && (
            <div className="mt-6 space-y-2">
              {lowCredits > 0 && (
                <div className="bg-amber-50 text-amber-800 text-xs font-medium p-3 rounded-lg border border-amber-200 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600" />
                  <span>{lowCredits} client{lowCredits > 1 ? 's' : ''} below threshold</span>
                </div>
              )}
              {expiringSoon > 0 && (
                <div className="bg-rose-50 text-rose-800 text-xs font-medium p-3 rounded-lg border border-rose-200 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600" />
                  <span>{expiringSoon} subscription{expiringSoon > 1 ? 's' : ''} expiring</span>
                </div>
              )}
            </div>
          )}
        </DashboardCard>
      </div>

      {/* ── Row 4: Failures ── */}
      {dashboard?.recentFailures?.length > 0 && (
        <DashboardCard>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-medium text-slate-900">Recent Anomalies</h2>
            <Link 
              href="/admin/reports?status=failed" 
              className="text-xs font-medium text-slate-500 hover:text-slate-900 transition-colors"
            >
              View All &rarr;
            </Link>
          </div>
          <div className="space-y-2">
            {dashboard.recentFailures.map((f: any, i: number) => (
              <div 
                key={i} 
                className="flex items-center justify-between p-3 rounded-lg bg-white border border-slate-200 transition-colors hover:bg-slate-50"
              >
                <div className="flex items-center gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                  <span className="text-xs font-mono font-medium text-slate-700">{f.labNo}</span>
                  <p className="text-xs text-slate-500 truncate max-w-[300px]">{f.errorMessage}</p>
                </div>
                <span className="px-2 py-0.5 rounded bg-slate-100 text-[10px] font-medium text-slate-600 uppercase tracking-wider">
                  {f.tenantId}
                </span>
              </div>
            ))}
          </div>
        </DashboardCard>
      )}
    </motion.div>
  );
}

/* ── Minimalist Professional Dashboard Card Wrapper ── */
function DashboardCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.div variants={itemVariants} className={className}>
      <div className="h-full bg-white p-5 md:p-6 rounded-xl border border-slate-200 shadow-[0_2px_10px_rgba(15,23,42,0.03),inset_0_1px_0_rgba(255,255,255,0.8)] flex flex-col transition-shadow duration-300 hover:shadow-[0_8px_30px_rgba(15,23,42,0.06)] relative overflow-hidden">
        <div className="relative z-10 flex-1 flex flex-col h-full">
          {children}
        </div>
      </div>
    </motion.div>
  );
}

/* ── Minimalist KPI Card ── */
function KpiCard({
  label, value, subtext, icon: Icon, status = "neutral"
}: {
  label: string; value: string | number; subtext: string; icon: any; sparkColor?: string; status?: "neutral" | "warning" | "healthy"
}) {
  return (
    <motion.div variants={itemVariants}>
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-center">
        
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{label}</p>
          <Icon className="w-4 h-4 text-slate-400" strokeWidth={2} />
        </div>

        <div>
          <p className="text-2xl font-bold text-slate-900 tracking-tight">
            {typeof value === "number" ? value.toLocaleString() : value}
          </p>
          <div className="flex items-center gap-1.5 mt-1">
            {status === "warning" && <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />}
            {status === "healthy" && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />}
            <p className="text-[11px] font-medium text-slate-400">{subtext}</p>
          </div>
        </div>

      </div>
    </motion.div>
  );
}
