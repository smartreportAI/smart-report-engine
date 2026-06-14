"use client";

export function TableSkeleton({ rows = 6, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="p-4 space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4 animate-pulse">
          {Array.from({ length: cols }).map((_, j) => (
            <div
              key={j}
              className="h-4 bg-slate-100 rounded flex-1"
              style={{ animationDelay: `${i * 50}ms` }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
