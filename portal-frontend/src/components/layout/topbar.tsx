"use client";

import { usePathname, useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { useAuth } from "@/lib/auth/context";

/** Maps the current path to a readable breadcrumb trail. */
function useBreadcrumb() {
  const pathname = usePathname();
  const parts = pathname.split("/").filter(Boolean); // e.g. ['admin','clients','rajagiri']

  const labelMap: Record<string, string> = {
    admin: "Admin",
    client: "Client",
    dashboard: "Overview",
    clients: "Clients",
    reports: "Reports",
    users: "Users",
    audit: "Audit Log",
    credits: "Credits",
    settings: "Settings",
    onboard: "Onboard Client",
  };

  return parts.map((p) => labelMap[p] || p);
}

export function Topbar() {
  const crumbs = useBreadcrumb();
  const router = useRouter();
  const { user } = useAuth();

  const initials = (user?.name || "User")
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <header className="sticky top-0 z-30 h-[72px] bg-slate-50/70 backdrop-blur-2xl flex items-center justify-between px-8 gap-4 border-b border-transparent shadow-[0_1px_0_rgba(255,255,255,0.1)]">
      {/* Left: Breadcrumb */}
      <div className="flex items-center gap-2.5 min-w-0 mt-1">
        {crumbs.map((c, i) => (
          <div key={i} className="flex items-center gap-2.5">
            {i > 0 && <span className="text-slate-300 font-light select-none text-lg leading-none transform -translate-y-[1px]">/</span>}
            <span
              className={
                i === crumbs.length - 1
                  ? "text-[15px] font-semibold text-slate-900 tracking-tight"
                  : "text-[14px] font-medium text-slate-400 hover:text-slate-600 cursor-pointer transition-colors"
              }
            >
              {c}
            </span>
          </div>
        ))}
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-4">
        {/* Quick Onboard */}
        <button
          onClick={() => router.push("/admin/clients/onboard")}
          className="hidden md:flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white text-[13px] font-medium px-4 py-2 rounded-lg transition-all shadow-[0_4px_12px_rgba(15,23,42,0.15)] ring-1 ring-slate-900/5 hover:ring-slate-900/10"
        >
          <Plus className="w-4 h-4" /> Onboard Network
        </button>

        {/* Vertical Separator */}
        <div className="hidden sm:block h-8 w-[1px] bg-slate-200/60 mx-1" />

        {/* User context chip */}
        <div className="flex items-center gap-3 p-1.5 pr-3 rounded-full bg-white border border-slate-200/60 shadow-sm cursor-pointer hover:shadow-md transition-all hover:border-slate-300">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-[11px] font-bold text-white shadow-inner">
            {initials}
          </div>
          <div className="hidden sm:flex flex-col items-start leading-[1.1]">
            <span className="text-[13px] font-bold text-slate-900 max-w-[120px] truncate">{user?.name}</span>
            <span className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">{user?.role}</span>
          </div>
        </div>
      </div>
    </header>
  );
}
