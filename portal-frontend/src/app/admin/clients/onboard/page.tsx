"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { apiClient } from "@/lib/api/client";
import { toast } from "sonner";
import { 
  ArrowLeft, ArrowRight, Check, Building2, Calendar, KeyRound, Loader2, 
  Mail, Phone, User, MapPin, Fingerprint, Palette, LayoutList, FileText,
  CreditCard, CalendarDays, RefreshCw
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

const STEPS = [
  { id: 1, label: "Lab Identity", icon: Building2 },
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
    city: "", state: "", plan: "starter", reportType: "inDepth", primaryColor: "#059669", webViewer: true,
    // Step 2
    subscriptionStartDate: "", subscriptionEndDate: "", initialCredits: "500", autoRenew: true,
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

  // Premium Field Wrapper Component
  const Field = ({ label, icon: Icon, children }: any) => (
    <div>
      <label className="block text-[13px] font-semibold text-slate-700 mb-1.5 ml-0.5">{label}</label>
      <div className="relative">
        {Icon && (
          <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
            <Icon className="w-4 h-4" />
          </div>
        )}
        {children}
      </div>
    </div>
  );

  const inputClass = (hasIcon: boolean) => cn(
    "w-full bg-slate-50/50 border border-slate-200/80 rounded-xl text-[14px] text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all shadow-sm",
    hasIcon ? "pl-10 pr-4 py-2.5" : "px-4 py-2.5"
  );

  const Section = ({ title, children }: any) => (
    <div className="bg-slate-50/40 rounded-2xl border border-slate-100 p-5 space-y-5">
      {title && <h3 className="text-[13px] font-bold tracking-wider text-slate-500 uppercase mb-4">{title}</h3>}
      {children}
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="text-center">
        <Link href="/admin/clients" className="inline-flex items-center gap-1.5 text-[13px] font-medium text-slate-500 hover:text-emerald-600 mb-4 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Directory
        </Link>
        <h1 className="text-[32px] font-extrabold text-slate-900 tracking-tight">Onboard New Client</h1>
        <p className="text-[15px] text-slate-500 mt-2 font-medium">Create a lab account and configure credentials in one seamless step</p>
      </motion.div>

      {/* Premium Stepper */}
      <div className="flex items-center justify-between max-w-2xl mx-auto relative z-10 px-4">
        {STEPS.map((s, i) => {
          const Icon = s.icon;
          const isActive = step === s.id;
          const isDone = step > s.id;
          return (
            <div key={s.id} className="flex items-center flex-1 last:flex-none relative">
              <div className="flex flex-col items-center">
                <div className={cn(
                  "w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300 shadow-sm z-10",
                  isDone ? "bg-emerald-500 text-white shadow-emerald-500/20" : 
                  isActive ? "bg-emerald-600 text-white shadow-emerald-600/30 scale-110" : 
                  "bg-white border-2 border-slate-100 text-slate-400"
                )}>
                  {isDone ? <Check className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
                </div>
                <span className={cn(
                  "text-[13px] mt-3 transition-colors absolute top-12 whitespace-nowrap hidden sm:block",
                  isActive ? "font-bold text-emerald-700" : "font-semibold text-slate-400"
                )}>
                  {s.label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div className="flex-1 px-4 z-0">
                  <div className={cn("h-1 w-full rounded-full transition-colors duration-500", step > s.id ? "bg-emerald-500" : "bg-slate-100")} />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Form Wizard Container */}
      <div className="relative mt-16 bg-white border border-slate-200/60 rounded-[2rem] shadow-xl shadow-slate-200/40 p-6 sm:p-10 min-h-[400px]">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, y: 10, filter: "blur(4px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -10, filter: "blur(4px)" }}
            transition={{ duration: 0.25, ease: "easeOut" }}
          >
            {step === 1 && (
              <div className="space-y-6">
                
                <Section title="Core Identity">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <Field label="Tenant ID *" icon={Fingerprint}>
                      <input type="text" value={form.tenantId} onChange={(e) => update("tenantId", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))} placeholder="e.g. rajagiri-labs" className={cn(inputClass(true), "font-mono")} />
                    </Field>
                    <Field label="Lab Name *" icon={Building2}>
                      <input type="text" value={form.labName} onChange={(e) => update("labName", e.target.value)} placeholder="Rajagiri Hospital" className={inputClass(true)} />
                    </Field>
                  </div>
                </Section>

                <Section title="Contact Information">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <Field label="Contact Email" icon={Mail}>
                      <input type="email" value={form.contactEmail} onChange={(e) => update("contactEmail", e.target.value)} placeholder="lab@example.com" className={inputClass(true)} />
                    </Field>
                    <Field label="Contact Phone" icon={Phone}>
                      <input type="text" value={form.contactPhone} onChange={(e) => update("contactPhone", e.target.value)} placeholder="+91 98765 43210" className={inputClass(true)} />
                    </Field>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                    <Field label="Contact Person" icon={User}>
                      <input type="text" value={form.contactPerson} onChange={(e) => update("contactPerson", e.target.value)} placeholder="Dr. Sharma" className={inputClass(true)} />
                    </Field>
                    <Field label="City" icon={MapPin}>
                      <input type="text" value={form.city} onChange={(e) => update("city", e.target.value)} placeholder="Mumbai" className={inputClass(true)} />
                    </Field>
                    <Field label="State" icon={MapPin}>
                      <input type="text" value={form.state} onChange={(e) => update("state", e.target.value)} placeholder="MH" className={inputClass(true)} />
                    </Field>
                  </div>
                </Section>

                <Section title="Configuration & Settings">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <Field label="Pricing Plan" icon={LayoutList}>
                      <select value={form.plan} onChange={(e) => update("plan", e.target.value)} className={inputClass(true)}>
                        <option value="free">Free Tier</option><option value="starter">Starter Plan</option><option value="pro">Professional</option><option value="enterprise">Enterprise</option>
                      </select>
                    </Field>
                    <Field label="Report Type" icon={FileText}>
                      <select value={form.reportType} onChange={(e) => update("reportType", e.target.value)} className={inputClass(true)}>
                        <option value="inDepth">In-Depth Reporting</option><option value="essential">Essential Diagnostics</option>
                      </select>
                    </Field>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-8 pt-2">
                    <div className="flex items-center gap-4 bg-white px-4 py-3 rounded-xl border border-slate-200 shadow-sm">
                      <div className="relative">
                        <input type="color" value={form.primaryColor} onChange={(e) => update("primaryColor", e.target.value)} className="w-10 h-10 border-0 p-0 rounded-lg cursor-pointer focus:outline-none" />
                        <div className="absolute inset-0 ring-1 ring-inset ring-black/10 rounded-lg pointer-events-none" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[13px] font-bold text-slate-700">Brand Color</span>
                        <span className="text-[11px] font-mono text-slate-500 uppercase">{form.primaryColor}</span>
                      </div>
                    </div>
                    
                    <label className="flex items-center gap-4 cursor-pointer group bg-white px-5 py-4 rounded-xl border border-slate-200 shadow-sm flex-1">
                      <div className={cn("w-12 h-7 rounded-full transition-colors duration-300 relative shrink-0", form.webViewer ? "bg-emerald-500" : "bg-slate-200")}>
                        <div className={cn("absolute top-1 w-5 h-5 bg-white rounded-full transition-transform duration-300 shadow-sm", form.webViewer ? "left-6" : "left-1")} />
                      </div>
                      <input type="checkbox" checked={form.webViewer} onChange={(e) => update("webViewer", e.target.checked)} className="sr-only" />
                      <div className="flex flex-col">
                        <span className="text-[14px] font-bold text-slate-800 transition-colors">Patient Web Viewer</span>
                        <span className="text-[12px] font-medium text-slate-500">Enable interactive digital reports</span>
                      </div>
                    </label>
                  </div>
                </Section>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-6">
                <Section title="Billing Cycle">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <Field label="Subscription Start *" icon={CalendarDays}>
                      <input type="date" value={form.subscriptionStartDate} onChange={(e) => update("subscriptionStartDate", e.target.value)} className={inputClass(true)} />
                    </Field>
                    <Field label="Subscription End *" icon={CalendarDays}>
                      <input type="date" value={form.subscriptionEndDate} onChange={(e) => update("subscriptionEndDate", e.target.value)} className={inputClass(true)} />
                    </Field>
                  </div>
                </Section>

                <Section title="Terms & Credits">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <Field label="Trial End Date (Optional)" icon={CalendarDays}>
                      <input type="date" value={form.trialEndDate} onChange={(e) => update("trialEndDate", e.target.value)} className={inputClass(true)} />
                    </Field>
                    <Field label="Initial Report Credits" icon={CreditCard}>
                      <input type="number" min="0" value={form.initialCredits} onChange={(e) => update("initialCredits", e.target.value)} className={inputClass(true)} />
                    </Field>
                  </div>
                </Section>

                <Section>
                  <label className="flex items-center gap-4 cursor-pointer group bg-white px-5 py-4 rounded-xl border border-slate-200 shadow-sm">
                    <div className={cn("w-12 h-7 rounded-full transition-colors duration-300 relative shrink-0", form.autoRenew ? "bg-emerald-500" : "bg-slate-200")}>
                      <div className={cn("absolute top-1 w-5 h-5 bg-white rounded-full transition-transform duration-300 shadow-sm", form.autoRenew ? "left-6" : "left-1")} />
                    </div>
                    <input type="checkbox" checked={form.autoRenew} onChange={(e) => update("autoRenew", e.target.checked)} className="sr-only" />
                    <div className="flex flex-col">
                      <span className="text-[14px] font-bold text-slate-800 transition-colors">Auto-renew Subscription</span>
                      <span className="text-[12px] font-medium text-slate-500">Automatically invoice and refill credits when running low</span>
                    </div>
                  </label>
                </Section>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-6">
                <div className="bg-emerald-50/50 border border-emerald-100 rounded-2xl p-6 flex items-start gap-4">
                  <div className="bg-emerald-100 text-emerald-600 p-3 rounded-xl shadow-sm shrink-0">
                    <KeyRound className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-[16px] font-bold text-emerald-900 tracking-tight">Initial Login Credentials</h4>
                    <p className="text-[14px] text-emerald-800/80 mt-1.5 font-medium leading-relaxed max-w-xl">
                      This establishes the primary administrator account for the client. They will use this email and password to log into their dashboard to view reports.
                    </p>
                  </div>
                </div>

                <Section title="Administrator Identity">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <Field label="Full Name *" icon={User}>
                      <input type="text" value={form.userName} onChange={(e) => update("userName", e.target.value)} placeholder="Lab Admin" className={inputClass(true)} />
                    </Field>
                    <Field label="Phone Number" icon={Phone}>
                      <input type="text" value={form.userPhone} onChange={(e) => update("userPhone", e.target.value)} placeholder="+91 98765 43210" className={inputClass(true)} />
                    </Field>
                  </div>
                </Section>

                <Section title="Security & Authentication">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <Field label="Login Email *" icon={Mail}>
                      <input type="email" value={form.userEmail} onChange={(e) => update("userEmail", e.target.value)} placeholder="admin@lab.com" className={inputClass(true)} />
                    </Field>
                    <Field label="Password *" icon={KeyRound}>
                      <input type="text" value={form.userPassword} onChange={(e) => update("userPassword", e.target.value)} placeholder="Set a strong password (min 8 chars)" className={inputClass(true)} />
                    </Field>
                  </div>
                </Section>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Navigation Actions */}
        <div className="flex justify-between items-center mt-10 pt-6 border-t border-slate-100">
          <button onClick={() => setStep((s) => Math.max(1, s - 1))} disabled={step === 1}
            className="flex items-center gap-2 px-6 py-3 text-[14px] font-bold text-slate-500 hover:text-slate-900 disabled:opacity-0 transition-all">
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          
          {step < 3 ? (
            <button onClick={() => setStep((s) => s + 1)} disabled={!canProceed()}
              className="flex items-center gap-2 px-8 py-3 text-[14px] font-bold bg-slate-900 hover:bg-emerald-600 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-xl shadow-lg shadow-slate-900/20 transition-all duration-300 transform active:scale-95">
              Continue <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button onClick={handleSubmit} disabled={!canProceed() || submitting}
              className="flex items-center gap-2 px-8 py-3 text-[14px] font-bold bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-200 disabled:text-white/60 text-white rounded-xl shadow-lg shadow-emerald-600/20 transition-all duration-300 transform active:scale-95 min-w-[200px] justify-center">
              {submitting ? (
                <><Loader2 className="w-5 h-5 animate-spin" /> Provisioning Account...</>
              ) : (
                <>Complete Setup <Check className="w-5 h-5" /></>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
