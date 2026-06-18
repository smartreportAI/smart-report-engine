"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { PageHeader } from "@/components/shared/page-header";
import { Tabs, type TabItem } from "@/components/mappings/tabs";
import { GlobalMappingsTab } from "@/components/mappings/global-mappings-tab";
import { ClientMappingsTab } from "@/components/mappings/client-mappings-tab";
import { UnmappedTab } from "@/components/mappings/unmapped-tab";
import { fetchUnmappedSummary, mappingKeys } from "@/lib/api/mappings";

const VALID_TABS = ["global", "clients", "unmapped"] as const;
type TabKey = (typeof VALID_TABS)[number];

function MappingsContent() {
  const router = useRouter();
  const params = useSearchParams();

  const rawTab = params.get("tab");
  const tab: TabKey = (VALID_TABS as readonly string[]).includes(rawTab || "")
    ? (rawTab as TabKey)
    : "global";
  const tenant = params.get("tenant");

  // Lightweight badge: number of distinct unmapped test names across clients.
  const { data: summary } = useQuery({
    queryKey: mappingKeys.unmappedSummary(),
    queryFn: fetchUnmappedSummary,
    refetchInterval: 60000,
  });
  const unmappedBadge = summary?.data?.length ?? 0;

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
