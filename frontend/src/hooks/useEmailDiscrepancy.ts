/**
 * useEmailDiscrepancy — Custom hook encapsulating all state, effects, and
 * handlers for the Email Discrepancy Audit page.
 */

import { useState, useMemo, useCallback, useEffect } from "react";
import api from "../api";
import { useToast } from "../components/ui";
import { MISMATCH_COLUMNS, COLUMN_LABELS, TABS } from "../constants/emailDiscrepancy";

// ─── Types ─────────────────────────────────────────────────────────────────

export interface MismatchRecord {
  associate_id: number;
  business_entity_id: number;
  first_name: string;
  last_name: string;
  dmzid: string;
  cpr_current_email: string;
  nfc_email: string;
  nfc_updated_at: string;
}

export interface NotOnboardedRecord {
  associate_id: number;
  business_entity_id: number;
  first_name: string;
  last_name: string;
  nfc_email: string;
}

export interface ScanSummary {
  total_nfc_users: number;
  matched_in_cpr: number;
  email_mismatches_count: number;
  not_found_in_cpr_count: number;
  emails_in_sync_count: number;
}

export type ActiveTab = typeof TABS.MISMATCHES | typeof TABS.NOT_ONBOARDED;
export type FixStepStatus = "idle" | "previewing" | "confirming" | "executing" | "done";

// ─── Scan cache (persists across navigations within same session) ───────────

interface ScanCache {
  mismatches: MismatchRecord[];
  notOnboarded: NotOnboardedRecord[];
  summary: ScanSummary;
  timestamp: number;
}

/** Cache TTL: 5 minutes */
const SCAN_CACHE_TTL_MS = 5 * 60 * 1000;
let scanCache: ScanCache | null = null;

// ─── Hook ──────────────────────────────────────────────────────────────────

