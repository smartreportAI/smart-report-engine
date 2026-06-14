"use client";

import { cn } from "@/lib/utils";

type StatusType =
  | "active" | "live"
  | "trial"
  | "expired"
  | "suspended" | "inactive"
  | "onboarding"
  | "completed"
  | "failed"
  | "pending"
  | "sent"
  | "none";

const statusStyles: Record<string, { bg: string; text: string; dot: string }> = {
  active:     { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500" },
  live:       { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500" },
  completed:  { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500" },
  sent:       { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500" },
  trial:      { bg: "bg-blue-50", text: "text-blue-700", dot: "bg-blue-500" },
  onboarding: { bg: "bg-blue-50", text: "text-blue-700", dot: "bg-blue-500" },
  pending:    { bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-500" },
  expired:    { bg: "bg-red-50", text: "text-red-700", dot: "bg-red-500" },
  failed:     { bg: "bg-red-50", text: "text-red-700", dot: "bg-red-500" },
  suspended:  { bg: "bg-slate-100", text: "text-slate-600", dot: "bg-slate-400" },
  inactive:   { bg: "bg-slate-100", text: "text-slate-600", dot: "bg-slate-400" },
  none:       { bg: "bg-slate-100", text: "text-slate-500", dot: "bg-slate-300" },
};

export function StatusBadge({ status }: { status: string }) {
  const style = statusStyles[status.toLowerCase()] || statusStyles.none;

  return (
    <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium", style.bg, style.text)}>
      <span className={cn("w-1.5 h-1.5 rounded-full", style.dot)} />
      <span className="capitalize">{status}</span>
    </span>
  );
}
