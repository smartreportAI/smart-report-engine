"use client";

import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, Info } from "lucide-react";
import { useEffect } from "react";
import { cn } from "@/lib/utils";

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "default";
  loading?: boolean;
}

/**
 * Reusable confirmation dialog for consequential actions (disable, delete,
 * etc.). Keeps destructive actions one deliberate click away, with clear
 * consequence text. Matches the shared Modal's look and motion.
 */
export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "default",
  loading = false,
}: ConfirmDialogProps) {
  useEffect(() => {
    function onEsc(e: KeyboardEvent) {
      if (e.key === "Escape" && !loading) onClose();
    }
    if (open) {
      document.addEventListener("keydown", onEsc);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", onEsc);
      document.body.style.overflow = "";
    };
  }, [open, onClose, loading]);

  const isDanger = variant === "danger";

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={() => !loading && onClose()}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50"
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="bg-white rounded-xl border border-slate-200 shadow-xl w-full max-w-md pointer-events-auto"
            >
              <div className="flex items-start gap-4 px-6 py-5">
                <div
                  className={cn(
                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
                    isDanger ? "bg-red-50" : "bg-blue-50"
                  )}
                >
                  {isDanger ? (
                    <AlertTriangle className="h-5 w-5 text-red-600" />
                  ) : (
                    <Info className="h-5 w-5 text-blue-600" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="text-base font-semibold text-slate-900">{title}</h2>
                  <div className="mt-1 text-sm text-slate-500">{message}</div>
                </div>
              </div>
              <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={loading}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50"
                >
                  {cancelLabel}
                </button>
                <button
                  type="button"
                  onClick={onConfirm}
                  disabled={loading}
                  className={cn(
                    "px-4 py-2 text-sm font-medium text-white rounded-lg shadow-sm transition-colors disabled:opacity-60",
                    isDanger
                      ? "bg-red-600 hover:bg-red-700 shadow-red-600/20"
                      : "bg-blue-600 hover:bg-blue-700 shadow-blue-600/20"
                  )}
                >
                  {loading ? "Working..." : confirmLabel}
                </button>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
