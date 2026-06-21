"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { motion } from "framer-motion";
import { Building2, Search, Plus, Eye, ChevronRight, Activity, CreditCard, FileText, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { TableSkeleton } from "@/components/shared/table-skeleton";
import { Pagination } from "@/components/shared/pagination";

export default function ClientsPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [planFilter, setPlanFilter] = useState("");
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "clients", search, statusFilter, planFilter, page],
    queryFn: () =>
      apiClient(
        `/admin/clients?page=${page}&limit=20${search ? `&search=${search}` : ""}${statusFilter ? `&status=${statusFilter}` : ""}${planFilter ? `&plan=${planFilter}` : ""}`
      ),
  });

  const clients = data?.data || [];
  const meta = data?.meta;

  const totalCredits = clients.reduce((sum: number, c: any) => sum + (c.remainingCredits || 0), 0);
  const activeCount = clients.filter((c: any) => c.isLive).length;
  const totalReports = clients.reduce((sum: number, c: any) => sum + (c.totalReports || 0), 0);

  return (
    <div className="space-y-8 pb-10">
      
      {/* Premium Hero Header */}
      <div className="relative overflow-hidden rounded-3xl bg-slate-950 p-8 shadow-xl">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f2e_1px,transparent_1px)] bg-[size:14px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]"></div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">Client Networks</h1>
            <p className="text-slate-400 mt-2 max-w-xl text-sm leading-relaxed">
              Manage your diagnostic lab networks, track report volumes, and monitor API credits across all active tenants.
            </p>
          </div>
          <Link href="/admin/clients/onboard" className="group relative inline-flex items-center gap-2 bg-white text-slate-950 text-sm font-semibold px-5 py-3 rounded-xl transition-all hover:bg-slate-100 hover:scale-[1.02] active:scale-95 shadow-[0_0_20px_rgba(255,255,255,0.1)]">
            <Plus className="w-4 h-4" />
            <span>Onboard Network</span>
            <div className="absolute inset-0 rounded-xl ring-1 ring-inset ring-black/10"></div>
          </Link>
        </div>

        {/* Hero Bento Stats */}
        <div className="relative z-10 grid grid-cols-2 md:grid-cols-4 gap-4 mt-8 pt-6 border-t border-white/10">
          {[
            { label: "Total Networks", value: clients.length, icon: Building2 },
            { label: "Active Live", value: activeCount, icon: CheckCircle2 },
            { label: "Total Credits", value: totalCredits.toLocaleString(), icon: CreditCard },
            { label: "Reports Generated", value: totalReports.toLocaleString(), icon: FileText },
          ].map((stat, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
              className="flex items-center gap-4 bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/10">
                <stat.icon className="h-5 w-5 text-slate-300" strokeWidth={1.5} />
              </div>
              <div>
                <p className="text-2xl font-bold text-white tracking-tight">{stat.value}</p>
                <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wider mt-0.5">{stat.label}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Command Palette Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3 bg-white p-2 rounded-2xl border border-slate-200 shadow-sm">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input type="text" placeholder="Search by network name or tenant ID..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-10 pr-4 py-2.5 bg-transparent text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none" />
        </div>
        <div className="w-px h-6 bg-slate-200 hidden sm:block"></div>
        <div className="flex w-full sm:w-auto items-center gap-2 px-2">
          <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="bg-slate-50 hover:bg-slate-100 px-3 py-2 rounded-lg text-sm font-medium text-slate-700 border-none focus:ring-0 cursor-pointer transition-colors outline-none appearance-none pr-8">
            <option value="">All Status</option>
            <option value="live">Active Live</option>
            <option value="inactive">Inactive</option>
          </select>
          <select value={planFilter} onChange={(e) => { setPlanFilter(e.target.value); setPage(1); }}
            className="bg-slate-50 hover:bg-slate-100 px-3 py-2 rounded-lg text-sm font-medium text-slate-700 border-none focus:ring-0 cursor-pointer transition-colors outline-none appearance-none pr-8">
            <option value="">All Plans</option>
            <option value="free">Free</option>
            <option value="starter">Starter</option>
            <option value="pro">Pro</option>
            <option value="enterprise">Enterprise</option>
          </select>
        </div>
      </div>

      {/* Minimalist Data Grid */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
        className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-6"><TableSkeleton rows={6} cols={7} /></div>
        ) : clients.length === 0 ? (
          <EmptyState icon={Building2} title="No networks found" description="Adjust your filters or onboard a new client network to get started." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  <th className="text-left px-6 py-4 font-semibold text-slate-500 uppercase tracking-wider text-[11px]">Network Name</th>
                  <th className="text-left px-6 py-4 font-semibold text-slate-500 uppercase tracking-wider text-[11px]">Tenant ID</th>
                  <th className="text-left px-6 py-4 font-semibold text-slate-500 uppercase tracking-wider text-[11px]">Status</th>
                  <th className="text-left px-6 py-4 font-semibold text-slate-500 uppercase tracking-wider text-[11px]">Plan</th>
                  <th className="text-right px-6 py-4 font-semibold text-slate-500 uppercase tracking-wider text-[11px]">API Credits</th>
                  <th className="text-right px-6 py-4 font-semibold text-slate-500 uppercase tracking-wider text-[11px]">Reports</th>
                  <th className="text-right px-6 py-4 font-semibold text-slate-500 uppercase tracking-wider text-[11px]">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {clients.map((client: any, i: number) => (
                  <motion.tr key={client.tenantId} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.04 }}
                    className="group hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-4">
                      <Link href={`/admin/clients/${client.tenantId}`} className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center border border-blue-100/50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors shadow-sm">
                          {client.labName.charAt(0).toUpperCase()}
                        </div>
                        {client.labName}
                      </Link>
                    </td>
                    <td className="px-6 py-4 font-mono text-[13px] text-slate-500">{client.tenantId}</td>
                    <td className="px-6 py-4"><StatusBadge status={client.isLive ? "active" : "inactive"} /></td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2 py-1 rounded-md bg-slate-100 text-slate-600 text-[11px] font-bold uppercase tracking-wider">
                        {client.plan || "starter"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right font-mono font-medium text-slate-900">{client.remainingCredits?.toLocaleString()}</td>
                    <td className="px-6 py-4 text-right font-medium text-slate-600">{client.totalReports}</td>
                    <td className="px-6 py-4 text-right">
                      <Link href={`/admin/clients/${client.tenantId}`} className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors">
                        <ChevronRight className="w-4 h-4" />
                      </Link>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {meta && (
          <div className="border-t border-slate-100 bg-slate-50/50 p-4">
            <Pagination page={meta.page} totalPages={meta.totalPages} total={meta.total} noun="network" onPageChange={setPage} />
          </div>
        )}
      </motion.div>
    </div>
  );
}
