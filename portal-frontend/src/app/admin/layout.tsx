"use client";

import { AuthGuard } from "@/lib/auth/guard";
import { SessionNavBar } from "@/components/ui/sidebar";
import { Topbar } from "@/components/layout/topbar";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard requiredRoles={["admin", "superadmin"]}>
      <div className="min-h-screen bg-slate-50">
        <SessionNavBar role="admin" />
        {/* Left padding matches the collapsed sidebar width (4rem) */}
        <div className="pl-16 min-h-screen flex flex-col">
          <Topbar />
          <main className="flex-1 p-6">{children}</main>
        </div>
      </div>
    </AuthGuard>
  );
}
