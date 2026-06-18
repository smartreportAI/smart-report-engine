"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, Building2, CalendarClock, Palette, Save, Loader2, FileText } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { apiClient } from "@/lib/api/client";

/** Convert an ISO/date value to the yyyy-MM-dd string an <input type="date"> needs. */
function toDateInput(value?: string | null): string {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

const inputCls =
  "w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-shadow";
const labelCls = "block text-sm font-medium text-slate-700 mb-1.5";

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className={labelCls}>{label}</label>
      {children}
      {hint && <p className="text-xs text-slate-400 mt-1.5">{hint}</p>}
    </div>
  );
}

/**
 * Full-width section card: the header (icon + title + description) sits at
 * the top of the card, fields fill the entire width below. No empty side
 * column — uses the whole page like the popup did, just larger.
 */
function SectionCard({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: typeof Building2;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden"
    >
      <div className="flex items-start gap-3 px-6 py-4 border-b border-slate-100 bg-slate-50/60">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 border border-blue-100">
          <Icon className="h-4.5 w-4.5 text-blue-600" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
          <p className="text-xs text-slate-500 mt-0.5">{description}</p>
        </div>
      </div>
      <div className="p-6">{children}</div>
    </motion.section>
  );
}

export default function EditClientPage() {
  const { tenantId } = useParams<{ tenantId: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState<Record<string, any> | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "clients", tenantId],
    queryFn: () => apiClient(`/admin/clients/${tenantId}`),
  });

  const client = data?.data?.client;

  // Initialize the form once the client loads.
  if (client && form === null) {
    setForm({
      labName: client.labName || "",
      contactEmail: client.contactEmail || "",
      contactPhone: client.contactPhone || "",
      contactPerson: client.contactPerson || "",
      city: client.city || "",
      state: client.state || "",
      website: client.website || "",
      gstNumber: client.gstNumber || "",
      plan: client.plan || "starter",
      primaryColor: client.reportConfig?.branding?.primaryColor || "#2563eb",
      status: client.status || (client.isLive ? "active" : "suspended"),
      subscriptionStartDate: toDateInput(client.subscriptionStartDate),
      subscriptionEndDate: toDateInput(client.subscriptionEndDate),
      trialEndDate: toDateInput(client.trialEndDate),
      autoRenew: !!client.autoRenew,
      notes: client.notes || "",
      // Report config
      reportType: client.reportConfig?.reportType || "inDepth",
      pageOrder: (client.reportConfig?.pageOrder || []).join(", "),
      showCoverPage: client.reportConfig?.showCoverPage !== false,
      showBackPage: client.reportConfig?.showBackPage !== false,
      showRecommendations: client.reportConfig?.showRecommendations !== false,
      showSummary: client.reportConfig?.showSummary !== false,
      profileContinuation: !!client.reportConfig?.profileContinuation,
      strictMapping: !!client.reportConfig?.strictMapping,
      webViewer: !!client.reportConfig?.webViewer,
    });
  }

  function update(field: string, value: string | boolean) {
    setForm((f) => ({ ...(f as Record<string, any>), [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form) return;

    if (form.subscriptionStartDate && form.subscriptionEndDate &&
        form.subscriptionEndDate < form.subscriptionStartDate) {
      toast.error("End date must be after the start date.");
      return;
    }

    setSubmitting(true);
    try {
      await apiClient(`/admin/clients/${tenantId}`, {
        method: "PATCH",
        body: JSON.stringify({
          labName: form.labName,
          contactEmail: form.contactEmail || undefined,
          contactPhone: form.contactPhone || undefined,
          contactPerson: form.contactPerson || undefined,
          city: form.city || undefined,
          state: form.state || undefined,
          website: form.website || undefined,
          gstNumber: form.gstNumber || undefined,
          plan: form.plan,
          status: form.status,
          subscriptionStartDate: form.subscriptionStartDate || undefined,
          subscriptionEndDate: form.subscriptionEndDate || undefined,
          trialEndDate: form.trialEndDate ? form.trialEndDate : null,
          autoRenew: form.autoRenew,
          notes: form.notes || undefined,
          reportConfig: {
            reportType: form.reportType,
            pageOrder: form.pageOrder ? form.pageOrder.split(",").map((s: string) => s.trim()).filter(Boolean) : undefined,
            showCoverPage: form.showCoverPage,
            showBackPage: form.showBackPage,
            showRecommendations: form.showRecommendations,
            showSummary: form.showSummary,
            profileContinuation: form.profileContinuation,
            strictMapping: form.strictMapping,
            webViewer: form.webViewer,
            branding: { primaryColor: form.primaryColor },
          },
        }),
      });
      toast.success("Client updated successfully");
      queryClient.invalidateQueries({ queryKey: ["admin", "clients", tenantId] });
      queryClient.invalidateQueries({ queryKey: ["admin", "clients"] });
      router.push(`/admin/clients/${tenantId}`);
    } catch (err: any) {
      toast.error(err.message || "Failed to update client");
    } finally {
      setSubmitting(false);
    }
  }

  if (isLoading || !form) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-7 h-7 text-blue-600 animate-spin" />
      </div>
    );
  }

  if (!client) {
    return <div className="text-center py-20 text-slate-500">Client not found</div>;
  }

  return (
    <form onSubmit={handleSubmit} className="pb-28">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mb-2">
        <Link href={`/admin/clients/${tenantId}`} className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-blue-600 mb-3">
          <ArrowLeft className="w-4 h-4" /> Back to {client.labName}
        </Link>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Edit Client</h1>
            <p className="text-sm text-slate-500 mt-1 font-mono">{client.tenantId}</p>
          </div>
          {/* Top-right actions — visible without scrolling */}
          <div className="flex items-center gap-2">
            <Link href={`/admin/clients/${tenantId}`}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
              Cancel
            </Link>
            <button type="submit" disabled={submitting}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg shadow-sm shadow-blue-600/20 transition-colors">
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {submitting ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>
      </motion.div>

      {/* Sectioned settings layout */}
      <div className="mt-4 space-y-5">
        {/* ── Profile ── */}
        <SectionCard icon={Building2} title="Profile & Contact" description="Basic information and the primary contact for this lab.">
          <div className="space-y-5">
            <Field label="Lab Name">
              <input type="text" required value={form.labName} onChange={(e) => update("labName", e.target.value)} className={inputCls} />
            </Field>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              <Field label="Email">
                <input type="email" value={form.contactEmail} onChange={(e) => update("contactEmail", e.target.value)} className={inputCls} />
              </Field>
              <Field label="Phone">
                <input type="text" value={form.contactPhone} onChange={(e) => update("contactPhone", e.target.value)} className={inputCls} />
              </Field>
              <Field label="Contact Person">
                <input type="text" value={form.contactPerson} onChange={(e) => update("contactPerson", e.target.value)} className={inputCls} />
              </Field>
              <Field label="Plan">
                <select value={form.plan} onChange={(e) => update("plan", e.target.value)} className={inputCls}>
                  <option value="free">Free</option>
                  <option value="starter">Starter</option>
                  <option value="pro">Pro</option>
                  <option value="enterprise">Enterprise</option>
                </select>
              </Field>
              <Field label="City">
                <input type="text" value={form.city} onChange={(e) => update("city", e.target.value)} className={inputCls} />
              </Field>
              <Field label="State">
                <input type="text" value={form.state} onChange={(e) => update("state", e.target.value)} className={inputCls} />
              </Field>
              <Field label="Website">
                <input type="text" value={form.website} onChange={(e) => update("website", e.target.value)} placeholder="https://" className={inputCls} />
              </Field>
              <Field label="GST Number">
                <input type="text" value={form.gstNumber} onChange={(e) => update("gstNumber", e.target.value)} className={inputCls} />
              </Field>
            </div>
          </div>
        </SectionCard>

        {/* ── Subscription ── */}
        <SectionCard icon={CalendarClock} title="Subscription" description="Plan lifecycle, validity dates, and renewal settings.">
          <div className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
              <Field label="Status">
                <select value={form.status} onChange={(e) => update("status", e.target.value)} className={inputCls}>
                  <option value="onboarding">Onboarding</option>
                  <option value="trial">Trial</option>
                  <option value="active">Active</option>
                  <option value="expired">Expired</option>
                  <option value="suspended">Suspended</option>
                </select>
              </Field>
              <Field label="Start Date">
                <input type="date" value={form.subscriptionStartDate} onChange={(e) => update("subscriptionStartDate", e.target.value)} className={inputCls} />
              </Field>
              <Field label="End Date">
                <input type="date" value={form.subscriptionEndDate} onChange={(e) => update("subscriptionEndDate", e.target.value)} className={inputCls} />
              </Field>
              <Field label="Trial End Date" hint="Leave empty for no trial.">
                <input type="date" value={form.trialEndDate} onChange={(e) => update("trialEndDate", e.target.value)} className={inputCls} />
              </Field>
            </div>
            <label className="flex items-center gap-2.5 cursor-pointer rounded-lg border border-slate-200 px-3.5 py-2.5 w-full md:w-auto md:inline-flex hover:bg-slate-50 transition-colors">
              <input type="checkbox" checked={form.autoRenew} onChange={(e) => update("autoRenew", e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-600/20" />
              <span className="text-sm text-slate-700">Auto-renew subscription</span>
            </label>
          </div>
        </SectionCard>

        {/* ── Report Configuration ── */}
        <SectionCard icon={FileText} title="Report Configuration" description="Control which pages appear in generated reports and their behavior.">
          <div className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              <Field label="Report Type">
                <select value={form.reportType} onChange={(e) => update("reportType", e.target.value)} className={inputCls}>
                  <option value="inDepth">In-Depth (detailed multi-page)</option>
                  <option value="essential">Essential (compact)</option>
                </select>
              </Field>
              <Field label="Page Order" hint="Comma-separated page IDs. Order determines render sequence.">
                <input type="text" value={form.pageOrder} onChange={(e) => update("pageOrder", e.target.value)} placeholder="indepth-cover, indepth-summary, ..." className={inputCls} />
              </Field>
            </div>

            <div>
              <p className="text-sm font-medium text-slate-700 mb-3">Pages to include</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {[
                  { key: "showCoverPage", label: "Cover Page", desc: "Lab branding + patient info" },
                  { key: "showSummary", label: "Health Summary", desc: "Score overview + key findings" },
                  { key: "showRecommendations", label: "Recommendations", desc: "AI-generated health advice" },
                  { key: "showBackPage", label: "Back Page", desc: "Disclaimers + contact info" },
                ].map((item) => (
                  <label key={item.key}
                    className={`flex flex-col gap-1 cursor-pointer rounded-lg border px-4 py-3 transition-colors ${
                      form[item.key] ? "border-blue-200 bg-blue-50/50" : "border-slate-200 bg-white hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <input type="checkbox" checked={form[item.key]} onChange={(e) => update(item.key, e.target.checked)}
                        className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-600/20" />
                      <span className="text-sm font-medium text-slate-900">{item.label}</span>
                    </div>
                    <span className="text-xs text-slate-500 ml-6">{item.desc}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <p className="text-sm font-medium text-slate-700 mb-3">Behavior</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {[
                  { key: "profileContinuation", label: "Profile Continuation", desc: "Profiles continue on same page (no page break)" },
                  { key: "strictMapping", label: "Strict Mapping", desc: "Reject reports with unmapped parameters" },
                  { key: "webViewer", label: "Web Viewer", desc: "Generate a shareable web link for reports" },
                ].map((item) => (
                  <label key={item.key}
                    className={`flex flex-col gap-1 cursor-pointer rounded-lg border px-4 py-3 transition-colors ${
                      form[item.key] ? "border-blue-200 bg-blue-50/50" : "border-slate-200 bg-white hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <input type="checkbox" checked={form[item.key]} onChange={(e) => update(item.key, e.target.checked)}
                        className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-600/20" />
                      <span className="text-sm font-medium text-slate-900">{item.label}</span>
                    </div>
                    <span className="text-xs text-slate-500 ml-6">{item.desc}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </SectionCard>

        {/* ── Branding & Notes ── */}
        <SectionCard icon={Palette} title="Branding & Notes" description="Report brand color and internal admin notes.">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <Field label="Brand Color" hint="Used on this client's generated reports.">
              <div className="flex items-center gap-3">
                <input type="color" value={form.primaryColor} onChange={(e) => update("primaryColor", e.target.value)}
                  className="w-12 h-10 border border-slate-300 rounded-lg cursor-pointer shrink-0" />
                <input type="text" value={form.primaryColor} onChange={(e) => update("primaryColor", e.target.value)}
                  className={`font-mono ${inputCls}`} />
              </div>
            </Field>
            <Field label="Internal Notes" hint="Visible to admins only — never shown to the client.">
              <textarea value={form.notes} onChange={(e) => update("notes", e.target.value)} rows={3}
                placeholder="Add any internal context about this client..." className={`resize-none ${inputCls}`} />
            </Field>
          </div>
        </SectionCard>
      </div>

      {/* Sticky action bar */}
      <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-slate-200 bg-white/90 backdrop-blur-sm">
        <div className="flex items-center justify-end gap-2 px-6 py-3 pl-20">
          <Link href={`/admin/clients/${tenantId}`}
            className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
            Cancel
          </Link>
          <button type="submit" disabled={submitting}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg shadow-sm shadow-blue-600/20 transition-colors">
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {submitting ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </form>
  );
}
