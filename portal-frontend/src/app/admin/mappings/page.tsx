"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { FileStack, FolderOpen, AlertCircle } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Tabs, type TabItem } from "@/components/mappings/tabs";
import { GlobalMappingsTab } from "@/components/mappings/global-mappings-tab";
import { ClientMappingsTab } from "@/components/mappings/client-mappings-tab";
import { UnmappedTab } from "@/components/mappings/unmapped-tab";
import { 
  fetchUnmappedSummary, 
  fetchGlobalMappings,
  fetchGlobalProfiles,
  mappingKeys 
} from "@/lib/api/mappings";
import { cn } from "@/lib/utils";

const VALID_TABS = ["global", "clients", "unmapped"] as const;
type TabKey = (typeof VALID_TABS)[number];

function KpiCard({ title, value, icon: Icon, colorClass, isLoading }: any) {
  return (
    <div className="bg-white rounded-xl border border-slate-200/60 p-5 shadow-[0_2px_12px_rgba(15,23,42,0.03)] flex items-center gap-4">
      <div className={cn("p-3 rounded-lg flex-shrink-0", colorClass)}>
        <Icon className="w-6 h-6" />
      </div>
      <div>
        <p className="text-sm font-medium text-slate-500 mb-0.5">{title}</p>
        {isLoading ? (
          <div className="h-7 w-16 bg-slate-100 rounded animate-pulse mt-1" />
        ) : (
          <p className="text-2xl font-bold text-slate-900 tracking-tight">{value}</p>
        )}
      </div>
    </div>
  );
}

function MappingsContent() {
  const router = useRouter();
  const params = useSearchParams();

  const rawTab = params.get("tab");
  const tab: TabKey = (VALID_TABS as readonly string[]).includes(rawTab || "")
    ? (rawTab as TabKey)
    : "global";
  const tenant = params.get("tenant");

  // KPI Data Fetching
  const { data: summary, isLoading: loadingSummary } = useQuery({
    queryKey: mappingKeys.unmappedSummary(),
    queryFn: fetchUnmappedSummary,
    refetchInterval: 60000,
  });

  const { data: globalData, isLoading: loadingGlobal } = useQuery({
    queryKey: mappingKeys.global({ limit: 1 } as any),
    queryFn: () => fetchGlobalMappings({ limit: 1 }),
  });

  const { data: profilesData, isLoading: loadingProfiles } = useQuery({
    queryKey: mappingKeys.globalProfiles(),
    queryFn: fetchGlobalProfiles,
  });

  const unmappedBadge = summary?.data?.length ?? 0;
  const totalGlobal = globalData?.meta?.total ?? 0;
  const totalProfiles = profilesData?.data?.length ?? 0;

  function setTab(next: string) {
    const sp = new URLSearchParams(params.toString());
    sp.set("tab", next);
    // tenant is only meaningful for clients + unmapped views; keep it otherwise drop
    if (next === "global") sp.delete("tenant");
    router.replace(`/admin/mappings?${sp.toString()}`, { scroll: false });
  }

  function setTenant(tenantId: string | null) {
    const sp = new URLSearchParams(params.toString());
    if (tenantId) sp.set("tenant", tenantId);
    else sp.delete("tenant");
    router.replace(`/admin/mappings?${sp.toString()}`, { scroll: false });
  }

  const items: TabItem[] = [
    { key: "global", label: "Global" },
    { key: "clients", label: "Clients" },
    { key: "unmapped", label: "Unmapped", badge: unmappedBadge },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Mappings"
        subtitle="Standard test dictionary, client overrides, and unmapped monitoring"
      />

      {/* Top KPI Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KpiCard 
          title="Parameters Mapped" 
          value={totalGlobal.toLocaleString()} 
          icon={FileStack} 
          colorClass="bg-blue-50 text-blue-600"
          isLoading={loadingGlobal}
        />
        <KpiCard 
          title="Total Profiles" 
          value={totalProfiles.toLocaleString()} 
          icon={FolderOpen} 
          colorClass="bg-violet-50 text-violet-600"
          isLoading={loadingProfiles}
        />
        <KpiCard 
          title="Unmapped Alerts" 
          value={unmappedBadge.toLocaleString()} 
          icon={AlertCircle} 
          colorClass="bg-amber-50 text-amber-600"
          isLoading={loadingSummary}
        />
      </div>

      <Tabs items={items} active={tab} onChange={setTab} />

      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.18 }}
        >
          {tab === "global" && <GlobalMappingsTab />}
          {tab === "clients" && (
            <ClientMappingsTab tenantId={tenant} onSelectTenant={setTenant} />
          )}
          {tab === "unmapped" && (
            <UnmappedTab tenantId={tenant} onSelectTenant={setTenant} />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

export default function MappingsPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-slate-400">Loading mappings...</div>}>
      <MappingsContent />
    </Suspense>
  );
}
