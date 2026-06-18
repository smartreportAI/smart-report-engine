"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { motion } from "framer-motion";
import { Users as UsersIcon, Power, Search, Plus, Pencil } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { TableSkeleton } from "@/components/shared/table-skeleton";
import { Pagination } from "@/components/shared/pagination";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { UserModal } from "@/components/users/user-modal";
import { useDebounced } from "@/lib/hooks/use-debounced";
import { cn } from "@/lib/utils";

const roleColors: Record<string, string> = {
  superadmin: "bg-violet-50 text-violet-700",
  admin: "bg-blue-50 text-blue-700",
  client: "bg-emerald-50 text-emerald-700",
  lab_staff: "bg-slate-100 text-slate-600",
};

interface UserRow {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  tenantId?: string | null;
  isActive: boolean;
  lastLoginAt?: string;
}

function initials(name: string): string {
  return (name || "U").split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();
}

export default function UsersPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<UserRow | null>(null);
  const [confirmUser, setConfirmUser] = useState<UserRow | null>(null);
  const [toggling, setToggling] = useState(false);

  const debouncedSearch = useDebounced(search, 300);

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "users", debouncedSearch, roleFilter, page],
    queryFn: () =>
      apiClient(
        `/admin/users?page=${page}&limit=15` +
        (debouncedSearch ? `&search=${debouncedSearch}` : "") +
        (roleFilter ? `&role=${roleFilter}` : "")
      ),
  });

  const users: UserRow[] = data?.data || [];
  const meta = data?.meta;

  function openAdd() {
    setEditing(null);
    setModalOpen(true);
  }

  function openEdit(user: UserRow) {
    setEditing(user);
    setModalOpen(true);
  }

  async function confirmToggle() {
    if (!confirmUser) return;
    setToggling(true);
    try {
      await apiClient(`/admin/users/${confirmUser._id}`, {
        method: "PATCH",
        body: JSON.stringify({ isActive: !confirmUser.isActive }),
      });
      toast.success(`User ${!confirmUser.isActive ? "enabled" : "disabled"}`);
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      setConfirmUser(null);
    } catch (err: any) {
      toast.error(err.message || "Failed to update user");
    } finally {
      setToggling(false);
    }
  }

  const hasFilters = !!(search || roleFilter);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Users"
        subtitle="Portal logins, roles, and access"
        action={
          <button onClick={openAdd}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors shadow-sm shadow-blue-600/20">
            <Plus className="w-4 h-4" /> Add User
          </button>
        }
      />

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
          />
        </div>
        <select value={roleFilter} onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}
          className="px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600">
          <option value="">All Roles</option>
          <option value="superadmin">Superadmin</option>
          <option value="admin">Admin</option>
          <option value="client">Client</option>
          <option value="lab_staff">Lab Staff</option>
        </select>
        {hasFilters && (
          <button onClick={() => { setSearch(""); setRoleFilter(""); setPage(1); }}
            className="text-sm text-slate-500 hover:text-blue-600 px-2">Clear</button>
        )}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden"
      >
        {isLoading ? (
          <TableSkeleton rows={6} cols={6} />
        ) : users.length === 0 ? (
          <EmptyState icon={UsersIcon} title="No users found" description="Add a user or adjust your filters." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left px-4 py-3 font-medium text-slate-600">User</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Role</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Tenant</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Last Login</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Status</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u, i) => (
                  <motion.tr
                    key={u._id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.03 }}
                    className="border-b border-slate-100 hover:bg-slate-50 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[11px] font-semibold text-slate-600">
                          {initials(u.name)}
                        </div>
                        <div className="min-w-0">
                          <p className="text-slate-900 font-medium truncate">{u.name}</p>
                          <p className="text-xs text-slate-500 truncate">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn("px-2 py-0.5 rounded-md text-xs font-medium capitalize", roleColors[u.role] || roleColors.lab_staff)}>
                        {u.role.replace("_", " ")}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-500">{u.tenantId || "—"}</td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "Never"}
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn("inline-flex items-center gap-1.5 text-xs font-medium", u.isActive ? "text-emerald-600" : "text-slate-400")}>
                        <span className={cn("w-1.5 h-1.5 rounded-full", u.isActive ? "bg-emerald-500" : "bg-slate-300")} />
                        {u.isActive ? "Active" : "Disabled"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => openEdit(u)}
                          className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-blue-600 hover:bg-blue-50 px-2 py-1 rounded-md transition-colors">
                          <Pencil className="w-3.5 h-3.5" /> Edit
                        </button>
                        {u.role !== "superadmin" && (
                          <button onClick={() => setConfirmUser(u)}
                            className={cn("inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-md transition-colors",
                              u.isActive ? "text-red-600 hover:bg-red-50" : "text-emerald-600 hover:bg-emerald-50")}>
                            <Power className="w-3.5 h-3.5" /> {u.isActive ? "Disable" : "Enable"}
                          </button>
                        )}
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {meta && (
          <Pagination page={meta.page} totalPages={meta.totalPages} total={meta.total} noun="user" onPageChange={setPage} />
        )}
      </motion.div>

      <UserModal open={modalOpen} onClose={() => setModalOpen(false)} editing={editing} />

      <ConfirmDialog
        open={!!confirmUser}
        onClose={() => setConfirmUser(null)}
        onConfirm={confirmToggle}
        loading={toggling}
        variant={confirmUser?.isActive ? "danger" : "default"}
        title={confirmUser?.isActive ? `Disable ${confirmUser?.name}?` : `Enable ${confirmUser?.name}?`}
        confirmLabel={confirmUser?.isActive ? "Disable User" : "Enable User"}
        message={
          confirmUser?.isActive ? (
            <>This user will be <strong>unable to sign in</strong> until re-enabled. Their account and data are kept.</>
          ) : (
            <>This user will be able to sign in again.</>
          )
        }
      />
    </div>
  );
}
