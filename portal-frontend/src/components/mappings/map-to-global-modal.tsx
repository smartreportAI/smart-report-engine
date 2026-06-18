"use client";

import { useState, useEffect, type FormEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Modal } from "@/components/shared/modal";
import { AliasesInput } from "@/components/mappings/aliases-input";
import { ProfileCombobox } from "@/components/mappings/profile-combobox";
import { mapUnmappedToGlobal, PLACEHOLDER_TENANT } from "@/lib/api/mappings";

interface MapToGlobalModalProps {
  open: boolean;
  onClose: () => void;
  /** The unmapped test name being resolved. */
  testName: string;
  /** Tenant the entry belongs to; omitted/null when resolving from the all-clients summary. */
  tenantId?: string | null;
}

export function MapToGlobalModal({ open, onClose, testName, tenantId }: MapToGlobalModalProps) {
  const queryClient = useQueryClient();
  const [standardName, setStandardName] = useState("");
  const [profileName, setProfileName] = useState("");
  const [aliases, setAliases] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    // Pre-seed: suggest the raw test name as the standard name + first alias.
    setStandardName(testName);
    setProfileName("");
    setAliases(testName ? [testName.toLowerCase()] : []);
    setError(null);
  }, [open, testName]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!standardName.trim() || !profileName.trim()) {
      setError("Standard name and profile are required.");
      return;
    }
    const effectiveTenant = tenantId || PLACEHOLDER_TENANT;
    setSubmitting(true);
    setError(null);
    try {
      await mapUnmappedToGlobal(effectiveTenant, testName, {
        standardName: standardName.trim(),
        profileName: profileName.trim(),
        aliases,
      });
      toast.success(`"${testName}" mapped to global standard`);
      queryClient.invalidateQueries({ queryKey: ["mappings", "unmapped"] });
      queryClient.invalidateQueries({ queryKey: ["mappings", "global"] });
      onClose();
    } catch (err: any) {
      setError(err?.message || "Failed to map");
      toast.error(err?.message || "Failed to map");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Map to Global"
      description={`Create a system-wide standard for "${testName}"`}
      maxWidth="max-w-lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Standard Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={standardName}
            onChange={(e) => setStandardName(e.target.value)}
            placeholder="e.g. Blood Sugar (Fasting)"
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Profile <span className="text-red-500">*</span>
          </label>
          <ProfileCombobox value={profileName} onChange={setProfileName} placeholder="Select a profile..." />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Aliases</label>
          <AliasesInput value={aliases} onChange={setAliases} placeholder="Type an alias and press Enter" />
          <p className="text-xs text-slate-400 mt-1">The original test name is pre-added so future reports match.</p>
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
          <button type="button" onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
            Cancel
          </button>
          <button type="submit" disabled={submitting}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg shadow-sm shadow-blue-600/20 transition-colors disabled:opacity-60">
            {submitting ? "Mapping..." : "Map to Global"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
