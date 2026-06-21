"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Building2, Search, Plus, Pencil, Trash2, ChevronLeft, ChevronRight, Share2 } from "lucide-react";
import { toast } from "sonner";
import { EmptyState } from "@/components/shared/empty-state";
import { TableSkeleton } from "@/components/shared/table-skeleton";
import { StatusBadge } from "@/components/shared/status-badge";
import { ClientCombobox } from "@/components/mappings/client-combobox";
import { ClientMappingModal } from "@/components/mappings/client-mapping-modal";
import { useDebounced } from "@/lib/hooks/use-debounced";
import { cn } from "@/lib/utils";
import {
  fetchClientMappings,
  deleteClientMapping,
  mappingKeys,
  type ClientMappingRow,
  type ClientLite,
} from "@/lib/api/mappings";

interface ClientMappingsTabProps {
  tenantId: string | null;
  onSelectTenant: (tenantId: string | null) => void;
}

function formatRange(r?: { min?: number; max?: number }): string {
  if (!r || (r.min === undefined && r.max === undefined)) return "—";
  return `${r.min ?? "–"} – ${r.max ?? "–"}`;
}

export function ClientMappingsTab({ tenantId, onSelectTenant }: ClientMappingsTabProps) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ClientMappingRow | null>(null);
  const [busyCode, setBusyCode] = useState<string | null>(null);

  const debouncedSearch = useDebounced(search, 300);
  const filters = { search: debouncedSearch, page };

  const { data, isLoading } = useQuery({
    queryKey: mappingKeys.client(tenantId || "", filters),
    queryFn: () => fetchClientMappings(tenantId!, { ...filters, limit: 25 }),
    enabled: !!tenantId,
  });

  const rows = data?.data || [];
  const meta = data?.meta;

  function handleSelect(client: ClientLite | null) {
    onSelectTenant(client?.tenantId ?? null);
    setPage(1);
    setSearch("");
  }

  function openAdd() {
    setEditing(null);
    setModalOpen(true);
  }

  function openEdit(row: ClientMappingRow) {
    setEditing(row);
    setModalOpen(true);
  }

  async function handleDelete(row: ClientMappingRow) {
    if (!window.confirm(`Delete override "${row.externalCode}" → "${row.internalStandardName}"?`)) return;
    setBusyCode(row.externalCode);
    try {
      await deleteClientMapping(tenantId!, row.externalCode);
      toast.success("Override deleted");
      queryClient.invalidateQueries({ queryKey: ["mappings", "client", tenantId] });
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete");
    } finally {
      setBusyCode(null);
    }
  }

  return (
    <div className="space-y-6">
      {/* Sleek Command Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-1.5 bg-white border border-slate-200/60 rounded-xl shadow-[0_2px_12px_rgba(15,23,42,0.03)]">
        <div className="flex flex-wrap items-center gap-2 flex-1 pl-2">
          <div className="min-w-[240px]">
            <ClientCombobox value={tenantId} onSelect={handleSelect} allowClear />
          </div>
          {tenantId && (
            <>
              <div className="h-6 w-px bg-slate-200 hidden sm:block mx-1"></div>
              <div className="relative flex-1 min-w-[200px] max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search code or standard name..."
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                  className="w-full pl-9 pr-4 py-2 bg-transparent rounded-lg text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/20 transition-all"
                />
              </div>
            </>
          )}
        </div>
        {tenantId && (
          <button onClick={openAdd}
            className="shrink-0 flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium px-4 py-2 rounded-lg transition-all shadow-md shadow-slate-900/10">
            <Plus className="w-4 h-4" /> Add Override
          </button>
        )}
      </div>

      {!tenantId ? (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl border-2 border-dashed border-slate-200"
        >
          <EmptyState
            icon={Building2}
            title="Select a client"
            description="Choose a client above to view and manage their specific LIS code overrides."
          />
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden"
        >
          {isLoading ? (
            <TableSkeleton rows={8} cols={6} />
          ) : rows.length === 0 ? (
            <EmptyState icon={Building2} title="No overrides for this client"
              description="Add an override to map this lab's custom codes to standard tests." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Mapping Connection</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Display Override</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Profile</th>
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
                        "group border-b border-slate-100 hover:bg-violet-50/50 transition-colors",
                        !row.isActive && "opacity-50 grayscale"
                      )}
                    >
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <span className="px-2 py-1 bg-slate-100 text-slate-700 font-mono text-xs font-semibold rounded-md group-hover:bg-violet-100 group-hover:text-violet-700 transition-colors">
                            {row.externalCode}
                          </span>
                          <div className="flex-1 h-px bg-gradient-to-r from-slate-200 via-violet-300 to-slate-200 opacity-50 group-hover:opacity-100 relative min-w-[30px]">
                            <Share2 className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 text-violet-400 bg-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                          <span className="font-semibold text-slate-900">{row.internalStandardName}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-slate-600 font-medium">{row.externalDisplay || "—"}</td>
                      <td className="px-4 py-3.5 text-slate-600">{row.internalProfileName || "—"}</td>
                      <td className="px-4 py-3.5 text-slate-600">{row.unitOverride || "—"}</td>
                      <td className="px-4 py-3.5 text-slate-600 font-mono text-xs">{formatRange(row.rangeOverride)}</td>
                      <td className="px-4 py-3.5"><StatusBadge status={row.isActive ? "active" : "inactive"} /></td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center justify-end gap-1 transition-opacity">
                          <button onClick={() => openEdit(row)} title="Edit Override"
                            className="p-1.5 text-slate-400 hover:text-violet-600 hover:bg-violet-50 rounded-md transition-colors">
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDelete(row)} disabled={busyCode === row.externalCode} title="Delete"
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors disabled:opacity-50">
                            <Trash2 className="w-4 h-4" />
                          </button>
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
                {meta.total} override{meta.total === 1 ? "" : "s"} • Page {meta.page} of {meta.totalPages}
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
      )}

      {tenantId && (
        <ClientMappingModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          tenantId={tenantId}
          editing={editing}
        />
      )}
    </div>
  );
}
