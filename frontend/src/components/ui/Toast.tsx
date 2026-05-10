import { motion, AnimatePresence } from "framer-motion";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";

export interface ToastData {
  ok: boolean;
  msg: string;
}

interface ToastProps {
  toast: ToastData | null;
}

export function Toast({ toast }: ToastProps) {
  return (
    <AnimatePresence>
      {toast && (
        <motion.div
          className={`toast ${toast.ok ? "toast-success" : "toast-error"}`}
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 40 }}
          role="status"
          aria-live="polite"
        >
          {toast.ok ? (
            <CheckCircleIcon sx={{ fontSize: 16, verticalAlign: "middle", mr: 0.5 }} />
          ) : (
            <CancelIcon sx={{ fontSize: 16, verticalAlign: "middle", mr: 0.5 }} />
          )}{" "}
          {toast.msg}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ── useToast hook ─────────────────────────────────────────────────────────────
// Convenience hook: returns [toast, showToast] with auto-dismiss after 4s.

import { useState, useEffect } from "react";

export function useToast(durationMs = 4000) {
  const [toast, setToast] = useState<ToastData | null>(null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), durationMs);
    return () => clearTimeout(t);
  }, [toast, durationMs]);

  return [toast, setToast] as const;
}
