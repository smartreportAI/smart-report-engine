"use client";

import { useState, useEffect, type FormEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Modal } from "@/components/shared/modal";
import { AliasesInput } from "@/components/mappings/aliases-input";
import { ProfileCombobox } from "@/components/mappings/profile-combobox";
import { upsertGlobalMapping, type GlobalMappingRow, type GlobalMappingInput } from "@/lib/api/mappings";

interface GlobalMappingModalProps {
  open: boolean;
  onClose: () => void;
  /** When provided, the modal is in edit mode (standardName is locked). */
  editing?: GlobalMappingRow | null;
}

interface FieldErrors {
  [key: string]: string[] | undefined;
}

const EMPTY: GlobalMappingInput = {
  biomarkerId: "",
  standardName: "",
  profileName: "",
  aliases: [],
  defaultUnit: "",
  defaultRange: null,
  isActive: true,
};

export function GlobalMappingModal({ open, onClose, editing }: GlobalMappingModalProps) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<GlobalMappingInput>(EMPTY);
  const [rangeMin, setRangeMin] = useState("");
  const [rangeMax, setRangeMax] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});

  const isEdit = !!editing;

  // Sync form with the row being edited (or reset for a fresh add).
  useEffect(() => {
    if (!open) return;
    if (editing) {
      setForm({
        biomarkerId: editing.biomarkerId ?? "",
        standardName: editing.standardName,
        profileName: editing.profileName,
        aliases: editing.aliases ?? [],
        defaultUnit: editing.defaultUnit ?? "",
        defaultRange: editing.defaultRange ?? null,
        isActive: editing.isActive,
      });
      setRangeMin(editing.defaultRange?.min?.toString() ?? "");
      setRangeMax(editing.defaultRange?.max?.toString() ?? "");
    } else {
      setForm(EMPTY);
      setRangeMin("");
      setRangeMax("");
    }
    setErrors({});
  }, [open, editing]);

  function update<K extends keyof GlobalMappingInput>(key: K, value: GlobalMappingInput[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form.standardName.trim() || !form.profileName.trim()) {
      setErrors({
        standardName: !form.standardName.trim() ? ["Standard name is required"] : undefined,
        profileName: !form.profileName.trim() ? ["Profile is required"] : undefined,
      });
      return;
    }

    const min = rangeMin.trim() === "" ? undefined : Number(rangeMin);
    const max = rangeMax.trim() === "" ? undefined : Number(rangeMax);
    const hasRange = min !== undefined || max !== undefined;

    const body: GlobalMappingInput = {
      biomarkerId: form.biomarkerId?.trim() ? form.biomarkerId.trim() : null,
      standardName: form.standardName.trim(),
      profileName: form.profileName.trim(),
      aliases: form.aliases,
      defaultUnit: form.defaultUnit?.trim() ? form.defaultUnit.trim() : null,
      defaultRange: hasRange ? { min, max } : null,
      isActive: form.isActive,
    };

    setSubmitting(true);
    setErrors({});
    try {
      await upsertGlobalMapping(body);
      toast.success(isEdit ? "Global mapping updated" : "Global mapping created");
      queryClient.invalidateQueries({ queryKey: ["mappings", "global"] });
      onClose();
    } catch (err: any) {
      if (err?.code === "VALIDATION_ERROR" && err?.details) {
        setErrors(err.details as FieldErrors);
      }
      toast.error(err?.message || "Failed to save mapping");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? "Edit Global Mapping" : "Add Global Mapping"}
      description="Standard test definition shared across all clients"
      maxWidth="max-w-lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Standard Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.standardName}
              onChange={(e) => update("standardName", e.target.value)}
              disabled={isEdit}
              placeholder="e.g. Blood Sugar (Fasting)"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 disabled:bg-slate-50 disabled:text-slate-500"
            />
            {isEdit && (
              <p className="text-xs text-slate-400 mt-1">
                Standard name is the unique key and cannot be changed.
              </p>
            )}
            {errors.standardName && (
              <p className="text-xs text-red-500 mt-1">{errors.standardName[0]}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Profile <span className="text-red-500">*</span>
            </label>
            <ProfileCombobox
              value={form.profileName}
              onChange={(v) => update("profileName", v)}
              placeholder="Select a profile..."
            />
            {errors.profileName && (
              <p className="text-xs text-red-500 mt-1">{errors.profileName[0]}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Biomarker ID</label>
            <input
              type="text"
              value={form.biomarkerId ?? ""}
              onChange={(e) => update("biomarkerId", e.target.value)}
              placeholder="e.g. BM0042"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Aliases</label>
          <AliasesInput
            value={form.aliases}
            onChange={(next) => update("aliases", next)}
            placeholder="Type an alias and press Enter"
          />
          <p className="text-xs text-slate-400 mt-1">
            Alternative names / abbreviations used for matching. Stored lowercase.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Default Unit</label>
            <input
              type="text"
              value={form.defaultUnit ?? ""}
              onChange={(e) => update("defaultUnit", e.target.value)}
              placeholder="mg/dL"
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
              placeholder="70"
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
              placeholder="100"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
            />
          </div>
        </div>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={form.isActive}
            onChange={(e) => update("isActive", e.target.checked)}
            className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-600/20"
          />
          <span className="text-sm text-slate-700">Active (included in the mapping pipeline)</span>
        </label>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg shadow-sm shadow-blue-600/20 transition-colors disabled:opacity-60"
          >
            {submitting ? "Saving..." : isEdit ? "Save Changes" : "Create Mapping"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
