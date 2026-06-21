"use client";

import { useState, useEffect, type FormEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Modal } from "@/components/shared/modal";
import { AliasesInput } from "@/components/mappings/aliases-input";
import { ProfileCombobox } from "@/components/mappings/profile-combobox";
import { upsertGlobalMapping, type GlobalMappingRow, type GlobalMappingInput } from "@/lib/api/mappings";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

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

  const inputClasses = "w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-[14px] text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all shadow-sm disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed";
  const labelClasses = "block text-[13px] font-medium text-slate-700 mb-1.5";

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? "Edit Global Mapping" : "Add Global Mapping"}
      description="Standard test definition shared across all clients"
      maxWidth="max-w-xl"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        
        <div className="space-y-4">
          <div>
            <label className={labelClasses}>
              Standard Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.standardName}
              onChange={(e) => update("standardName", e.target.value)}
              disabled={isEdit}
              placeholder="e.g. Blood Sugar (Fasting)"
              className={inputClasses}
            />
            {isEdit && (
              <p className="text-[12px] text-slate-500 mt-1.5">
                Standard name is the unique key and cannot be changed.
              </p>
            )}
            {errors.standardName && (
              <p className="text-[12px] text-red-500 mt-1.5">{errors.standardName[0]}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClasses}>
                Profile <span className="text-red-500">*</span>
              </label>
              <ProfileCombobox
                value={form.profileName}
                onChange={(v) => update("profileName", v)}
                placeholder="Select a profile..."
              />
              {errors.profileName && (
                <p className="text-[12px] text-red-500 mt-1.5">{errors.profileName[0]}</p>
              )}
            </div>

            <div>
              <label className={labelClasses}>Biomarker ID</label>
              <input
                type="text"
                value={form.biomarkerId ?? ""}
                onChange={(e) => update("biomarkerId", e.target.value)}
                placeholder="e.g. BM0042"
                className={cn(inputClasses, "font-mono")}
              />
            </div>
          </div>
        </div>

        <div className="border-t border-slate-100 pt-5">
          <label className={labelClasses}>Aliases</label>
          <AliasesInput
            value={form.aliases}
            onChange={(next) => update("aliases", next)}
            placeholder="Type an alias and press Enter"
          />
          <p className="text-[12px] text-slate-500 mt-1.5">
            Alternative names / abbreviations used for matching. Stored lowercase.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-4 pt-1">
          <div>
            <label className={labelClasses}>Default Unit</label>
            <input
              type="text"
              value={form.defaultUnit ?? ""}
              onChange={(e) => update("defaultUnit", e.target.value)}
              placeholder="mg/dL"
              className={inputClasses}
            />
          </div>
          <div>
            <label className={labelClasses}>Range Min</label>
            <input
              type="number"
              step="any"
              value={rangeMin}
              onChange={(e) => setRangeMin(e.target.value)}
              placeholder="70"
              className={inputClasses}
            />
          </div>
          <div>
            <label className={labelClasses}>Range Max</label>
            <input
              type="number"
              step="any"
              value={rangeMax}
              onChange={(e) => setRangeMax(e.target.value)}
              placeholder="100"
              className={inputClasses}
            />
          </div>
        </div>

        <div className="pt-2 border-t border-slate-100 mt-2">
          <label className="flex items-center gap-3 cursor-pointer group">
            <div className={cn("w-10 h-6 rounded-full transition-colors relative", form.isActive ? "bg-blue-600" : "bg-slate-300")}>
              <div className={cn("absolute top-1 w-4 h-4 bg-white rounded-full transition-transform", form.isActive ? "left-5" : "left-1")} />
            </div>
            <input type="checkbox" checked={form.isActive} onChange={(e) => update("isActive", e.target.checked)} className="sr-only" />
            <div>
              <span className="text-[14px] font-medium text-slate-900 block group-hover:text-blue-700 transition-colors">Active Pipeline Status</span>
              <span className="text-[12px] text-slate-500">Include this mapping in the real-time processing pipeline.</span>
            </div>
          </label>
        </div>

        <div className="flex items-center justify-end gap-3 pt-6 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-[14px] font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-[14px] font-medium rounded-lg shadow-sm shadow-slate-900/10 transition-all disabled:opacity-60 disabled:hover:bg-slate-900 flex items-center justify-center min-w-[140px]"
          >
            {submitting ? (
              <motion.div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : isEdit ? "Save Changes" : "Create Mapping"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
