"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { FlaskConical, Search, Plus, Pencil, Power, RotateCcw, ChevronLeft, ChevronRight, Filter, Loader2 } from "lucide-react";
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

  // Inline Profile Editing State
  const [editingProfileFor, setEditingProfileFor] = useState<string | null>(null);
  const [inlineSaving, setInlineSaving] = useState<string | null>(null);

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

  async function handleProfileChange(row: GlobalMappingRow, newProfileName: string) {
    if (row.profileName === newProfileName) {
      setEditingProfileFor(null);
      return;
    }
    setInlineSaving(row.standardName);
    try {
      await upsertGlobalMapping({
        biomarkerId: row.biomarkerId,
        standardName: row.standardName,
        profileName: newProfileName,
        aliases: row.aliases,
        defaultUnit: row.defaultUnit ?? null,
        defaultRange: row.defaultRange ?? null,
        isActive: row.isActive,
      });
      toast.success(`Profile updated for ${row.standardName}`);
      queryClient.invalidateQueries({ queryKey: ["mappings", "global"] });
    } catch (err: any) {
      toast.error(err?.message || "Failed to update profile");
    } finally {
      setInlineSaving(null);
      setEditingProfileFor(null);
    }
  }

  const hasFilters = !!(search || profile || active);

  return (
    <div className="space-y-6">
      {/* Sleek Filter Command Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-1.5 bg-white border border-slate-200 rounded-xl shadow-sm">
        <div className="flex flex-wrap items-center gap-2 flex-1 pl-1">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search name, alias, biomarker ID..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full pl-9 pr-4 py-2 bg-transparent rounded-lg text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/20 transition-all"
            />
          </div>
          <div className="h-6 w-px bg-slate-200 hidden sm:block"></div>
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <select value={profile} onChange={(e) => { setProfile(e.target.value); setPage(1); }}
              className="pl-8 pr-8 py-2 bg-transparent text-sm text-slate-700 cursor-pointer appearance-none focus:outline-none focus:ring-2 focus:ring-blue-600/20 rounded-lg transition-all hover:bg-slate-50">
              <option value="">All Profiles</option>
              {profiles.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div className="relative">
            <select value={active} onChange={(e) => { setActive(e.target.value); setPage(1); }}
              className="pl-3 pr-8 py-2 bg-transparent text-sm text-slate-700 cursor-pointer appearance-none focus:outline-none focus:ring-2 focus:ring-blue-600/20 rounded-lg transition-all hover:bg-slate-50">
              <option value="">All Status</option>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
          </div>
          {hasFilters && (
            <button onClick={() => { setSearch(""); setProfile(""); setActive(""); setPage(1); }}
              className="text-xs font-medium text-slate-500 hover:text-slate-900 px-3 py-1.5 rounded-md hover:bg-slate-100 transition-colors">
              Clear
            </button>
          )}
        </div>
        <button onClick={openAdd}
          className="shrink-0 flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium px-4 py-2 rounded-lg transition-all shadow-md shadow-slate-900/10">
          <Plus className="w-4 h-4" /> Add Mapping
        </button>
      </div>

      {/* Structured Data Grid Container */}
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
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Standard Name</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Profile</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Biomarker</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Aliases</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Unit</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Range</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Status</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <motion.tr
                    key={row._id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.02 }}
                    className={cn(
                      "group border-b border-slate-100 hover:bg-blue-50/50 transition-colors",
                      !row.isActive && "opacity-50 grayscale"
                    )}
                  >
                    <td className="px-4 py-3.5 font-semibold text-slate-900">{row.standardName}</td>
                    
                    {/* Inline Profile Edit Column */}
                    <td className="px-4 py-3.5">
                      {editingProfileFor === row.standardName ? (
                        <div className="flex items-center gap-2">
                          <select 
                            autoFocus
                            onBlur={(e) => handleProfileChange(row, e.target.value)}
                            onChange={(e) => handleProfileChange(row, e.target.value)}
                            defaultValue={row.profileName}
                            disabled={inlineSaving === row.standardName}
                            className="bg-white border border-blue-300 text-slate-900 text-xs font-medium rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                          >
                            {profiles.map(p => <option key={p} value={p}>{p}</option>)}
                          </select>
                        </div>
                      ) : (
                        <div 
                          onClick={() => setEditingProfileFor(row.standardName)}
                          className="inline-flex items-center gap-1.5 cursor-pointer text-slate-600 font-medium hover:text-blue-600 px-2 py-1 -ml-2 rounded-md hover:bg-blue-100/50 transition-colors"
                          title="Click to edit profile"
                        >
                          {row.profileName}
                          {inlineSaving === row.standardName ? (
                            <Loader2 className="w-3 h-3 animate-spin text-blue-500" />
                          ) : (
                            <Pencil className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                          )}
                        </div>
                      )}
                    </td>

                    <td className="px-4 py-3.5 font-mono text-xs text-slate-500">{row.biomarkerId || "—"}</td>
                    <td className="px-4 py-3.5">
                      <div className="flex flex-wrap gap-1.5">
                        {row.aliases.slice(0, 3).map((a) => (
                          <span key={a} className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px] font-mono tracking-tight group-hover:bg-blue-50 group-hover:text-blue-700 group-hover:ring-1 ring-blue-600/10 transition-all">
                            {a}
                          </span>
                        ))}
                        {row.aliases.length > 3 && (
                          <span className="px-1.5 py-0.5 text-[11px] font-medium text-slate-400 bg-slate-50 rounded-md">+{row.aliases.length - 3}</span>
                        )}
                        {row.aliases.length === 0 && <span className="text-slate-300">—</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-slate-600">{row.defaultUnit || "—"}</td>
                    <td className="px-4 py-3.5 text-slate-600 font-mono text-xs">{formatRange(row.defaultRange)}</td>
                    <td className="px-4 py-3.5"><StatusBadge status={row.isActive ? "active" : "inactive"} /></td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center justify-end gap-1 transition-opacity">
                        <button onClick={() => openEdit(row)} title="Edit Mapping"
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors">
                          <Pencil className="w-4 h-4" />
                        </button>
                        {row.isActive ? (
                          <button onClick={() => handleDeactivate(row)} disabled={busyName === row.standardName} title="Deactivate"
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors disabled:opacity-50">
                            <Power className="w-4 h-4" />
                          </button>
                        ) : (
                          <button onClick={() => handleReactivate(row)} disabled={busyName === row.standardName} title="Reactivate"
                            className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors disabled:opacity-50">
                            <RotateCcw className="w-4 h-4" />
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
          <div className="flex items-center justify-between px-5 py-3 bg-slate-50 border-t border-slate-200 text-sm">
            <span className="text-slate-500 font-medium">
              {meta.total} mapping{meta.total === 1 ? "" : "s"} • Page {meta.page} of {meta.totalPages}
            </span>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-slate-600 font-medium hover:bg-slate-200 disabled:opacity-40 disabled:hover:bg-transparent transition-colors">
                <ChevronLeft className="w-4 h-4" /> Prev
              </button>
              <button onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))} disabled={page >= meta.totalPages}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-slate-600 font-medium hover:bg-slate-200 disabled:opacity-40 disabled:hover:bg-transparent transition-colors">
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
