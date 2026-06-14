"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { motion } from "framer-motion";
import { Users as UsersIcon, Power } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { TableSkeleton } from "@/components/shared/table-skeleton";
import { cn } from "@/lib/utils";

const roleColors: Record<string, string> = {
  superadmin: "bg-violet-50 text-violet-700",
  admin: "bg-blue-50 text-blue-700",
  client: "bg-emerald-50 text-emerald-700",
  lab_staff: "bg-slate-100 text-slate-600",
};

export default function UsersPage() {
  const queryClient = useQueryClient();
  const [roleFilter, setRoleFilter] = useState("");
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "users", roleFilter],
    queryFn: () => apiClient(`/admin/users?page=1&limit=50${roleFilter ? `&role=${roleFilter}` : ""}`),
  });

  const users = data?.data || [];

  async function toggleUser(userId: string, currentActive: boolean) {
    setTogglingId(userId);
    try {
      await apiClient(`/admin/users/${userId}`, {
        method: "PATCH",
        body: JSON.stringify({ isActive: !currentActive }),
      });
      toast.success(`User ${!currentActive ? "enabled" : "disabled"}`);
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
    } catch (err: any) {
      toast.error(err.message || "Failed to update user");
    } finally {
      setTogglingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Users" subtitle="Portal user accounts and access roles" />

      {/* Filter */}
      <div className="flex items-center gap-3">
        <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}
          className="px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600">
          <option value="">All Roles</option>
          <option value="superadmin">Superadmin</option>
          <option value="admin">Admin</option>
          <option value="client">Client</option>
          <option value="lab_staff">Lab Staff</option>
        </select>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden"
      >
        {isLoading ? (
          <TableSkeleton rows={5} cols={5} />
        ) : users.length === 0 ? (
          <EmptyState icon={UsersIcon} title="No users found" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Name</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Email</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Role</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Tenant</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Last Login</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600">Status</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600">Action</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u: any, i: number) => (
                  <motion.tr
                    key={u._id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.04 }}
                    className="border-b border-slate-100 hover:bg-slate-50 transition-colors"
                  >
                    <td className="px-4 py-3 text-slate-900 font-medium">{u.name}</td>
                    <td className="px-4 py-3 text-slate-600">{u.email}</td>
                    <td className="px-4 py-3">
                      <span className={cn("px-2 py-0.5 rounded-md text-xs font-medium capitalize", roleColors[u.role] || roleColors.lab_staff)}>
                        {u.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-500">{u.tenantId || "—"}</td>
                    <td className="px-4 py-3 text-xs text-slate-500">{u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "Never"}</td>
                    <td className="px-4 py-3 text-right">
                      <span className={cn("inline-flex items-center gap-1.5 text-xs font-medium", u.isActive ? "text-emerald-600" : "text-slate-400")}>
                        <span className={cn("w-1.5 h-1.5 rounded-full", u.isActive ? "bg-emerald-500" : "bg-slate-300")} />
                        {u.isActive ? "Active" : "Disabled"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {u.role !== "superadmin" && (
                        <button onClick={() => toggleUser(u._id, u.isActive)} disabled={togglingId === u._id}
                          className={cn("inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-md transition-colors",
                            u.isActive ? "text-red-600 hover:bg-red-50" : "text-emerald-600 hover:bg-emerald-50")}>
                          <Power className="w-3.5 h-3.5" /> {u.isActive ? "Disable" : "Enable"}
                        </button>
                      )}
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
