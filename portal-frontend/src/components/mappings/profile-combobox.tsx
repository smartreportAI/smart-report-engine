"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronsUpDown, Search, Check, Plus } from "lucide-react";
import { fetchGlobalProfiles, mappingKeys } from "@/lib/api/mappings";
import { cn } from "@/lib/utils";

interface ProfileComboboxProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  id?: string;
}

/**
 * Searchable profile picker. Lists existing profiles from
 * GET /admin/mappings/global/profiles so the admin can just pick one
 * instead of typing the full name. A new profile can still be added by
 * typing it and choosing "Create".
 */
export function ProfileCombobox({
  value,
  onChange,
  placeholder = "Select a profile...",
  id,
}: ProfileComboboxProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
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
    queryKey: mappingKeys.globalProfiles(),
    queryFn: fetchGlobalProfiles,
  });

  const profiles = useMemo(() => data?.data ?? [], [data]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return profiles;
    return profiles.filter((p) => p.toLowerCase().includes(q));
  }, [profiles, search]);

  const trimmed = search.trim();
  const exactExists = profiles.some((p) => p.toLowerCase() === trimmed.toLowerCase());
  const canCreate = trimmed.length > 0 && !exactExists;

  function select(profile: string) {
    onChange(profile);
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
              placeholder="Search or add a profile..."
              className="w-full pl-9 pr-3 py-2.5 text-sm outline-none"
            />
          </div>
          <div className="max-h-60 overflow-y-auto py-1">
            {isLoading ? (
              <div className="px-3 py-6 text-center text-sm text-slate-400">Loading...</div>
            ) : (
              <>
                {filtered.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => select(p)}
                    className="flex items-center justify-between gap-2 w-full text-left px-3 py-2 text-sm text-slate-900 hover:bg-slate-50 transition-colors"
                  >
                    <span className="truncate">{p}</span>
                    {value === p && <Check className="w-4 h-4 text-blue-600 shrink-0" />}
                  </button>
                ))}
                {filtered.length === 0 && !canCreate && (
                  <div className="px-3 py-6 text-center text-sm text-slate-400">No profiles found</div>
                )}
                {canCreate && (
                  <button
                    type="button"
                    onClick={() => select(trimmed)}
                    className="flex items-center gap-2 w-full text-left px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 transition-colors border-t border-slate-100"
                  >
                    <Plus className="w-4 h-4 shrink-0" />
                    Create &ldquo;{trimmed}&rdquo;
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
