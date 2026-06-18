"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { FlaskConical, Search, Plus, Pencil, Power, RotateCcw, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { EmptyState } from "@/components/shared/empty-state";
import { TableSkeleton } from "@/components/shared/table-skeleton";
import { StatusBadge } from "@/components/shared/status-badge";
import { GlobalMappingModal } from "@/components/mappings/global-mapping-modal";
import { useDebounced } from "@/lib/hooks/use-debounced";
import { cn } from "@/lib/utils";
import {
  fetchGlobalMappings,
  fetchGlobalProfiles,
  deactivateGlobalMapping,
  upsertGlobalMapping,
  mappingKeys,
  type GlobalMappingRow,
} from "@/lib/api/mappings";

function formatRange(r?: { min?: number; max?: number } | null): string {
  if (!r || (r.min === undefined && r.max === undefined)) return "—";
  return `${r.min ?? "–"} – ${r.max ?? "–"}`;
}

export function GlobalMappingsTab() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [profile, setProfile] = useState("");
  const [active, setActive] = useState("");
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<GlobalMappingRow | null>(null);
  const [busyName, setBusyName] = useState<string | null>(null);

  const debouncedSearch = useDebounced(search, 300);
  const filters = { search: debouncedSearch, profileName: profile, isActive: active, page };

  const { data, isLoading } = useQuery({
    queryKey: mappingKeys.global(filters),
    queryFn: () => fetchGlobalMappings({ ...filters, limit: 25 }),
  });

  const { data: profilesData } = useQuery({
    queryKey: mappingKeys.globalProfiles(),
    queryFn: fetchGlobalProfiles,
  });

  const rows = data?.data || [];
  const meta = data?.meta;
  const profiles = profilesData?.data || [];

  function openAdd() {
    setEditing(null);
    setModalOpen(true);
  }

  function openEdit(row: GlobalMappingRow) {
    setEditing(row);
    setModalOpen(true);
  }

  async function handleDeactivate(row: GlobalMappingRow) {
    if (!window.confirm(`Deactivate "${row.standardName}"? It will be excluded from the mapping pipeline.`)) {
      return;
    }
    setBusyName(row.standardName);
    try {
      await deactivateGlobalMapping(row.standardName);
      toast.success("Mapping deactivated");
      queryClient.invalidateQueries({ queryKey: ["mappings", "global"] });
    } catch (err: any) {
      toast.error(err?.message || "Failed to deactivate");
    } finally {
      setBusyName(null);
    }
  }

  async function handleReactivate(row: GlobalMappingRow) {
    setBusyName(row.standardName);
    try {
      await upsertGlobalMapping({
        biomarkerId: row.biomarkerId,
        standardName: row.standardName,
        profileName: row.profileName,
        aliases: row.aliases,
        defaultUnit: row.defaultUnit ?? null,
        defaultRange: row.defaultRange ?? null,
        isActive: true,
      });
      toast.success("Mapping reactivated");
      queryClient.invalidateQueries({ queryKey: ["mappings", "global"] });
    } catch (err: any) {
      toast.error(err?.message || "Failed to reactivate");
    } finally {
      setBusyName(null);
    }
  }

  const hasFilters = !!(search || profile || active);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search name, alias, biomarker ID..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
          />
        </div>
        <select value={profile} onChange={(e) => { setProfile(e.target.value); setPage(1); }}
          className="px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600">
          <option value="">All Profiles</option>
          {profiles.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
        <select value={active} onChange={(e) => { setActive(e.target.value); setPage(1); }}
          className="px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600">
          <option value="">All Status</option>
          <option value="true">Active</option>
          <option value="false">Inactive</option>
        </select>
        {hasFilters && (
          <button onClick={() => { setSearch(""); setProfile(""); setActive(""); setPage(1); }}
            className="text-sm text-slate-500 hover:text-blue-600 px-2">Clear</button>
        )}
        <button onClick={openAdd}
          className="ml-auto flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-3.5 py-2 rounded-lg transition-colors shadow-sm shadow-blue-600/20">
          <Plus className="w-4 h-4" /> Add Mapping
        </button>
      </div>

      {/* Table */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden"
      >
        {isLoading ? (
          <TableSkeleton rows={8} cols={6} />
        ) : rows.length === 0 ? (
          <EmptyState icon={FlaskConical} title="No global mappings found"
            description="Add a standard test definition or adjust your filters." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Standard Name</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Profile</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Biomarker</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Aliases</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Unit</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Range</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Status</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <motion.tr
                    key={row._id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.03 }}
                    className={cn("border-b border-slate-100 hover:bg-slate-50 transition-colors", !row.isActive && "opacity-60")}
                  >
                    <td className="px-4 py-3 font-medium text-slate-900">{row.standardName}</td>
                    <td className="px-4 py-3 text-slate-600">{row.profileName}</td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-500">{row.biomarkerId || "—"}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {row.aliases.slice(0, 3).map((a) => (
                          <span key={a} className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-xs font-mono">{a}</span>
                        ))}
                        {row.aliases.length > 3 && (
                          <span className="px-1.5 py-0.5 text-xs text-slate-400">+{row.aliases.length - 3}</span>
                        )}
                        {row.aliases.length === 0 && <span className="text-slate-300">—</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{row.defaultUnit || "—"}</td>
                    <td className="px-4 py-3 text-slate-600 font-mono text-xs">{formatRange(row.defaultRange)}</td>
                    <td className="px-4 py-3"><StatusBadge status={row.isActive ? "active" : "inactive"} /></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => openEdit(row)}
                          className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-blue-600 hover:bg-blue-50 px-2 py-1 rounded-md transition-colors">
                          <Pencil className="w-3.5 h-3.5" /> Edit
                        </button>
                        {row.isActive ? (
                          <button onClick={() => handleDeactivate(row)} disabled={busyName === row.standardName}
                            className="inline-flex items-center gap-1 text-xs font-medium text-red-600 hover:bg-red-50 px-2 py-1 rounded-md transition-colors disabled:opacity-50">
                            <Power className="w-3.5 h-3.5" /> Deactivate
                          </button>
                        ) : (
                          <button onClick={() => handleReactivate(row)} disabled={busyName === row.standardName}
                            className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 hover:bg-emerald-50 px-2 py-1 rounded-md transition-colors disabled:opacity-50">
                            <RotateCcw className="w-3.5 h-3.5" /> Reactivate
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

        {meta && meta.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 text-sm">
            <span className="text-slate-500">
              {meta.total} mapping{meta.total === 1 ? "" : "s"} • Page {meta.page} of {meta.totalPages}
            </span>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-transparent transition-colors">
                <ChevronLeft className="w-4 h-4" /> Prev
              </button>
              <button onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))} disabled={page >= meta.totalPages}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-transparent transition-colors">
                Next <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </motion.div>

      <GlobalMappingModal open={modalOpen} onClose={() => setModalOpen(false)} editing={editing} />
    </div>
  );
}
