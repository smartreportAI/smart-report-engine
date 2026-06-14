"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { motion } from "framer-motion";
import { FileText, Search } from "lucide-react";
import { useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { TableSkeleton } from "@/components/shared/table-skeleton";

export default function ReportsPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [sourceFilter, setSourceFilter] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "reports", search, statusFilter, sourceFilter, fromDate, toDate],
    queryFn: () =>
      apiClient(
        `/admin/reports?page=1&limit=50` +
        (search ? `&search=${search}` : "") +
        (statusFilter ? `&status=${statusFilter}` : "") +
        (sourceFilter ? `&source=${sourceFilter}` : "") +
        (fromDate ? `&from=${fromDate}` : "") +
        (toDate ? `&to=${toDate}` : "")
      ),
  });

  const reports = data?.data || [];

  return (
    <div className="space-y-6">
      <PageHeader title="Reports" subtitle="All generated reports across clients" />

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by lab no or patient..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
          />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600">
          <option value="">All Status</option>
          <option value="completed">Completed</option>
          <option value="failed">Failed</option>
        </select>
        <select value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value)}
          className="px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600">
          <option value="">All Sources</option>
          <option value="json">JSON</option>
          <option value="fhir">FHIR</option>
          <option value="hl7">HL7</option>
        </select>
        <div className="flex items-center gap-1.5">
          <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} title="From date"
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600" />
          <span className="text-slate-400 text-sm">to</span>
          <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} title="To date"
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600" />
        </div>
        {(search || statusFilter || sourceFilter || fromDate || toDate) && (
          <button onClick={() => { setSearch(""); setStatusFilter(""); setSourceFilter(""); setFromDate(""); setToDate(""); }}
            className="text-sm text-slate-500 hover:text-blue-600 px-2">Clear</button>
        )}
      </div>

      {/* Table */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden"
      >
        {isLoading ? (
          <TableSkeleton rows={6} cols={6} />
        ) : reports.length === 0 ? (
          <EmptyState icon={FileText} title="No reports found" description="Reports will appear here once clients start generating them." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Lab No</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Patient</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Client</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Status</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600">Abnormals</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600">Date</th>
                </tr>
              </thead>
              <tbody>
                {reports.map((r: any, i: number) => (
                  <motion.tr
                    key={r._id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.03 }}
                    className="border-b border-slate-100 hover:bg-slate-50 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <Link href={`/admin/reports/${r._id}`} className="font-mono text-xs text-blue-600 hover:underline">
                        {r.labNo}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-slate-900">{r.patientName}</td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-500">{r.tenantId}</td>
                    <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                    <td className="px-4 py-3 text-right">
                      {r.abnormalCount > 0 ? (
                        <span className="inline-flex items-center justify-center min-w-6 px-1.5 py-0.5 rounded-md bg-red-50 text-red-600 text-xs font-semibold">{r.abnormalCount}</span>
                      ) : (
                        <span className="text-slate-400">0</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-500">
                      {new Date(r.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
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
