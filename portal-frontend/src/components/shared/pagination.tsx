"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationProps {
  page: number;
  totalPages: number;
  total: number;
  /** Singular noun for the item, e.g. "user" → "users". */
  noun?: string;
  onPageChange: (page: number) => void;
}

/**
 * Shared list pagination footer. Renders nothing when there is only one page,
 * so it's safe to always include. Matches the dashboard table styling.
 */
export function Pagination({ page, totalPages, total, noun = "item", onPageChange }: PaginationProps) {
  if (totalPages <= 1) return null;

  // Build a compact page window: 1 … (p-1) p (p+1) … last
  const pages: (number | "…")[] = [];
  const push = (n: number | "…") => pages.push(n);
  const window = 1;
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= page - window && i <= page + window)) {
      push(i);
    } else if (pages[pages.length - 1] !== "…") {
      push("…");
    }
  }

  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 text-sm">
      <span className="text-slate-500">
        {total.toLocaleString()} {total === 1 ? noun : `${noun}s`} · Page {page} of {totalPages}
      </span>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={page <= 1}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-transparent transition-colors"
        >
          <ChevronLeft className="w-4 h-4" /> Prev
        </button>
        <div className="hidden sm:flex items-center gap-1">
          {pages.map((p, i) =>
            p === "…" ? (
              <span key={`gap-${i}`} className="px-1.5 text-slate-400">…</span>
            ) : (
              <button
                key={p}
                onClick={() => onPageChange(p)}
                className={`min-w-8 px-2 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  p === page ? "bg-blue-600 text-white" : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                {p}
              </button>
            )
          )}
        </div>
        <button
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          disabled={page >= totalPages}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-transparent transition-colors"
        >
          Next <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
