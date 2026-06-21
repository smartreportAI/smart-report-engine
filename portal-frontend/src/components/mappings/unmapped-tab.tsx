"use client";

import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, Search, Wand2, Trash2, Bell, ChevronLeft, ChevronRight, CheckSquare } from "lucide-react";
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

  // Bulk Selection State
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Resolve modal state (supports arrays of names for bulk mapping)
  const [globalModal, setGlobalModal] = useState<{ testNames: string[]; tenantId: string | null } | null>(null);
  const [clientModal, setClientModal] = useState<{ testNames: string[]; tenantId: string } | null>(null);

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

  const currentRows = isAllClients ? summaryRows : tenantRows;
  
  // Selection Logic
  const allSelected = currentRows.length > 0 && currentRows.every(r => selected.has(r.testName));
  const someSelected = currentRows.some(r => selected.has(r.testName)) && !allSelected;

  function toggleAll() {
    if (allSelected) {
      setSelected(new Set());
    } else {
      const newSet = new Set(selected);
      currentRows.forEach(r => newSet.add(r.testName));
      setSelected(newSet);
    }
  }

  function toggleRow(testName: string) {
    const newSet = new Set(selected);
    if (newSet.has(testName)) {
      newSet.delete(testName);
    } else {
      newSet.add(testName);
    }
    setSelected(newSet);
  }

  function handleSelect(client: ClientLite | null) {
    onSelectTenant(client?.tenantId ?? null);
    setPage(1);
    setSearch("");
    setSelected(new Set()); // clear selection on tenant switch
  }

  async function handleDismiss(testName: string, rowTenant: string) {
    if (!window.confirm(`Dismiss "${testName}" from the unmapped log?`)) return;
    setBusyTest(testName);
    try {
      await dismissUnmapped(rowTenant, testName);
      toast.success("Entry dismissed");
      queryClient.invalidateQueries({ queryKey: ["mappings", "unmapped"] });
      // remove from selection
      const newSet = new Set(selected);
      newSet.delete(testName);
      setSelected(newSet);
    } catch (err: any) {
      toast.error(err?.message || "Failed to dismiss");
    } finally {
      setBusyTest(null);
    }
  }

  async function handleBulkDismiss() {
    if (!window.confirm(`Dismiss ${selected.size} selected tests from the log?`)) return;
    const testNames = Array.from(selected);
    try {
      await Promise.all(
        testNames.map(testName => dismissUnmapped(tenantId || PLACEHOLDER_TENANT, testName))
      );
      toast.success(`Dismissed ${testNames.length} entries`);
      setSelected(new Set());
      queryClient.invalidateQueries({ queryKey: ["mappings", "unmapped"] });
    } catch (err: any) {
      toast.error(err?.message || "Failed to dismiss some entries");
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
  const isEmpty = currentRows.length === 0;

  return (
    <div className="space-y-4 pb-20 relative">
      {/* Sleek Command Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-1.5 bg-white border border-slate-200/60 rounded-xl shadow-[0_2px_12px_rgba(15,23,42,0.03)]">
        <div className="flex flex-wrap items-center gap-2 flex-1 pl-1">
          <div className="flex items-center rounded-lg border border-slate-300 p-0.5 bg-slate-50/50">
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

        </div>

        <div className="h-6 w-px bg-slate-200 hidden sm:block mx-1"></div>
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search test name..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-9 pr-4 py-2 bg-transparent rounded-lg text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/20 transition-all"
          />
        </div>
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
                  <th className="px-4 py-3 w-12 text-center">
                    <input type="checkbox" checked={allSelected} ref={input => { if (input) input.indeterminate = someSelected }} onChange={toggleAll}
                      className="w-4 h-4 rounded border-slate-300 text-amber-600 focus:ring-amber-600/20 cursor-pointer" />
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Test Name</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Occurrences</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Affected Clients</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Last Seen</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody>
                {summaryRows.map((row, i) => (
                  <motion.tr
                    key={row.testName}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.02 }}
                    className={cn(
                      "group border-b border-slate-100 hover:bg-amber-50/50 transition-colors",
                      selected.has(row.testName) ? "bg-amber-50/80" : ""
                    )}
                  >
                    <td className="px-4 py-3.5 w-12 text-center">
                      <input type="checkbox" checked={selected.has(row.testName)} onChange={() => toggleRow(row.testName)}
                        className="w-4 h-4 rounded border-slate-300 text-amber-600 focus:ring-amber-600/20 cursor-pointer" />
                    </td>
                    <td className="px-4 py-3.5 font-semibold text-slate-900">{row.testName}</td>
                    <td className="px-4 py-3.5 text-right">
                      <span className="inline-flex items-center justify-center min-w-6 px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-700 text-xs font-bold">
                        {row.totalCount}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right font-medium text-slate-600">{row.tenantCount}</td>
                    <td className="px-4 py-3.5 text-slate-500">{formatDate(row.lastSeen)}</td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center justify-end gap-1 transition-opacity">
                        <button onClick={() => setGlobalModal({ testNames: [row.testName], tenantId: null })} title="Map to Global"
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors">
                          <Wand2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDismiss(row.testName, PLACEHOLDER_TENANT)} disabled={busyTest === row.testName} title="Dismiss"
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
        ) : (
          /* ---- Per-client list ---- */
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-4 py-3 w-12 text-center">
                    <input type="checkbox" checked={allSelected} ref={input => { if (input) input.indeterminate = someSelected }} onChange={toggleAll}
                      className="w-4 h-4 rounded border-slate-300 text-amber-600 focus:ring-amber-600/20 cursor-pointer" />
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Test Name</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Observation ID</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Occurrences</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">First Seen</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Last Seen</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody>
                {tenantRows.map((row: UnmappedRow, i) => (
                  <motion.tr
                    key={row._id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.02 }}
                    className={cn(
                      "group border-b border-slate-100 hover:bg-amber-50/50 transition-colors",
                      selected.has(row.testName) ? "bg-amber-50/80" : ""
                    )}
                  >
                    <td className="px-4 py-3.5 w-12 text-center">
                      <input type="checkbox" checked={selected.has(row.testName)} onChange={() => toggleRow(row.testName)}
                        className="w-4 h-4 rounded border-slate-300 text-amber-600 focus:ring-amber-600/20 cursor-pointer" />
                    </td>
                    <td className="px-4 py-3.5 font-semibold text-slate-900">{row.testName}</td>
                    <td className="px-4 py-3.5 font-mono text-[11px] text-slate-500">{row.observationId || "—"}</td>
                    <td className="px-4 py-3.5 text-right">
                      <span className="inline-flex items-center justify-center min-w-6 px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-700 text-xs font-bold">
                        {row.count}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-slate-500">{formatDate(row.firstSeen)}</td>
                    <td className="px-4 py-3.5 text-slate-500">{formatDate(row.lastSeen)}</td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center justify-end gap-1 transition-opacity">
                        <button onClick={() => setGlobalModal({ testNames: [row.testName], tenantId: row.tenantId })} title="Map to Global"
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors">
                          <Wand2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => setClientModal({ testNames: [row.testName], tenantId: row.tenantId })} title="Map to Client"
                          className="p-1.5 text-slate-400 hover:text-violet-600 hover:bg-violet-50 rounded-md transition-colors">
                          <Wand2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDismiss(row.testName, row.tenantId)} disabled={busyTest === row.testName} title="Dismiss"
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
        {!isAllClients && meta && meta.totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 bg-slate-50 border-t border-slate-200 text-sm">
            <span className="text-slate-500 font-medium">
              {meta.total} entr{meta.total === 1 ? "y" : "ies"} • Page {meta.page} of {meta.totalPages}
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

      {/* Floating Bulk Command Bar */}
      <AnimatePresence>
        {selected.size > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40"
          >
            <div className="flex items-center gap-4 px-5 py-3 bg-slate-900 border border-slate-800 text-white rounded-full shadow-2xl shadow-blue-900/20 backdrop-blur-md">
              <div className="flex items-center gap-2 pr-4 border-r border-slate-700">
                <CheckSquare className="w-4 h-4 text-blue-400" />
                <span className="text-sm font-medium">{selected.size} test{selected.size > 1 ? "s" : ""} selected</span>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => setGlobalModal({ testNames: Array.from(selected), tenantId: isAllClients ? null : tenantId })}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white hover:text-white bg-blue-600 hover:bg-blue-500 rounded-full transition-colors">
                  <Wand2 className="w-4 h-4" /> Bulk Map to Global
                </button>
                {!isAllClients && tenantId && (
                  <button onClick={() => setClientModal({ testNames: Array.from(selected), tenantId: tenantId })}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white hover:text-white bg-violet-600 hover:bg-violet-500 rounded-full transition-colors">
                    <Wand2 className="w-4 h-4" /> Bulk Map to Client
                  </button>
                )}
                <button onClick={handleBulkDismiss}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-slate-300 hover:text-red-400 hover:bg-slate-800 rounded-full transition-colors">
                  <Trash2 className="w-4 h-4" /> Dismiss All
                </button>
              </div>
              <button onClick={() => setSelected(new Set())}
                className="ml-2 px-2 py-1 text-xs text-slate-400 hover:text-slate-200 transition-colors">
                Cancel
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {globalModal && (
        <MapToGlobalModal
          open={!!globalModal}
          onClose={() => {
            setGlobalModal(null);
            if (!busyTest) setSelected(new Set()); // Clear on close if successful
          }}
          testNames={globalModal.testNames}
          tenantId={globalModal.tenantId}
        />
      )}
      {clientModal && (
        <MapToClientModal
          open={!!clientModal}
          onClose={() => {
            setClientModal(null);
            if (!busyTest) setSelected(new Set());
          }}
          testNames={clientModal.testNames}
          tenantId={clientModal.tenantId}
        />
      )}
    </div>
  );
}
