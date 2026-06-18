"use client";

import { useState, type FormEvent } from "react";
import { motion } from "framer-motion";
import { KeyRound, Eye, EyeOff, Shield, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { apiClient } from "@/lib/api/client";
import { useAuth } from "@/lib/auth/context";
import { PageHeader } from "@/components/shared/page-header";

export default function SettingsPage() {
  const { user } = useAuth();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNext, setShowNext] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");

    if (next.length < 8) {
      setError("New password must be at least 8 characters.");
      return;
    }
    if (next !== confirm) {
      setError("New password and confirmation do not match.");
      return;
    }

    setSubmitting(true);
    try {
      await apiClient("/auth/change-password", {
        method: "PATCH",
        body: JSON.stringify({ currentPassword: current, newPassword: next }),
      });
      toast.success("Password changed successfully");
      setCurrent("");
      setNext("");
      setConfirm("");
    } catch (err: any) {
      if (err?.code === "INVALID_PASSWORD") {
        setError("Current password is incorrect.");
      } else {
        setError(err?.message || "Failed to change password.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  const inputCls =
    "w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-shadow";

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" subtitle="Account security and preferences" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Account info card */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 border border-blue-100">
              <Shield className="w-4.5 h-4.5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Account</h2>
              <p className="text-xs text-slate-500">Your login details</p>
            </div>
          </div>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between py-2 border-b border-slate-100">
              <span className="text-slate-500">Name</span>
              <span className="text-slate-900 font-medium">{user?.name}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-100">
              <span className="text-slate-500">Email</span>
              <span className="text-slate-900">{user?.email}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-100">
              <span className="text-slate-500">Role</span>
              <span className="text-slate-900 capitalize">{user?.role?.replace("_", " ")}</span>
            </div>
            {user?.tenantId && (
              <div className="flex justify-between py-2">
                <span className="text-slate-500">Tenant</span>
                <span className="text-slate-900 font-mono">{user.tenantId}</span>
              </div>
            )}
          </div>
        </motion.div>

        {/* Change password card */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50 border border-amber-100">
              <KeyRound className="w-4.5 h-4.5 text-amber-600" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Change Password</h2>
              <p className="text-xs text-slate-500">Update your login password</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Current Password</label>
              <div className="relative">
                <input
                  type={showCurrent ? "text" : "password"}
                  value={current}
                  onChange={(e) => setCurrent(e.target.value)}
                  required
                  className={`${inputCls} pr-10`}
                />
                <button type="button" onClick={() => setShowCurrent((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">New Password</label>
              <div className="relative">
                <input
                  type={showNext ? "text" : "password"}
                  value={next}
                  onChange={(e) => setNext(e.target.value)}
                  required
                  placeholder="At least 8 characters"
                  className={`${inputCls} pr-10`}
                />
                <button type="button" onClick={() => setShowNext((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  {showNext ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Confirm New Password</label>
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                className={inputCls}
              />
            </div>

            {error && <p className="text-sm text-red-500">{error}</p>}

            <button type="submit" disabled={submitting}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg shadow-sm shadow-blue-600/20 transition-colors">
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
              {submitting ? "Changing..." : "Change Password"}
            </button>
          </form>
        </motion.div>
      </div>
    </div>
  );
}
