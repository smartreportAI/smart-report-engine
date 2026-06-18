"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { CheckCircle2, Search, Wand2, Trash2, Bell, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { EmptyState } from "@/components/shared/empty-state";
import { TableSkeleton } from "@/components/shared/table-skeleton";
import { ClientCombobox } from "@/components/mappings/client-combobox";
import { MapToGlobalModal } from "@/components/mappings/map-to-global-modal";
import { MapToClientModal } from "@/components/mappings/map-to-client-modal";
import { useDebounced } from "@/lib/hooks/use-debounced";
import { cn } from "@/lib/utils";
import {
  fetchUnmappedSummary,
  fetchUnmappedByTenant,
  dismissUnmapped,
  notifyClientUnmapped,
  mappingKeys,
  PLACEHOLDER_TENANT,
  type UnmappedRow,
  type UnmappedSummaryRow,
  type ClientLite,
} from "@/lib/api/mappings";

interface UnmappedTabProps {
  tenantId: string | null;
  onSelectTenant: (tenantId: string | null) => void;
}

function formatDate(d: string): string {
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export function UnmappedTab({ tenantId, onSelectTenant }: UnmappedTabProps) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [notifying, setNotifying] = useState(false);
  const [busyTest, setBusyTest] = useState<string | null>(null);

  // Resolve modal state
  const [globalModal, setGlobalModal] = useState<{ testName: string; tenantId: string | null } | null>(null);
  const [clientModal, setClientModal] = useState<{ testName: string; tenantId: string } | null>(null);

  const debouncedSearch = useDebounced(search, 300);
  const isAllClients = !tenantId;

  // All-clients summary
  const { data: summaryData, isLoading: summaryLoading } = useQuery({
    queryKey: mappingKeys.unmappedSummary(),
    queryFn: fetchUnmappedSummary,
    enabled: isAllClients,
  });

  // Per-client list
  const { data: tenantData, isLoading: tenantLoading } = useQuery({
    queryKey: mappingKeys.unmappedByTenant(tenantId || "", { search: debouncedSearch, page }),
    queryFn: () => fetchUnmappedByTenant(tenantId!, { search: debouncedSearch, page, limit: 25 }),
    enabled: !isAllClients,
  });

  const summaryRows: UnmappedSummaryRow[] = (summaryData?.data || []).filter((r) =>
    debouncedSearch ? r.testName.toLowerCase().includes(debouncedSearch.toLowerCase()) : true
  );
  const tenantRows = tenantData?.data || [];
  const meta = tenantData?.meta;

  function handleSelect(client: ClientLite | null) {
    onSelectTenant(client?.tenantId ?? null);
    setPage(1);
    setSearch("");
  }

  async function handleDismiss(testName: string, rowTenant: string) {
    if (!window.confirm(`Dismiss "${testName}" from the unmapped log?`)) return;
    setBusyTest(testName);
    try {
      await dismissUnmapped(rowTenant, testName);
      toast.success("Entry dismissed");
      queryClient.invalidateQueries({ queryKey: ["mappings", "unmapped"] });
    } catch (err: any) {
      toast.error(err?.message || "Failed to dismiss");
    } finally {
      setBusyTest(null);
    }
  }

  async function handleNotify() {
    if (!tenantId) return;
    setNotifying(true);
    try {
      const res = await notifyClientUnmapped(tenantId);
      toast.success(res?.data?.message || "Client notified");
    } catch (err: any) {
      toast.error(err?.message || "Failed to notify client");
    } finally {
      setNotifying(false);
    }
  }

  const isLoading = isAllClients ? summaryLoading : tenantLoading;
  const isEmpty = isAllClients ? summaryRows.length === 0 : tenantRows.length === 0;

  return (
    <div className="space-y-4">
      {/* Mode switch + search */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center rounded-lg border border-slate-300 p-0.5 bg-white">
          <button
            onClick={() => handleSelect(null)}
            className={cn(
              "px-3 py-1.5 text-sm font-medium rounded-md transition-colors",
              isAllClients ? "bg-blue-600 text-white shadow-sm" : "text-slate-600 hover:text-slate-900"
            )}
          >
            All Clients
          </button>
          <span className="px-1 text-slate-300">|</span>
          <div className="px-0.5">
            <ClientCombobox value={tenantId} onSelect={handleSelect} placeholder="By client..." allowClear />
          </div>
        </div>

        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search test name..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
          />
        </div>

        {!isAllClients && (
          <button onClick={handleNotify} disabled={notifying}
            className="ml-auto flex items-center gap-1.5 border border-slate-300 hover:bg-slate-50 text-slate-700 text-sm font-medium px-3.5 py-2 rounded-lg transition-colors disabled:opacity-60">
            <Bell className="w-4 h-4" /> {notifying ? "Notifying..." : "Notify Client"}
          </button>
        )}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden"
      >
        {isLoading ? (
          <TableSkeleton rows={6} cols={5} />
        ) : isEmpty ? (
          <EmptyState icon={CheckCircle2} title="No unmapped tests"
            description="Everything is resolved. New gaps will show up here as reports are generated." />
        ) : isAllClients ? (
          /* ---- All-clients summary ---- */
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Test Name</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600">Occurrences</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600">Affected Clients</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Last Seen</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {summaryRows.map((row, i) => (
                  <motion.tr
                    key={row.testName}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.03 }}
                    className="border-b border-slate-100 hover:bg-slate-50 transition-colors"
                  >
                    <td className="px-4 py-3 font-medium text-slate-900">{row.testName}</td>
                    <td className="px-4 py-3 text-right">
                      <span className="inline-flex items-center justify-center min-w-6 px-1.5 py-0.5 rounded-md bg-amber-50 text-amber-600 text-xs font-semibold">
                        {row.totalCount}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-slate-600">{row.tenantCount}</td>
                    <td className="px-4 py-3 text-slate-500">{formatDate(row.lastSeen)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => setGlobalModal({ testName: row.testName, tenantId: null })}
                          className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:bg-blue-50 px-2 py-1 rounded-md transition-colors">
                          <Wand2 className="w-3.5 h-3.5" /> Map to Global
                        </button>
                        <button onClick={() => handleDismiss(row.testName, PLACEHOLDER_TENANT)} disabled={busyTest === row.testName}
                          className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-red-600 hover:bg-red-50 px-2 py-1 rounded-md transition-colors disabled:opacity-50">
                          <Trash2 className="w-3.5 h-3.5" /> Dismiss
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          /* ---- Per-client list ---- */
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Test Name</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Observation ID</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600">Occurrences</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">First Seen</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Last Seen</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {tenantRows.map((row: UnmappedRow, i) => (
                  <motion.tr
                    key={row._id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.03 }}
                    className="border-b border-slate-100 hover:bg-slate-50 transition-colors"
                  >
                    <td className="px-4 py-3 font-medium text-slate-900">{row.testName}</td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-500">{row.observationId || "—"}</td>
                    <td className="px-4 py-3 text-right">
                      <span className="inline-flex items-center justify-center min-w-6 px-1.5 py-0.5 rounded-md bg-amber-50 text-amber-600 text-xs font-semibold">
                        {row.count}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500">{formatDate(row.firstSeen)}</td>
                    <td className="px-4 py-3 text-slate-500">{formatDate(row.lastSeen)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => setGlobalModal({ testName: row.testName, tenantId: row.tenantId })}
                          className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:bg-blue-50 px-2 py-1 rounded-md transition-colors">
                          <Wand2 className="w-3.5 h-3.5" /> Global
                        </button>
                        <button onClick={() => setClientModal({ testName: row.testName, tenantId: row.tenantId })}
                          className="inline-flex items-center gap-1 text-xs font-medium text-violet-600 hover:bg-violet-50 px-2 py-1 rounded-md transition-colors">
                          <Wand2 className="w-3.5 h-3.5" /> Client
                        </button>
                        <button onClick={() => handleDismiss(row.testName, row.tenantId)} disabled={busyTest === row.testName}
                          className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-red-600 hover:bg-red-50 px-2 py-1 rounded-md transition-colors disabled:opacity-50">
                          <Trash2 className="w-3.5 h-3.5" /> Dismiss
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!isAllClients && meta && meta.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 text-sm">
            <span className="text-slate-500">
              {meta.total} entr{meta.total === 1 ? "y" : "ies"} • Page {meta.page} of {meta.totalPages}
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

      {globalModal && (
        <MapToGlobalModal
          open={!!globalModal}
          onClose={() => setGlobalModal(null)}
          testName={globalModal.testName}
          tenantId={globalModal.tenantId}
        />
      )}
      {clientModal && (
        <MapToClientModal
          open={!!clientModal}
          onClose={() => setClientModal(null)}
          testName={clientModal.testName}
          tenantId={clientModal.tenantId}
        />
      )}
    </div>
  );
}
