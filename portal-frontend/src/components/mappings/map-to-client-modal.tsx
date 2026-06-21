"use client";

import { useState, useEffect, type FormEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Modal } from "@/components/shared/modal";
import { StandardNameCombobox } from "@/components/mappings/standard-name-combobox";
import { mapUnmappedToClient } from "@/lib/api/mappings";

interface MapToClientModalProps {
  open: boolean;
  onClose: () => void;
  /** The unmapped test names being resolved (supports bulk). */
  testNames: string[];
  tenantId: string;
}

export function MapToClientModal({ open, onClose, testNames, tenantId }: MapToClientModalProps) {
  const queryClient = useQueryClient();
  const [internalStandardName, setInternalStandardName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setInternalStandardName("");
    setError(null);
  }, [open, testNames]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!internalStandardName.trim()) {
      setError("Internal standard name is required.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await Promise.all(
        testNames.map(testName => 
          mapUnmappedToClient(tenantId, testName, {
            internalStandardName: internalStandardName.trim(),
          })
        )
      );

      toast.success(
        testNames.length > 1 
          ? `Successfully mapped ${testNames.length} tests for ${tenantId}`
          : `"${testNames[0]}" mapped for ${tenantId}`
      );
      
      queryClient.invalidateQueries({ queryKey: ["mappings", "unmapped"] });
      queryClient.invalidateQueries({ queryKey: ["mappings", "client", tenantId] });
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
      title={testNames.length > 1 ? "Bulk Map to Client" : "Map to Client"}
      description={
        testNames.length > 1
          ? `Override ${testNames.length} selected tests for ${tenantId}`
          : `Override "${testNames[0]}" for ${tenantId}`
      }
      maxWidth="max-w-lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Internal Standard Name <span className="text-red-500">*</span>
          </label>
          <StandardNameCombobox value={internalStandardName} onChange={setInternalStandardName} />
          <p className="text-xs text-slate-400 mt-1">
            {testNames.length > 1
              ? `Maps the ${testNames.length} selected client codes to an existing standard test.`
              : `Maps this client's code "${testNames[0]}" to an existing standard test.`}
          </p>
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
          <button type="button" onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
            Cancel
          </button>
          <button type="submit" disabled={submitting}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg shadow-sm shadow-blue-600/20 transition-colors disabled:opacity-60">
            {submitting ? "Mapping..." : (testNames.length > 1 ? `Map ${testNames.length} Tests` : "Map to Client")}
          </button>
        </div>
      </form>
    </Modal>
  );
}
