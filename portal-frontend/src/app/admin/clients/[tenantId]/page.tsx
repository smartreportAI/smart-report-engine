"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import { Building2, CreditCard, FileText, Calendar, ArrowLeft, Plus, Power, Edit, History } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { StatusBadge } from "@/components/shared/status-badge";
import { AddCreditsModal } from "@/components/clients/add-credits-modal";
import { EditClientModal } from "@/components/clients/edit-client-modal";

export default function ClientDetailPage() {
  const { tenantId } = useParams<{ tenantId: string }>();
  const queryClient = useQueryClient();
  const [creditsOpen, setCreditsOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [toggling, setToggling] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "clients", tenantId],
    queryFn: () => apiClient(`/admin/clients/${tenantId}`),
  });

  const client = data?.data?.client;
  const recentReports = data?.data?.recentReports || [];
  const stats = data?.data?.stats;

  async function handleToggle() {
    setToggling(true);
    try {
      const res = await apiClient<{ data: { isLive: boolean } }>(`/admin/clients/${tenantId}/toggle`, { method: "POST" });
      toast.success(`Client ${res.data.isLive ? "enabled" : "disabled"}`);
      queryClient.invalidateQueries({ queryKey: ["admin", "clients", tenantId] });
    } catch (err: any) {
      toast.error(err.message || "Failed to toggle");
    } finally {
      setToggling(false);
    }
  }

  if (isLoading) {
    return <div className="flex items-center justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" /></div>;
  }

  if (!client) {
    return <div className="text-center py-20 text-slate-500">Client not found</div>;
  }

  const daysRemaining = client.subscriptionEndDate
    ? Math.max(0, Math.ceil((new Date(client.subscriptionEndDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : null;
  const creditsPercent = client.totalCredits > 0 ? Math.round((client.remainingCredits / client.totalCredits) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Back + Header + Actions */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
        <Link href="/admin/clients" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-blue-600 mb-3">
          <ArrowLeft className="w-4 h-4" /> Back to Clients
        </Link>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center border border-blue-100">
              <Building2 className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">{client.labName}</h1>
              <p className="text-sm text-slate-500 font-mono">{client.tenantId}</p>
            </div>
            <span className="ml-2"><StatusBadge status={client.status || (client.isLive ? "active" : "inactive")} /></span>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <button onClick={() => setCreditsOpen(true)} className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-3.5 py-2 rounded-lg transition-colors">
              <Plus className="w-4 h-4" /> Add Credits
            </button>
            <button onClick={() => setEditOpen(true)} className="flex items-center gap-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-sm font-medium px-3.5 py-2 rounded-lg transition-colors">
              <Edit className="w-4 h-4" /> Edit
            </button>
            <button onClick={handleToggle} disabled={toggling}
              className={`flex items-center gap-1.5 text-sm font-medium px-3.5 py-2 rounded-lg transition-colors border ${
                client.isLive ? "bg-white border-red-200 text-red-600 hover:bg-red-50" : "bg-white border-emerald-200 text-emerald-600 hover:bg-emerald-50"
              }`}>
              <Power className="w-4 h-4" /> {client.isLive ? "Disable" : "Enable"}
            </button>
          </div>
        </div>
      </motion.div>

      {/* Info Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-3"><CreditCard className="w-4 h-4 text-violet-600" /><span className="text-sm font-medium text-slate-600">Credits</span></div>
          <p className="text-3xl font-bold text-slate-900">{client.remainingCredits?.toLocaleString()}</p>
          <div className="mt-2 w-full h-2 bg-slate-100 rounded-full overflow-hidden">
            <motion.div initial={{ width: 0 }} animate={{ width: `${creditsPercent}%` }} transition={{ duration: 0.8, delay: 0.3 }} className="h-full bg-violet-500 rounded-full" />
          </div>
          <p className="text-xs text-slate-400 mt-1">{client.usedCredits} used of {client.totalCredits} total</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
          className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-3"><Calendar className="w-4 h-4 text-blue-600" /><span className="text-sm font-medium text-slate-600">Subscription</span></div>
          <p className="text-3xl font-bold text-slate-900">{daysRemaining ?? "—"}</p>
          <p className="text-sm text-slate-500">days remaining</p>
          {client.subscriptionEndDate && <p className="text-xs text-slate-400 mt-1">Expires {new Date(client.subscriptionEndDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</p>}
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-3"><FileText className="w-4 h-4 text-emerald-600" /><span className="text-sm font-medium text-slate-600">Reports</span></div>
          <p className="text-3xl font-bold text-slate-900">{stats?.totalReports ?? 0}</p>
          <p className="text-sm text-slate-500">total generated</p>
          <p className="text-xs text-slate-400 mt-1">{stats?.failures ?? 0} failures</p>
        </motion.div>
      </div>

      {/* Contact + Subscription Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
          className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <h2 className="text-base font-semibold text-slate-900 mb-3">Contact Information</h2>
          <div className="space-y-2.5 text-sm">
            <div className="flex justify-between"><span className="text-slate-500">Email</span><span className="text-slate-900">{client.contactEmail || "—"}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Phone</span><span className="text-slate-900">{client.contactPhone || "—"}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Contact Person</span><span className="text-slate-900">{client.contactPerson || "—"}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">City</span><span className="text-slate-900">{client.city || "—"}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">State</span><span className="text-slate-900">{client.state || "—"}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Plan</span><span className="text-slate-900 capitalize">{client.plan || "—"}</span></div>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <h2 className="text-base font-semibold text-slate-900 mb-3">Subscription Details</h2>
          <div className="space-y-2.5 text-sm">
            <div className="flex justify-between"><span className="text-slate-500">Status</span><StatusBadge status={client.status || "active"} /></div>
            <div className="flex justify-between"><span className="text-slate-500">Start Date</span><span className="text-slate-900">{client.subscriptionStartDate ? new Date(client.subscriptionStartDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—"}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">End Date</span><span className="text-slate-900">{client.subscriptionEndDate ? new Date(client.subscriptionEndDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—"}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Trial Ends</span><span className="text-slate-900">{client.trialEndDate ? new Date(client.trialEndDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "No trial"}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Live Date</span><span className="text-slate-900">{client.liveDate ? new Date(client.liveDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—"}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Auto-Renew</span><span className="text-slate-900">{client.autoRenew ? "Yes" : "No"}</span></div>
          </div>
        </motion.div>
      </div>

      {/* Payment History */}
      {client.payments?.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
          className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2"><History className="w-4 h-4 text-slate-400" /><h2 className="text-base font-semibold text-slate-900">Payment History</h2></div>
          <table className="w-full text-sm">
            <thead><tr className="bg-slate-50 border-b border-slate-200">
              <th className="text-left px-5 py-2.5 font-medium text-slate-600">Date</th>
              <th className="text-left px-5 py-2.5 font-medium text-slate-600">Method</th>
              <th className="text-left px-5 py-2.5 font-medium text-slate-600">Note</th>
              <th className="text-right px-5 py-2.5 font-medium text-slate-600">Amount</th>
              <th className="text-right px-5 py-2.5 font-medium text-slate-600">Credits</th>
            </tr></thead>
            <tbody>
              {client.payments.slice().reverse().map((p: any, i: number) => (
                <tr key={i} className="border-b border-slate-50 hover:bg-slate-50">
                  <td className="px-5 py-2.5 text-slate-600">{new Date(p.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</td>
                  <td className="px-5 py-2.5 text-slate-600 capitalize">{p.method || "—"}</td>
                  <td className="px-5 py-2.5 text-slate-500">{p.note || "—"}</td>
                  <td className="px-5 py-2.5 text-right font-mono text-slate-900">₹{p.amount?.toLocaleString()}</td>
                  <td className="px-5 py-2.5 text-right font-mono text-emerald-600">+{p.credits?.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </motion.div>
      )}

      {/* Recent Reports */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
        className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-900">Recent Reports</h2>
          <Link href={`/admin/reports?tenantId=${tenantId}`} className="text-xs text-blue-600 hover:underline">View all</Link>
        </div>
        {recentReports.length === 0 ? (
          <div className="p-6 text-center text-sm text-slate-400">No reports yet</div>
        ) : (
          <table className="w-full text-sm">
            <thead><tr className="bg-slate-50 border-b border-slate-200">
              <th className="text-left px-5 py-2.5 font-medium text-slate-600">Lab No</th>
              <th className="text-left px-5 py-2.5 font-medium text-slate-600">Patient</th>
              <th className="text-left px-5 py-2.5 font-medium text-slate-600">Status</th>
              <th className="text-right px-5 py-2.5 font-medium text-slate-600">Abnormals</th>
              <th className="text-right px-5 py-2.5 font-medium text-slate-600">Date</th>
            </tr></thead>
            <tbody>
              {recentReports.map((r: any) => (
                <tr key={r._id} className="border-b border-slate-50 hover:bg-slate-50">
                  <td className="px-5 py-2.5"><Link href={`/admin/reports/${r._id}`} className="font-mono text-xs text-blue-600 hover:underline">{r.labNo}</Link></td>
                  <td className="px-5 py-2.5 text-slate-900">{r.patientName}</td>
                  <td className="px-5 py-2.5"><StatusBadge status={r.status} /></td>
                  <td className="px-5 py-2.5 text-right">{r.abnormalCount > 0 ? <span className="text-red-600 font-medium">{r.abnormalCount}</span> : <span className="text-slate-400">0</span>}</td>
                  <td className="px-5 py-2.5 text-right text-slate-500">{new Date(r.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </motion.div>

      {/* Modals */}
      <AddCreditsModal open={creditsOpen} onClose={() => setCreditsOpen(false)} tenantId={client.tenantId} labName={client.labName} />
      <EditClientModal open={editOpen} onClose={() => setEditOpen(false)} client={client} />
    </div>
  );
}