export function useEmailDiscrepancy() {
  const [toast, setToast] = useToast();

  // Scan state
  const [scanning, setScanning] = useState(false);
  const [scanned, setScanned] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [mismatches, setMismatches] = useState<MismatchRecord[]>([]);
  const [notOnboarded, setNotOnboarded] = useState<NotOnboardedRecord[]>([]);
  const [summary, setSummary] = useState<ScanSummary | null>(null);

  // Tab state
  const [activeTab, setActiveTab] = useState<ActiveTab>(TABS.MISMATCHES);

  // Selection state
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  // Fix flow state
  const [fixStep, setFixStep] = useState<FixStepStatus>("idle");
  const [previewResults, setPreviewResults] = useState<Record<string, string>[]>([]);
  const [previewRaw, setPreviewRaw] = useState<any[]>([]);
  const [fixResults, setFixResults] = useState<{
    successful: { associate_id: number; business_entity_id: number; old_email: string; new_email: string }[];
    failed: { associate_id: number; business_entity_id: number; error: string }[];
  } | null>(null);
  const [fixError, setFixError] = useState<string | null>(null);

  // Derived
  const currentStep = fixStep === "done" ? 3 : fixStep !== "idle" ? 2 : !scanned && !scanError ? 0 : 1;
  const selectedMismatches = useMemo(
    () => mismatches.filter((m) => selectedIds.has(m.associate_id)),
    [mismatches, selectedIds],
  );
  const readyCount = previewRaw.filter((r: any) => r.status === "ready").length;
  const previewHeaders = ["Associate ID", "BEID", "Current NFC Email", "New Email (CPR)", "Status"];

  // ── Scan ─────────────────────────────────────────────────────────────────

  const runScan = useCallback(async () => {
    setScanning(true);
    setScanError(null);
    setMismatches([]);
    setNotOnboarded([]);
    setSummary(null);
    setScanned(false);
    setSelectedIds(new Set());

    try {
      const response = await api.get("/admin/email-discrepancy/scan");
      const data = response.data;
      const m = data.email_mismatches || [];
      const n = data.not_found_in_cpr || [];
      const s = data.summary || null;
      setMismatches(m);
      setNotOnboarded(n);
      setSummary(s);
      setScanned(true);
      if (s) scanCache = { mismatches: m, notOnboarded: n, summary: s, timestamp: Date.now() };
    } catch (e: any) {
      const detail = e.response?.data?.detail;
      const status = e.response?.status;
      if (status === 404) setScanError(detail || "Required database connections not found.");
      else if (status === 503) setScanError(detail || "Database connection failed. Check network/VPN.");
      else if (status === 403) setScanError("Permission denied. You need 'admin:email_discrepancy_audit' access.");
      else setScanError(detail || "An unexpected error occurred during the scan.");
    }
    setScanning(false);
  }, []);

  // Auto-scan on mount (with cache)
  useEffect(() => {
    if (scanCache && Date.now() - scanCache.timestamp < SCAN_CACHE_TTL_MS) {
      setMismatches(scanCache.mismatches);
      setNotOnboarded(scanCache.notOnboarded);
      setSummary(scanCache.summary);
      setScanned(true);
      return;
    }
    runScan();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Selection ────────────────────────────────────────────────────────────

  const toggleSelection = (associateId: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(associateId)) next.delete(associateId);
      else next.add(associateId);
      return next;
    });
  };

  const selectAllMismatches = () => setSelectedIds(new Set(mismatches.map((m) => m.associate_id)));
  const clearSelection = () => setSelectedIds(new Set());

  // ── Fix flow ─────────────────────────────────────────────────────────────

  const runPreview = useCallback(async () => {
    if (selectedMismatches.length === 0) return;
    setFixStep("previewing");
    setFixError(null);

    const fixes = selectedMismatches.map((m) => ({
      associate_id: m.associate_id,
      business_entity_id: m.business_entity_id,
      current_nfc_email: m.nfc_email,
      correct_email: m.cpr_current_email,
    }));

    try {
      const response = await api.post("/admin/email-discrepancy/fix-emails", { fixes, confirmed: false });
      const results = response.data.verification_results || [];
      setPreviewRaw(results);
      setPreviewResults(
        results.map((r: any) => ({
          "Associate ID": String(r.associate_id),
          BEID: String(r.business_entity_id),
          "Current NFC Email": r.current_email_in_db || "—",
          "New Email (CPR)": r.new_email,
          Status: r.status === "ready" ? "✓ Ready" : "⚠ Not Found",
        })),
      );
      setFixStep("confirming");
    } catch (e: any) {
      setFixError(e.response?.data?.detail || "Preview verification failed.");
      setFixStep("idle");
    }
  }, [selectedMismatches]);

  const executeFix = useCallback(async () => {
    const readyFixes = previewRaw
      .filter((r: any) => r.status === "ready")
      .map((r: any) => {
        const original = selectedMismatches.find(
          (m) => m.associate_id === r.associate_id && m.business_entity_id === r.business_entity_id,
        );
        return {
          associate_id: r.associate_id,
          business_entity_id: r.business_entity_id,
          current_nfc_email: original?.nfc_email || r.current_email_in_db || "",
          correct_email: r.new_email,
        };
      });

    if (readyFixes.length === 0) return;
    setFixStep("executing");

    try {
      const response = await api.post("/admin/email-discrepancy/fix-emails", { fixes: readyFixes, confirmed: true });
      const successCount = response.data.successful_updates?.length || 0;
      const failedCount = response.data.failed_updates?.length || 0;
      setFixResults({ successful: response.data.successful_updates || [], failed: response.data.failed_updates || [] });
      setFixStep("done");
      if (failedCount === 0) setToast({ ok: true, msg: `${successCount} email(s) updated successfully.` });
      else setToast({ ok: false, msg: `${successCount} updated, ${failedCount} failed.` });
      scanCache = null;
    } catch (e: any) {
      setFixError(e.response?.data?.detail || "Batch fix failed.");
      setToast({ ok: false, msg: e.response?.data?.detail || "Batch fix failed." });
      setFixStep("confirming");
    }
  }, [previewRaw, selectedMismatches, setToast]);

  const resetFixAndRescan = () => {
    setFixStep("idle");
    setFixResults(null);
    scanCache = null;
    runScan();
  };

  // ── CSV Download ─────────────────────────────────────────────────────────

  const downloadMismatchesCsv = () => {
    if (!mismatches.length) return;
    const headers = MISMATCH_COLUMNS.map((c) => COLUMN_LABELS[c] || c).join(",");
    const rows = mismatches.map((m) =>
      MISMATCH_COLUMNS.map((col) => `"${String((m as any)[col] ?? "").replace(/"/g, '""')}"`).join(","),
    );
    const csv = [headers, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "email_discrepancies.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return {
    toast,
    // Scan
    scanning,
    scanned,
    scanError,
    mismatches,
    notOnboarded,
    summary,
    runScan,
    // Tab
    activeTab,
    setActiveTab,
    // Selection
    selectedIds,
    toggleSelection,
    selectAllMismatches,
    clearSelection,
    // Fix flow
    fixStep,
    setFixStep,
    previewResults,
    previewHeaders,
    fixResults,
    fixError,
    selectedMismatches,
    readyCount,
    runPreview,
    executeFix,
    resetFixAndRescan,
    // Misc
    currentStep,
    downloadMismatchesCsv,
  };
}
