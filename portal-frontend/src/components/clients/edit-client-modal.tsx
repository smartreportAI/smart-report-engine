"use client";

import { useState } from "react";
import { Modal } from "@/components/shared/modal";
import { apiClient } from "@/lib/api/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

interface EditClientModalProps {
  open: boolean;
  onClose: () => void;
  client: any;
}

export function EditClientModal({ open, onClose, client }: EditClientModalProps) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    labName: client.labName || "",
    contactEmail: client.contactEmail || "",
    contactPhone: client.contactPhone || "",
    contactPerson: client.contactPerson || "",
    city: client.city || "",
    state: client.state || "",
    plan: client.plan || "starter",
    primaryColor: client.reportConfig?.branding?.primaryColor || "#2563eb",
  });
  const [submitting, setSubmitting] = useState(false);

  function update(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await apiClient(`/admin/clients/${client.tenantId}`, {
        method: "PATCH",
        body: JSON.stringify({
          labName: form.labName,
          contactEmail: form.contactEmail || undefined,
          contactPhone: form.contactPhone || undefined,
          contactPerson: form.contactPerson || undefined,
          city: form.city || undefined,
          state: form.state || undefined,
          plan: form.plan,
          reportConfig: { branding: { primaryColor: form.primaryColor } },
        }),
      });
      toast.success("Client updated successfully");
      queryClient.invalidateQueries({ queryKey: ["admin", "clients", client.tenantId] });
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Failed to update client");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Edit Client" description={client.tenantId} maxWidth="max-w-lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Lab Name</label>
          <input type="text" required value={form.labName} onChange={(e) => update("labName", e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
            <input type="email" value={form.contactEmail} onChange={(e) => update("contactEmail", e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Phone</label>
            <input type="text" value={form.contactPhone} onChange={(e) => update("contactPhone", e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Contact Person</label>
            <input type="text" value={form.contactPerson} onChange={(e) => update("contactPerson", e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Plan</label>
            <select value={form.plan} onChange={(e) => update("plan", e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600">
              <option value="free">Free</option>
              <option value="starter">Starter</option>
              <option value="pro">Pro</option>
              <option value="enterprise">Enterprise</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">City</label>
            <input type="text" value={form.city} onChange={(e) => update("city", e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">State</label>
            <input type="text" value={form.state} onChange={(e) => update("state", e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Brand Color</label>
          <div className="flex items-center gap-2">
            <input type="color" value={form.primaryColor} onChange={(e) => update("primaryColor", e.target.value)}
              className="w-12 h-9 border border-slate-300 rounded-lg cursor-pointer" />
            <input type="text" value={form.primaryColor} onChange={(e) => update("primaryColor", e.target.value)}
              className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600" />
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">Cancel</button>
          <button type="submit" disabled={submitting} className="px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg transition-colors">
            {submitting ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
