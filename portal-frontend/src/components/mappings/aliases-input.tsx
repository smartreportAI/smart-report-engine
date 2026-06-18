"use client";

import { useState, type KeyboardEvent } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface AliasesInputProps {
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
}

/**
 * Tag-style multi-value input. Enter or comma adds a chip, Backspace on an
 * empty field removes the last chip. Values are lowercased and de-duped.
 */
export function AliasesInput({ value, onChange, placeholder }: AliasesInputProps) {
  const [draft, setDraft] = useState("");

  function addFromDraft() {
    const candidate = draft.trim().toLowerCase();
    if (!candidate) return;
    if (!value.includes(candidate)) {
      onChange([...value, candidate]);
    }
    setDraft("");
  }

  function removeAt(index: number) {
    onChange(value.filter((_, i) => i !== index));
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addFromDraft();
    } else if (e.key === "Backspace" && draft === "" && value.length > 0) {
      removeAt(value.length - 1);
    }
  }

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-1.5 w-full px-2 py-1.5 border border-slate-300 rounded-lg",
        "focus-within:ring-2 focus-within:ring-blue-600/20 focus-within:border-blue-600"
      )}
    >
      {value.map((alias, i) => (
        <span
          key={alias}
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-xs font-mono"
        >
          {alias}
          <button
            type="button"
            onClick={() => removeAt(i)}
            className="text-slate-400 hover:text-red-500 transition-colors"
            aria-label={`Remove ${alias}`}
          >
            <X className="w-3 h-3" />
          </button>
        </span>
      ))}
      <input
        type="text"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={onKeyDown}
        onBlur={addFromDraft}
        placeholder={value.length === 0 ? placeholder || "Type and press Enter" : ""}
        className="flex-1 min-w-[120px] py-1 text-sm bg-transparent outline-none placeholder:text-slate-400"
      />
    </div>
  );
}
