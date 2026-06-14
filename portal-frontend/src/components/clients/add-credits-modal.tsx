"use client";

import { useState } from "react";
import { Modal } from "@/components/shared/modal";
import { apiClient } from "@/lib/api/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

interface AddCreditsModalProps {
  open: boolean;
  onClose: () => void;
  tenantId: string;
  labName: string;
}

export function AddCreditsModal({ open, onClose, tenantId, labName }: AddCreditsModalProps) {
  const queryClient = useQueryClient();
  const [credits, setCredits] = useState("");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("upi");
  const [reference, setReference] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await apiClient(`/admin/clients/${tenantId}/credits`, {
        method: "POST",
        body: JSON.stringify({
          credits: Number(credits),
          amount: Number(amount) || 0,
          method,
          reference: reference || undefined,
          note: note || undefined,
        }),
      });
      toast.success(`Added ${credits} credits to ${labName}`);
      queryClient.invalidateQueries({ queryKey: ["admin", "clients", tenantId] });
      queryClient.invalidateQueries({ queryKey: ["admin", "clients"] });
      onClose();
      setCredits(""); setAmount(""); setReference(""); setNote("");
    } catch (err: any) {
      toast.error(err.message || "Failed to add credits");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Add Credits" description={`Recharge credits for ${labName}`}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Credits *</label>
            <input type="number" min="1" required value={credits} onChange={(e) => setCredits(e.target.value)} placeholder="1000"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Amount (₹)</label>
            <input type="number" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="5000"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Method</label>
            <select value={method} onChange={(e) => setMethod(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600">
              <option value="upi">UPI</option>
              <option value="bank_transfer">Bank Transfer</option>
              <option value="card">Card</option>
              <option value="cash">Cash</option>
              <option value="free">Free</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Reference</label>
            <input type="text" value={reference} onChange={(e) => setReference(e.target.value)} placeholder="TXN-12345"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Note</label>
          <input type="text" value={note} onChange={(e) => setNote(e.target.value)} placeholder="June 2026 recharge"
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600" />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">Cancel</button>
          <button type="submit" disabled={submitting} className="px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg transition-colors">
            {submitting ? "Adding..." : "Add Credits"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
