"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { apiClient } from "@/lib/api/client";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Check, Building2, Calendar, KeyRound } from "lucide-react";
import Link from "next/link";

const STEPS = [
  { id: 1, label: "Lab Details", icon: Building2 },
  { id: 2, label: "Subscription", icon: Calendar },
  { id: 3, label: "Login Account", icon: KeyRound },
];

export default function OnboardClientPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    // Step 1
    tenantId: "", labName: "", contactEmail: "", contactPhone: "", contactPerson: "",
    city: "", state: "", plan: "starter", reportType: "inDepth", primaryColor: "#2563eb", webViewer: false,
    // Step 2
    subscriptionStartDate: "", subscriptionEndDate: "", initialCredits: "500", autoRenew: false,
    trialEndDate: "",
    // Step 3
    userName: "", userEmail: "", userPassword: "", userPhone: "",
  });

  function update(field: string, value: any) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function canProceed(): boolean {
    if (step === 1) return !!(form.tenantId && form.labName);
    if (step === 2) return !!(form.subscriptionStartDate && form.subscriptionEndDate);
    if (step === 3) return !!(form.userName && form.userEmail && form.userPassword.length >= 8);
    return false;
  }

  async function handleSubmit() {
    setSubmitting(true);
    try {
      await apiClient("/admin/clients", {
        method: "POST",
        body: JSON.stringify({
          tenantId: form.tenantId,
          labName: form.labName,
          contactEmail: form.contactEmail || undefined,
          contactPhone: form.contactPhone || undefined,
          contactPerson: form.contactPerson || undefined,
          city: form.city || undefined,
          state: form.state || undefined,
          plan: form.plan,
          reportType: form.reportType,
          primaryColor: form.primaryColor,
          webViewer: form.webViewer,
          subscriptionStartDate: form.subscriptionStartDate,
          subscriptionEndDate: form.subscriptionEndDate,
          initialCredits: Number(form.initialCredits),
          autoRenew: form.autoRenew,
          trialEndDate: form.trialEndDate || undefined,
          userName: form.userName,
          userEmail: form.userEmail,
          userPassword: form.userPassword,
          userPhone: form.userPhone || undefined,
        }),
      });
      toast.success(`${form.labName} onboarded successfully`);
      router.push(`/admin/clients/${form.tenantId}`);
    } catch (err: any) {
      toast.error(err.message || "Failed to onboard client");
      setSubmitting(false);
    }
  }

  const inputClass = "w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600";
  const labelClass = "block text-sm font-medium text-slate-700 mb-1.5";

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
        <Link href="/admin/clients" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-blue-600 mb-3">
          <ArrowLeft className="w-4 h-4" /> Back to Clients
        </Link>
        <h1 className="text-2xl font-bold text-slate-900">Onboard New Client</h1>
        <p className="text-sm text-slate-500 mt-1">Create a lab account with login credentials in one step</p>
      </motion.div>

      {/* Stepper */}
      <div className="flex items-center justify-between">
        {STEPS.map((s, i) => {
          const Icon = s.icon;
          const isActive = step === s.id;
          const isDone = step > s.id;
          return (
            <div key={s.id} className="flex items-center flex-1 last:flex-none">
              <div className="flex flex-col items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                  isDone ? "bg-emerald-500 text-white" : isActive ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-400"
                }`}>
                  {isDone ? <Check className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
                </div>
                <span className={`text-xs mt-1.5 font-medium ${isActive ? "text-blue-600" : "text-slate-400"}`}>{s.label}</span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={`flex-1 h-0.5 mx-2 -mt-5 transition-colors ${step > s.id ? "bg-emerald-500" : "bg-slate-200"}`} />
              )}
            </div>
          );
        })}
      </div>

      {/* Form Card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 min-h-[320px]">
        <AnimatePresence mode="wait">
          <motion.div key={step} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} transition={{ duration: 0.2 }}>
            {step === 1 && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass}>Tenant ID *</label>
                    <input type="text" value={form.tenantId} onChange={(e) => update("tenantId", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))} placeholder="rajagiri-labs" className={`${inputClass} font-mono`} />
                  </div>
                  <div>
                    <label className={labelClass}>Lab Name *</label>
                    <input type="text" value={form.labName} onChange={(e) => update("labName", e.target.value)} placeholder="Rajagiri Hospital" className={inputClass} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className={labelClass}>Email</label><input type="email" value={form.contactEmail} onChange={(e) => update("contactEmail", e.target.value)} placeholder="lab@example.com" className={inputClass} /></div>
                  <div><label className={labelClass}>Phone</label><input type="text" value={form.contactPhone} onChange={(e) => update("contactPhone", e.target.value)} placeholder="+91-..." className={inputClass} /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className={labelClass}>Contact Person</label><input type="text" value={form.contactPerson} onChange={(e) => update("contactPerson", e.target.value)} placeholder="Dr. Sharma" className={inputClass} /></div>
                  <div><label className={labelClass}>City</label><input type="text" value={form.city} onChange={(e) => update("city", e.target.value)} className={inputClass} /></div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div><label className={labelClass}>State</label><input type="text" value={form.state} onChange={(e) => update("state", e.target.value)} className={inputClass} /></div>
                  <div><label className={labelClass}>Plan</label>
                    <select value={form.plan} onChange={(e) => update("plan", e.target.value)} className={inputClass}>
                      <option value="free">Free</option><option value="starter">Starter</option><option value="pro">Pro</option><option value="enterprise">Enterprise</option>
                    </select>
                  </div>
                  <div><label className={labelClass}>Report Type</label>
                    <select value={form.reportType} onChange={(e) => update("reportType", e.target.value)} className={inputClass}>
                      <option value="inDepth">In-Depth</option><option value="essential">Essential</option>
                    </select>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <label className={labelClass + " !mb-0"}>Brand Color</label>
                    <input type="color" value={form.primaryColor} onChange={(e) => update("primaryColor", e.target.value)} className="w-10 h-8 border border-slate-300 rounded cursor-pointer" />
                  </div>
                  <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                    <input type="checkbox" checked={form.webViewer} onChange={(e) => update("webViewer", e.target.checked)} className="rounded" />
                    Enable Patient Web Viewer
                  </label>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div><label className={labelClass}>Subscription Start *</label><input type="date" value={form.subscriptionStartDate} onChange={(e) => update("subscriptionStartDate", e.target.value)} className={inputClass} /></div>
                  <div><label className={labelClass}>Subscription End *</label><input type="date" value={form.subscriptionEndDate} onChange={(e) => update("subscriptionEndDate", e.target.value)} className={inputClass} /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className={labelClass}>Trial End Date</label><input type="date" value={form.trialEndDate} onChange={(e) => update("trialEndDate", e.target.value)} className={inputClass} /><p className="text-xs text-slate-400 mt-1">Leave empty for no trial</p></div>
                  <div><label className={labelClass}>Initial Credits</label><input type="number" min="0" value={form.initialCredits} onChange={(e) => update("initialCredits", e.target.value)} className={inputClass} /></div>
                </div>
                <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                  <input type="checkbox" checked={form.autoRenew} onChange={(e) => update("autoRenew", e.target.checked)} className="rounded" />
                  Auto-renew subscription
                </label>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-100 rounded-lg px-4 py-3 text-sm text-blue-700">
                  This creates the login account for the client to access their dashboard.
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className={labelClass}>Full Name *</label><input type="text" value={form.userName} onChange={(e) => update("userName", e.target.value)} placeholder="Lab Admin" className={inputClass} /></div>
                  <div><label className={labelClass}>Phone</label><input type="text" value={form.userPhone} onChange={(e) => update("userPhone", e.target.value)} className={inputClass} /></div>
                </div>
                <div><label className={labelClass}>Login Email *</label><input type="email" value={form.userEmail} onChange={(e) => update("userEmail", e.target.value)} placeholder="admin@lab.com" className={inputClass} /></div>
                <div><label className={labelClass}>Password * (min 8 chars)</label><input type="text" value={form.userPassword} onChange={(e) => update("userPassword", e.target.value)} placeholder="Set a strong password" className={inputClass} /></div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Navigation */}
      <div className="flex justify-between">
        <button onClick={() => setStep((s) => Math.max(1, s - 1))} disabled={step === 1}
          className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        {step < 3 ? (
          <button onClick={() => setStep((s) => s + 1)} disabled={!canProceed()}
            className="flex items-center gap-1.5 px-5 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded-lg transition-colors">
            Next <ArrowRight className="w-4 h-4" />
          </button>
        ) : (
          <button onClick={handleSubmit} disabled={!canProceed() || submitting}
            className="flex items-center gap-1.5 px-5 py-2 text-sm font-medium bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300 text-white rounded-lg transition-colors">
            {submitting ? "Creating..." : <>Create Client <Check className="w-4 h-4" /></>}
          </button>
        )}
      </div>
    </div>
  );
}
