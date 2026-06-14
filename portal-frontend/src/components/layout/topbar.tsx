"use client";

import { usePathname, useRouter } from "next/navigation";
import { Plus, ChevronRight } from "lucide-react";
import { useAuth } from "@/lib/auth/context";

/** Maps the current path to a readable breadcrumb trail. */
function useBreadcrumb() {
  const pathname = usePathname();
  const parts = pathname.split("/").filter(Boolean); // e.g. ['admin','clients','rajagiri']

  const labelMap: Record<string, string> = {
    admin: "Admin",
    client: "Client",
    dashboard: "Dashboard",
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
    <header className="sticky top-0 z-30 h-16 bg-white/80 backdrop-blur-md border-b border-slate-200 flex items-center justify-between px-6 gap-4">
      {/* Left: Breadcrumb */}
      <div className="flex items-center gap-2 min-w-0">
        {crumbs.map((c, i) => (
          <div key={i} className="flex items-center gap-2">
            {i > 0 && <ChevronRight className="w-3.5 h-3.5 text-slate-300" />}
            <span
              className={
                i === crumbs.length - 1
                  ? "text-sm font-semibold text-slate-900"
                  : "text-sm text-slate-400"
              }
            >
              {c}
            </span>
          </div>
        ))}
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2">
        {/* Quick Onboard */}
        <button
          onClick={() => router.push("/admin/clients/onboard")}
          className="hidden md:flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-3.5 py-2 rounded-lg transition-colors shadow-sm shadow-blue-600/20"
        >
          <Plus className="w-4 h-4" /> Onboard
        </button>

        {/* Notifications - will be added when API is built */}

        {/* User chip */}
        <div className="flex items-center gap-2 pl-2 ml-1 border-l border-slate-200">
          <div className="hidden sm:flex flex-col items-end leading-tight">
            <span className="text-sm font-medium text-slate-900 max-w-[140px] truncate">{user?.name}</span>
            <span className="text-[11px] text-slate-400 capitalize">{user?.role}</span>
          </div>
          <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-xs font-semibold text-blue-700">
            {initials}
          </div>
        </div>
      </div>
    </header>
  );
}


