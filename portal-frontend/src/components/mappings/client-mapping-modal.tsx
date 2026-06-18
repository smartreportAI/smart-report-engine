"use client";

import { useState, useEffect, type FormEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Modal } from "@/components/shared/modal";
import { StandardNameCombobox } from "@/components/mappings/standard-name-combobox";
import { ProfileCombobox } from "@/components/mappings/profile-combobox";
import { upsertClientMapping, type ClientMappingRow, type ClientMappingInput } from "@/lib/api/mappings";

interface ClientMappingModalProps {
  open: boolean;
  onClose: () => void;
  tenantId: string;
  editing?: ClientMappingRow | null;
}

interface FieldErrors {
  [key: string]: string[] | undefined;
}

export function ClientMappingModal({ open, onClose, tenantId, editing }: ClientMappingModalProps) {
  const queryClient = useQueryClient();
  const isEdit = !!editing;

  const [externalCode, setExternalCode] = useState("");
  const [externalDisplay, setExternalDisplay] = useState("");
  const [internalStandardName, setInternalStandardName] = useState("");
  const [internalProfileName, setInternalProfileName] = useState("");
  const [unitOverride, setUnitOverride] = useState("");
  const [rangeMin, setRangeMin] = useState("");
  const [rangeMax, setRangeMax] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setExternalCode(editing.externalCode);
      setExternalDisplay(editing.externalDisplay ?? "");
      setInternalStandardName(editing.internalStandardName);
      setInternalProfileName(editing.internalProfileName ?? "");
      setUnitOverride(editing.unitOverride ?? "");
      setRangeMin(editing.rangeOverride?.min?.toString() ?? "");
      setRangeMax(editing.rangeOverride?.max?.toString() ?? "");
      setIsActive(editing.isActive);
    } else {
      setExternalCode("");
      setExternalDisplay("");
      setInternalStandardName("");
      setInternalProfileName("");
      setUnitOverride("");
      setRangeMin("");
      setRangeMax("");
      setIsActive(true);
    }
    setErrors({});
  }, [open, editing]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!externalCode.trim() || !internalStandardName.trim()) {
      setErrors({
        externalCode: !externalCode.trim() ? ["External code is required"] : undefined,
        internalStandardName: !internalStandardName.trim() ? ["Internal standard name is required"] : undefined,
      });
      return;
    }

    const min = rangeMin.trim() === "" ? undefined : Number(rangeMin);
    const max = rangeMax.trim() === "" ? undefined : Number(rangeMax);
    const hasRange = min !== undefined || max !== undefined;

    const body: ClientMappingInput = {
      externalCode: externalCode.trim(),
      externalDisplay: externalDisplay.trim() || undefined,
      internalStandardName: internalStandardName.trim(),
      internalProfileName: internalProfileName.trim() || undefined,
      unitOverride: unitOverride.trim() || undefined,
      rangeOverride: hasRange ? { min, max } : undefined,
      isActive,
    };

    setSubmitting(true);
    setErrors({});
    try {
      await upsertClientMapping(tenantId, body);
      toast.success(isEdit ? "Override updated" : "Override created");
      queryClient.invalidateQueries({ queryKey: ["mappings", "client", tenantId] });
      onClose();
    } catch (err: any) {
      if (err?.code === "VALIDATION_ERROR" && err?.details) {
        setErrors(err.details as FieldErrors);
      }
      toast.error(err?.message || "Failed to save override");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? "Edit Client Override" : "Add Client Override"}
      description={`LIS code override for ${tenantId}`}
      maxWidth="max-w-lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              External Code <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={externalCode}
              onChange={(e) => setExternalCode(e.target.value)}
              disabled={isEdit}
              placeholder="e.g. GLUF"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 disabled:bg-slate-50 disabled:text-slate-500"
            />
            {isEdit && (
              <p className="text-xs text-slate-400 mt-1">Code is the unique key and cannot be changed.</p>
            )}
            {errors.externalCode && <p className="text-xs text-red-500 mt-1">{errors.externalCode[0]}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">External Display</label>
            <input
              type="text"
              value={externalDisplay}
              onChange={(e) => setExternalDisplay(e.target.value)}
              placeholder="Name the LIS sends"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Internal Standard Name <span className="text-red-500">*</span>
          </label>
          <StandardNameCombobox value={internalStandardName} onChange={setInternalStandardName} />
          {errors.internalStandardName && (
            <p className="text-xs text-red-500 mt-1">{errors.internalStandardName[0]}</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Profile Override</label>
            <ProfileCombobox
              value={internalProfileName}
              onChange={setInternalProfileName}
              placeholder="Optional — inherits global"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Unit Override</label>
            <input
              type="text"
              value={unitOverride}
              onChange={(e) => setUnitOverride(e.target.value)}
              placeholder="Optional"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Range Min</label>
            <input
              type="number"
              step="any"
              value={rangeMin}
              onChange={(e) => setRangeMin(e.target.value)}
              placeholder="Optional"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Range Max</label>
            <input
              type="number"
              step="any"
              value={rangeMax}
              onChange={(e) => setRangeMax(e.target.value)}
              placeholder="Optional"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
            />
          </div>
        </div>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-600/20"
          />
          <span className="text-sm text-slate-700">Active</span>
        </label>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
          <button type="button" onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
            Cancel
          </button>
          <button type="submit" disabled={submitting}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg shadow-sm shadow-blue-600/20 transition-colors disabled:opacity-60">
            {submitting ? "Saving..." : isEdit ? "Save Changes" : "Create Override"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
