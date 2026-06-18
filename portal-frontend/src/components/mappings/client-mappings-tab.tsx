"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Building2, Search, Plus, Pencil, Trash2, ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { EmptyState } from "@/components/shared/empty-state";
import { TableSkeleton } from "@/components/shared/table-skeleton";
import { StatusBadge } from "@/components/shared/status-badge";
import { ClientCombobox } from "@/components/mappings/client-combobox";
import { ClientMappingModal } from "@/components/mappings/client-mapping-modal";
import { useDebounced } from "@/lib/hooks/use-debounced";
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
    <div className="space-y-4">
      {/* Client selector */}
      <div className="flex flex-wrap items-center gap-3">
        <ClientCombobox value={tenantId} onSelect={handleSelect} allowClear />
        {tenantId && (
          <>
            <div className="relative flex-1 min-w-[200px] max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search code or standard name..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
              />
            </div>
            <button onClick={openAdd}
              className="ml-auto flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-3.5 py-2 rounded-lg transition-colors shadow-sm shadow-blue-600/20">
              <Plus className="w-4 h-4" /> Add Override
            </button>
          </>
        )}
      </div>

      {!tenantId ? (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl border border-slate-200 shadow-sm"
        >
          <EmptyState
            icon={Building2}
            title="Select a client"
            description="Choose a client above to view and manage their LIS code overrides."
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
            <TableSkeleton rows={6} cols={6} />
          ) : rows.length === 0 ? (
            <EmptyState icon={Building2} title="No overrides for this client"
              description="Add an override to map this lab's custom codes to standard tests." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="text-left px-4 py-3 font-medium text-slate-600">External Code</th>
                    <th className="text-left px-4 py-3 font-medium text-slate-600">Display</th>
                    <th className="text-left px-4 py-3 font-medium text-slate-600">Maps To</th>
                    <th className="text-left px-4 py-3 font-medium text-slate-600">Profile</th>
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
                      className="border-b border-slate-100 hover:bg-slate-50 transition-colors"
                    >
                      <td className="px-4 py-3 font-mono text-xs text-slate-900">{row.externalCode}</td>
                      <td className="px-4 py-3 text-slate-600">{row.externalDisplay || "—"}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1.5 font-medium text-slate-900">
                          <ArrowRight className="w-3.5 h-3.5 text-slate-300" />
                          {row.internalStandardName}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{row.internalProfileName || "—"}</td>
                      <td className="px-4 py-3 text-slate-600">{row.unitOverride || "—"}</td>
                      <td className="px-4 py-3 text-slate-600 font-mono text-xs">{formatRange(row.rangeOverride)}</td>
                      <td className="px-4 py-3"><StatusBadge status={row.isActive ? "active" : "inactive"} /></td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => openEdit(row)}
                            className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-blue-600 hover:bg-blue-50 px-2 py-1 rounded-md transition-colors">
                            <Pencil className="w-3.5 h-3.5" /> Edit
                          </button>
                          <button onClick={() => handleDelete(row)} disabled={busyCode === row.externalCode}
                            className="inline-flex items-center gap-1 text-xs font-medium text-red-600 hover:bg-red-50 px-2 py-1 rounded-md transition-colors disabled:opacity-50">
                            <Trash2 className="w-3.5 h-3.5" /> Delete
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
            <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 text-sm">
              <span className="text-slate-500">
                {meta.total} override{meta.total === 1 ? "" : "s"} • Page {meta.page} of {meta.totalPages}
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
