"use client";

import { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronsUpDown, Search, Check } from "lucide-react";
import { fetchGlobalMappings } from "@/lib/api/mappings";
import { useDebounced } from "@/lib/hooks/use-debounced";
import { cn } from "@/lib/utils";

interface StandardNameComboboxProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  id?: string;
}

/**
 * Strict picker over existing GLOBAL standard names. The admin can ONLY
 * select a value that exists in the global dictionary — free text is not
 * allowed, because a typo here would point the client override at a
 * non-existent standard and silently break the mapping pipeline.
 *
 * Search runs server-side (the dictionary can be large).
 */
export function StandardNameCombobox({
  value,
  onChange,
  placeholder = "Select a standard test...",
  id,
}: StandardNameComboboxProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const debounced = useDebounced(search, 250);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch("");
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const { data, isLoading } = useQuery({
    queryKey: ["mappings", "global", "picker", debounced],
    queryFn: () => fetchGlobalMappings({ search: debounced, isActive: "true", limit: 20 }),
    enabled: open,
  });

  const suggestions = data?.data || [];

  function select(name: string) {
    onChange(name);
    setOpen(false);
    setSearch("");
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        id={id}
        onClick={() => setOpen((v) => !v)}
        className="flex items-center justify-between gap-2 w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-left hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-colors"
      >
        <span className={cn("truncate", !value && "text-slate-400")}>
          {value || placeholder}
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
              placeholder="Search standard tests..."
              className="w-full pl-9 pr-3 py-2.5 text-sm outline-none"
            />
          </div>
          <div className="max-h-60 overflow-y-auto py-1">
            {isLoading ? (
              <div className="px-3 py-6 text-center text-sm text-slate-400">Loading...</div>
            ) : suggestions.length === 0 ? (
              <div className="px-3 py-6 text-center text-sm text-slate-400">
                {debounced.trim()
                  ? "No matching standard test found"
                  : "Type to search the standard dictionary"}
              </div>
            ) : (
              suggestions.map((s) => (
                <button
                  key={s._id}
                  type="button"
                  onClick={() => select(s.standardName)}
                  className="flex items-center justify-between gap-2 w-full text-left px-3 py-2 hover:bg-slate-50 transition-colors"
                >
                  <span className="min-w-0 flex items-center gap-2">
                    <span className="text-sm text-slate-900 truncate">{s.standardName}</span>
                    {value === s.standardName && <Check className="w-4 h-4 text-blue-600 shrink-0" />}
                  </span>
                  <span className="text-xs text-slate-400 shrink-0">{s.profileName}</span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
