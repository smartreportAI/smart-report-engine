"use client";

import { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Building2, ChevronsUpDown, Search, Check } from "lucide-react";
import { fetchClientsForPicker, mappingKeys, type ClientLite } from "@/lib/api/mappings";
import { useDebounced } from "@/lib/hooks/use-debounced";
import { cn } from "@/lib/utils";

interface ClientComboboxProps {
  value: string | null; // tenantId
  onSelect: (client: ClientLite | null) => void;
  placeholder?: string;
  allowClear?: boolean;
}

export function ClientCombobox({
  value,
  onSelect,
  placeholder = "Select a client...",
  allowClear = false,
}: ClientComboboxProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const debounced = useDebounced(search, 300);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const { data, isLoading } = useQuery({
    queryKey: mappingKeys.clientPicker(debounced),
    queryFn: () => fetchClientsForPicker(debounced),
    enabled: open,
  });

  const clients = data?.data || [];

  return (
    <div ref={ref} className="relative w-full max-w-sm">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center justify-between gap-2 w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-700 hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-colors"
      >
        <span className="flex items-center gap-2 truncate">
          <Building2 className="w-4 h-4 text-slate-400 shrink-0" />
          <span className={cn("truncate", !value && "text-slate-400")}>
            {value || placeholder}
          </span>
        </span>
        <ChevronsUpDown className="w-4 h-4 text-slate-400 shrink-0" />
      </button>

      {open && (
        <div className="absolute z-30 mt-1.5 w-full bg-white rounded-lg border border-slate-200 shadow-lg overflow-hidden">
          <div className="relative border-b border-slate-100">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              autoFocus
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by tenant or lab name..."
              className="w-full pl-9 pr-3 py-2.5 text-sm outline-none"
            />
          </div>
          <div className="max-h-64 overflow-y-auto py-1">
            {allowClear && value && (
              <button
                type="button"
                onClick={() => {
                  onSelect(null);
                  setOpen(false);
                }}
                className="w-full text-left px-3 py-2 text-sm text-slate-500 hover:bg-slate-50"
              >
                Clear selection
              </button>
            )}
            {isLoading ? (
              <div className="px-3 py-6 text-center text-sm text-slate-400">Loading...</div>
            ) : clients.length === 0 ? (
              <div className="px-3 py-6 text-center text-sm text-slate-400">No clients found</div>
            ) : (
              clients.map((c) => (
                <button
                  key={c.tenantId}
                  type="button"
                  onClick={() => {
                    onSelect(c);
                    setOpen(false);
                    setSearch("");
                  }}
                  className="flex items-center justify-between gap-2 w-full text-left px-3 py-2 hover:bg-slate-50 transition-colors"
                >
                  <span className="min-w-0">
                    <span className="block text-sm text-slate-900 truncate">{c.labName}</span>
                    <span className="block text-xs font-mono text-slate-400 truncate">{c.tenantId}</span>
                  </span>
                  {value === c.tenantId && <Check className="w-4 h-4 text-blue-600 shrink-0" />}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
