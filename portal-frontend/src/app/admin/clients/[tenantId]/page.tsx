"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import { Building2, CreditCard, FileText, Calendar, ArrowLeft, Plus, Power, Edit, History, Database, CheckCircle2, AlertCircle, MapPin, Mail, Phone, Clock } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { StatusBadge } from "@/components/shared/status-badge";
import { AddCreditsModal } from "@/components/clients/add-credits-modal";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";

export default function ClientDetailPage() {
  const { tenantId } = useParams<{ tenantId: string }>();
  const queryClient = useQueryClient();
  const [creditsOpen, setCreditsOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [toggling, setToggling] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "clients", tenantId],
    queryFn: () => apiClient(`/admin/clients/${tenantId}`),
  });

  const client = data?.data?.client;
  const recentReports = data?.data?.recentReports || [];

  async function handleToggle() {
    setToggling(true);
    try {
      const res = await apiClient<{ data: { isLive: boolean } }>(`/admin/clients/${tenantId}/toggle`, { method: "POST" });
      toast.success(`Client ${res.data.isLive ? "enabled" : "disabled"}`);
      queryClient.invalidateQueries({ queryKey: ["admin", "clients", tenantId] });
      queryClient.invalidateQueries({ queryKey: ["admin", "clients"] });
      setConfirmOpen(false);
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
    return <div className="text-center py-20 text-slate-500 font-medium">Network not found</div>;
  }

  const daysRemaining = client.subscriptionEndDate
    ? Math.max(0, Math.ceil((new Date(client.subscriptionEndDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : null;
  const creditsPercent = client.totalCredits > 0 ? Math.round((client.remainingCredits / client.totalCredits) * 100) : 0;
  
  // Donut chart logic
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const dashoffset = circumference - (creditsPercent / 100) * circumference;

  // Timeline logic
  const startDate = client.subscriptionStartDate ? new Date(client.subscriptionStartDate).getTime() : 0;
  const endDate = client.subscriptionEndDate ? new Date(client.subscriptionEndDate).getTime() : 0;
  const totalDuration = endDate > startDate ? endDate - startDate : 1;
  const elapsed = Math.max(0, Date.now() - startDate);
  const subPercent = endDate > startDate ? Math.max(0, Math.min(100, (elapsed / totalDuration) * 100)) : 0;

  return (
    <div className="space-y-6 pb-10">
      
      {/* Back Link */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
        <Link href="/admin/clients" className="inline-flex items-center gap-1.5 text-[13px] font-bold text-slate-400 hover:text-slate-800 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Directory
        </Link>
      </motion.div>

      {/* Hero Profile Card */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        className="relative bg-slate-950 rounded-3xl p-8 overflow-hidden shadow-[0_20px_40px_rgba(15,23,42,0.15)] flex flex-col lg:flex-row lg:items-center justify-between gap-6 border border-slate-900">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff0a_1px,transparent_1px),linear-gradient(to_bottom,#ffffff0a_1px,transparent_1px)] bg-[size:24px_24px] opacity-30"></div>
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 to-transparent mix-blend-overlay"></div>
        
        <div className="relative z-10 flex items-center gap-5">
          <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-[0_0_20px_rgba(255,255,255,0.1)] text-slate-950 text-3xl font-black tracking-tighter">
            {client.labName.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold text-white tracking-tight">{client.labName}</h1>
              <div className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-widest border ${client.isLive ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-slate-800 text-slate-400 border-slate-700'}`}>
                {client.isLive ? 'Live Active' : 'Inactive'}
              </div>
            </div>
            <p className="text-slate-400 font-mono text-sm mt-1.5">{client.tenantId}</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="relative z-10 flex flex-wrap items-center gap-2">
          <button onClick={() => setCreditsOpen(true)} className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white text-[13px] font-bold px-4 py-2.5 rounded-xl transition-all shadow-[0_0_15px_rgba(37,99,235,0.4)]">
            <Plus className="w-4 h-4" /> Credits
          </button>
          <Link href={`/admin/mappings?tab=clients&tenant=${client.tenantId}`}
            className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-white backdrop-blur-md border border-white/10 text-[13px] font-bold px-4 py-2.5 rounded-xl transition-all">
            <Database className="w-4 h-4" /> Map
          </Link>
          <Link href={`/admin/clients/${client.tenantId}/edit`} 
            className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-white backdrop-blur-md border border-white/10 text-[13px] font-bold px-4 py-2.5 rounded-xl transition-all">
            <Edit className="w-4 h-4" /> Config
          </Link>
          <button onClick={() => setConfirmOpen(true)} disabled={toggling}
            className={`flex items-center gap-1.5 text-[13px] font-bold px-4 py-2.5 rounded-xl transition-all backdrop-blur-md border ${
              client.isLive ? "bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20" : "bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20"
            }`}>
            <Power className="w-4 h-4" /> {client.isLive ? "Halt" : "Start"}
          </button>
        </div>
      </motion.div>

      {/* Info Bento Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Credits */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-2"><CreditCard className="w-5 h-5 text-violet-600" /><span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Credits</span></div>
            <div className="px-3 py-1 bg-violet-50 text-violet-700 rounded-full text-[11px] font-black uppercase tracking-widest">{creditsPercent}% Left</div>
          </div>
          
          <div>
            <div className="flex items-baseline gap-3 mb-2">
              <h2 className="text-3xl font-black text-slate-900 tracking-tighter">{client.remainingCredits?.toLocaleString()}</h2>
              <span className="text-sm font-bold text-slate-400 uppercase tracking-wider">Available</span>
            </div>
            <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden mt-6 mb-3">
              <motion.div initial={{ width: 0 }} animate={{ width: `${creditsPercent}%` }} transition={{ duration: 1, delay: 0.2 }} className="h-full bg-violet-500 rounded-full" />
            </div>
            <div className="flex justify-between items-center text-xs font-bold text-slate-500">
              <span>{client.usedCredits?.toLocaleString()} Used</span>
              <span>{client.totalCredits?.toLocaleString()} Total</span>
            </div>
          </div>
        </motion.div>

        {/* Subscription */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
          className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-2"><Calendar className="w-5 h-5 text-blue-600" /><span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Subscription</span></div>
            <div className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-[11px] font-black uppercase tracking-widest">{client.plan || "Starter"}</div>
          </div>
          
          <div>
            <div className="flex items-baseline gap-3 mb-2">
              <h2 className="text-3xl font-black text-slate-900 tracking-tighter">{daysRemaining ?? "—"}</h2>
              {daysRemaining !== null && <span className="text-sm font-bold text-slate-400 uppercase tracking-wider">Days Left</span>}
            </div>
            
            <div className="flex items-center gap-6 mt-6">
              <div className="flex-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Start Date</p>
                <p className="text-sm font-bold text-slate-800">{client.subscriptionStartDate ? new Date(client.subscriptionStartDate).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" }) : "—"}</p>
              </div>
              <div className="w-px h-8 bg-slate-200"></div>
              <div className="flex-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">End Date</p>
                <p className="text-sm font-bold text-slate-800">{client.subscriptionEndDate ? new Date(client.subscriptionEndDate).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" }) : "—"}</p>
              </div>
              <div className="w-px h-8 bg-slate-200"></div>
              <div className="flex-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Auto-Renew</p>
                <p className={`text-sm font-bold ${client.autoRenew ? 'text-emerald-600' : 'text-slate-400'}`}>{client.autoRenew ? "Enabled" : "Disabled"}</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Contact info Bento (Full Width Row) */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="lg:col-span-2 bg-slate-50/80 rounded-3xl border border-slate-200 p-8 shadow-sm">
          <div className="flex items-center gap-2 mb-8"><Building2 className="w-5 h-5 text-slate-500" /><span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Contact & Location</span></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="w-4 h-4 text-slate-400" />
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Primary Contact</p>
              </div>
              <p className="font-bold text-slate-900 text-sm">{client.contactPerson || "—"}</p>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Mail className="w-4 h-4 text-slate-400" />
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Email Address</p>
              </div>
              <p className="font-bold text-slate-900 text-sm">{client.contactEmail || "—"}</p>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Phone className="w-4 h-4 text-slate-400" />
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Phone Number</p>
              </div>
              <p className="font-bold text-slate-900 font-mono text-sm">{client.contactPhone || "—"}</p>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-2">
                <MapPin className="w-4 h-4 text-slate-400" />
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Location</p>
              </div>
              <p className="font-bold text-slate-900 text-sm">{client.city ? `${client.city}, ${client.state}` : "—"}</p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Payment & Reports Data Grids */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        
        {/* Reports Grid */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
          className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[400px]">
          <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2"><FileText className="w-4 h-4 text-slate-400" /><h2 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Recent Reports</h2></div>
            <Link href={`/admin/reports?tenantId=${tenantId}`} className="text-[11px] font-black uppercase tracking-wider text-blue-600 hover:text-blue-700 transition-colors">View All</Link>
          </div>
          <div className="overflow-y-auto flex-1">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-white shadow-[0_1px_0_#f1f5f9] z-10">
                <tr>
                  <th className="text-left px-6 py-3 font-bold text-slate-400 uppercase tracking-wider text-[10px]">Patient</th>
                  <th className="text-left px-6 py-3 font-bold text-slate-400 uppercase tracking-wider text-[10px]">Status</th>
                  <th className="text-right px-6 py-3 font-bold text-slate-400 uppercase tracking-wider text-[10px]">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {recentReports.length === 0 ? (
                  <tr><td colSpan={3} className="px-6 py-10 text-center text-slate-400 font-medium">No reports generated yet</td></tr>
                ) : (
                  recentReports.map((r: any) => (
                    <tr key={r._id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-6 py-3">
                        <Link href={`/admin/reports/${r._id}`} className="block group">
                          <p className="font-bold text-slate-800 group-hover:text-blue-600 transition-colors text-[13px]">{r.patientName}</p>
                          <p className="text-[11px] font-mono font-bold text-slate-400">{r.labNo}</p>
                        </Link>
                      </td>
                      <td className="px-6 py-3"><StatusBadge status={r.status} /></td>
                      <td className="px-6 py-3 text-right text-[12px] font-bold text-slate-500">{new Date(r.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </motion.div>

        {/* Payments Grid */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[400px]">
          <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2"><History className="w-4 h-4 text-slate-400" /><h2 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Payment History</h2></div>
          </div>
          <div className="overflow-y-auto flex-1">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-white shadow-[0_1px_0_#f1f5f9] z-10">
                <tr>
                  <th className="text-left px-6 py-3 font-bold text-slate-400 uppercase tracking-wider text-[10px]">Date</th>
                  <th className="text-left px-6 py-3 font-bold text-slate-400 uppercase tracking-wider text-[10px]">Note</th>
                  <th className="text-right px-6 py-3 font-bold text-slate-400 uppercase tracking-wider text-[10px]">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {!client.payments || client.payments.length === 0 ? (
                  <tr><td colSpan={3} className="px-6 py-10 text-center text-slate-400 font-medium">No payment history</td></tr>
                ) : (
                  client.payments.slice().reverse().map((p: any, i: number) => (
                    <tr key={i} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-6 py-3 text-slate-600 font-bold text-[12px]">{new Date(p.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</td>
                      <td className="px-6 py-3">
                        <p className="text-slate-800 text-[12px] font-bold">{p.method || "—"}</p>
                        <p className="text-[11px] font-bold text-slate-400">{p.note || "—"}</p>
                      </td>
                      <td className="px-6 py-3 text-right">
                        <p className="font-mono font-black text-slate-800 tracking-tighter">₹{p.amount?.toLocaleString()}</p>
                        <p className="font-mono text-[11px] font-black text-emerald-600 bg-emerald-50 inline-block px-1.5 py-0.5 rounded mt-1">+{p.credits?.toLocaleString()} cr</p>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </motion.div>

      </div>

      {/* Modals */}
      <AddCreditsModal open={creditsOpen} onClose={() => setCreditsOpen(false)} tenantId={client.tenantId} labName={client.labName} />
      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleToggle}
        loading={toggling}
        variant={client.isLive ? "danger" : "default"}
        title={client.isLive ? `Disable ${client.labName}?` : `Enable ${client.labName}?`}
        confirmLabel={client.isLive ? "Disable Network" : "Enable Network"}
        message={
          client.isLive ? (
            <>
              This network will be taken offline. They will <strong>no longer be able to generate reports</strong> until
              re-enabled. Existing data and credits are kept.
            </>
          ) : (
            <>This network will be brought back online and can generate reports again.</>
          )
        }
      />
    </div>
  );
}
