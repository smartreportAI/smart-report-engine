"use client";

import { useState, useEffect, type FormEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Eye, EyeOff } from "lucide-react";
import { Modal } from "@/components/shared/modal";
import { ClientCombobox } from "@/components/mappings/client-combobox";
import { apiClient } from "@/lib/api/client";
import type { ClientLite } from "@/lib/api/mappings";

interface UserRow {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  tenantId?: string | null;
  isActive: boolean;
}

interface UserModalProps {
  open: boolean;
  onClose: () => void;
  /** When provided, the modal edits this user; otherwise it creates a new one. */
  editing?: UserRow | null;
}

const TENANT_ROLES = ["client", "lab_staff"];

export function UserModal({ open, onClose, editing }: UserModalProps) {
  const queryClient = useQueryClient();
  const isEdit = !!editing;

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState("admin");
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setName(editing.name);
      setEmail(editing.email);
      setPhone(editing.phone ?? "");
      setRole(editing.role);
      setTenantId(editing.tenantId ?? null);
    } else {
      setName("");
      setEmail("");
      setPhone("");
      setRole("admin");
      setTenantId(null);
    }
    setPassword("");
    setShowPassword(false);
    setErrors({});
  }, [open, editing]);

  const needsTenant = TENANT_ROLES.includes(role);

  function validate(): boolean {
    const next: Record<string, string> = {};
    if (!name.trim()) next.name = "Name is required";
    if (!isEdit) {
      if (!email.trim()) next.email = "Email is required";
      if (!password || password.length < 8) next.password = "Password must be at least 8 characters";
      if (needsTenant && !tenantId) next.tenantId = "Select a client for this role";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    try {
      if (isEdit) {
        // Edit: name, phone, role (superadmin role can't be set here, backend ignores)
        await apiClient(`/admin/users/${editing!._id}`, {
          method: "PATCH",
          body: JSON.stringify({
            name: name.trim(),
            phone: phone.trim() || undefined,
            role: editing!.role === "superadmin" ? undefined : role,
          }),
        });
        toast.success("User updated");
      } else {
        await apiClient(`/auth/register`, {
          method: "POST",
          body: JSON.stringify({
            name: name.trim(),
            email: email.trim().toLowerCase(),
            phone: phone.trim() || undefined,
            password,
            role,
            tenantId: needsTenant ? tenantId : undefined,
          }),
        });
        toast.success("User created");
      }
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      onClose();
    } catch (err: any) {
      if (err?.code === "EMAIL_EXISTS") setErrors({ email: "This email is already in use" });
      toast.error(err?.message || "Failed to save user");
    } finally {
      setSubmitting(false);
    }
  }

  const inputCls =
    "w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600";
  const labelCls = "block text-sm font-medium text-slate-700 mb-1.5";

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? "Edit User" : "Add User"}
      description={isEdit ? editing?.email : "Create a portal login and assign a role"}
      maxWidth="max-w-lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Full Name <span className="text-red-500">*</span></label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} className={inputCls} placeholder="Jane Doe" />
            {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
          </div>
          <div>
            <label className={labelCls}>Phone</label>
            <input type="text" value={phone} onChange={(e) => setPhone(e.target.value)} className={inputCls} placeholder="Optional" />
          </div>
        </div>

        <div>
          <label className={labelCls}>Email <span className="text-red-500">*</span></label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isEdit}
            className={`${inputCls} disabled:bg-slate-50 disabled:text-slate-500`}
            placeholder="jane@lab.com"
          />
          {isEdit && <p className="text-xs text-slate-400 mt-1">Email is the login identifier and cannot be changed.</p>}
          {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
        </div>

        {!isEdit && (
          <div>
            <label className={labelCls}>Password <span className="text-red-500">*</span></label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`${inputCls} pr-10`}
                placeholder="At least 8 characters"
              />
              <button type="button" onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password}</p>}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Role</label>
            {editing?.role === "superadmin" ? (
              <input type="text" value="Superadmin" disabled className={`${inputCls} disabled:bg-slate-50 disabled:text-slate-500`} />
            ) : (
              <select value={role} onChange={(e) => setRole(e.target.value)} className={inputCls}>
                <option value="admin">Admin</option>
                <option value="client">Client</option>
                <option value="lab_staff">Lab Staff</option>
              </select>
            )}
          </div>
          {needsTenant && editing?.role !== "superadmin" && (
            <div>
              <label className={labelCls}>Client / Tenant <span className="text-red-500">*</span></label>
              {isEdit ? (
                <input type="text" value={tenantId ?? "—"} disabled className={`${inputCls} font-mono disabled:bg-slate-50 disabled:text-slate-500`} />
              ) : (
                <ClientCombobox value={tenantId} onSelect={(c: ClientLite | null) => setTenantId(c?.tenantId ?? null)} />
              )}
              {errors.tenantId && <p className="text-xs text-red-500 mt-1">{errors.tenantId}</p>}
            </div>
          )}
        </div>

        {!isEdit && needsTenant && (
          <p className="text-xs text-slate-400">Client and Lab Staff logins are scoped to one client and can only see that client&apos;s data.</p>
        )}

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
          <button type="button" onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
            Cancel
          </button>
          <button type="submit" disabled={submitting}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg shadow-sm shadow-blue-600/20 transition-colors disabled:opacity-60">
            {submitting ? "Saving..." : isEdit ? "Save Changes" : "Create User"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
