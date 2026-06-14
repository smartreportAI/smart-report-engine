"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { motion } from "framer-motion";
import { Building2, Search, Plus, Eye } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { TableSkeleton } from "@/components/shared/table-skeleton";

export default function ClientsPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [planFilter, setPlanFilter] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "clients", search, statusFilter, planFilter],
    queryFn: () =>
      apiClient(
        `/admin/clients?page=1&limit=50${search ? `&search=${search}` : ""}${statusFilter ? `&status=${statusFilter}` : ""}${planFilter ? `&plan=${planFilter}` : ""}`
      ),
  });

  const clients = data?.data || [];

  // Compute quick stats
  const totalCredits = clients.reduce((sum: number, c: any) => sum + (c.remainingCredits || 0), 0);
  const activeCount = clients.filter((c: any) => c.isLive).length;
  const totalReports = clients.reduce((sum: number, c: any) => sum + (c.totalReports || 0), 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Clients"
        subtitle="Manage your diagnostic lab clients"
        action={
          <Link href="/admin/clients/onboard" className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors shadow-sm">
            <Plus className="w-4 h-4" />
            Onboard Client
          </Link>
        }
      />

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Clients", value: clients.length, color: "text-blue-600" },
          { label: "Active", value: activeCount, color: "text-emerald-600" },
          { label: "Total Credits", value: totalCredits.toLocaleString(), color: "text-violet-600" },
          { label: "Total Reports", value: totalReports.toLocaleString(), color: "text-slate-900" },
        ].map((stat, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            className="bg-white rounded-xl border border-slate-200 px-4 py-3 shadow-sm">
            <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
            <p className="text-xs text-slate-500 mt-0.5">{stat.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input type="text" placeholder="Search by name or tenant ID..." value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600" />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600">
          <option value="">All Status</option>
          <option value="live">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        <select value={planFilter} onChange={(e) => setPlanFilter(e.target.value)}
          className="px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600">
          <option value="">All Plans</option>
          <option value="free">Free</option>
          <option value="starter">Starter</option>
          <option value="pro">Pro</option>
          <option value="enterprise">Enterprise</option>
        </select>
      </div>

      {/* Table */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
        className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <TableSkeleton rows={6} cols={7} />
        ) : clients.length === 0 ? (
          <EmptyState icon={Building2} title="No clients found" description="Onboard your first client to get started." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Lab Name</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Tenant ID</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Status</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Plan</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600">Credits</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600">Reports</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600">Action</th>
                </tr>
              </thead>
              <tbody>
                {clients.map((client: any, i: number) => (
                  <motion.tr key={client.tenantId} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.04 }}
                    className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <Link href={`/admin/clients/${client.tenantId}`} className="font-medium text-slate-900 hover:text-blue-600">{client.labName}</Link>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-500">{client.tenantId}</td>
                    <td className="px-4 py-3"><StatusBadge status={client.isLive ? "active" : "inactive"} /></td>
                    <td className="px-4 py-3 text-slate-600 capitalize">{client.plan || "starter"}</td>
                    <td className="px-4 py-3 text-right font-mono text-slate-900">{client.remainingCredits?.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right text-slate-600">{client.totalReports}</td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/admin/clients/${client.tenantId}`} className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 text-xs font-medium">
                        <Eye className="w-3.5 h-3.5" /> View
                      </Link>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>
    </div>
  );
}
