/**
 * EmailDiscrepancyAudit — Admin panel for identifying and resolving email
 * discrepancies between CPR (Sybase) and NFC Prod (Postgres).
 *
 * Flow:
 *   1. Scan → compares CPR emails vs NFC user emails
 *   2. Review mismatches + not-onboarded lists
 *   3. Select which mismatches to fix
 *   4. Preview changes (dry-run verification)
 *   5. Confirm + execute batch email update
 */
import { useState, useMemo, useCallback, useEffect } from "react";
import api from "../api";
import SyncIcon from "@mui/icons-material/Sync";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import SearchOffIcon from "@mui/icons-material/SearchOff";
import {
  Button,
  Spinner,
  Panel,
  PanelHeader,
  ToggleGroup,
  ToggleGroupItem,
  DownloadButton,
  Toast,
  useToast,
} from "../components/ui";
import StepProgress from "../components/onboarding/StepProgress";
import MismatchTable from "../components/email-discrepancy/MismatchTable";
import FixStep from "../components/email-discrepancy/FixStep";
import { COLUMN_LABELS, MISMATCH_COLUMNS, NOT_ONBOARDED_COLUMNS, TABS } from "../constants/emailDiscrepancy";

// ─── Types ─────────────────────────────────────────────────────────────────

interface MismatchRecord {
  associate_id: number;
  business_entity_id: number;
  first_name: string;
  last_name: string;
  dmzid: string;
  cpr_current_email: string;
  nfc_email: string;
  nfc_updated_at: string;
}

interface NotOnboardedRecord {
  associate_id: number;
  business_entity_id: number;
  first_name: string;
  last_name: string;
  nfc_email: string;
}

interface ScanSummary {
  total_nfc_users: number;
  matched_in_cpr: number;
  email_mismatches_count: number;
  not_found_in_cpr_count: number;
  emails_in_sync_count: number;
}

type ActiveTab = typeof TABS.MISMATCHES | typeof TABS.NOT_ONBOARDED;

// ─── Scan cache (persists across navigations within same session) ───────────

interface ScanCache {
  mismatches: MismatchRecord[];
  notOnboarded: NotOnboardedRecord[];
  summary: ScanSummary;
  timestamp: number;
}

const SCAN_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
let scanCache: ScanCache | null = null;

// Step definitions for the form progress
const AUDIT_STEPS = [
  { label: "Scan", description: "Load discrepancies" },
  { label: "Select", description: "Pick entries to fix" },
  { label: "Fix", description: "Preview & apply" },
  { label: "Done", description: "Results" },
];

// Fix flow substeps
type FixStep = "idle" | "previewing" | "confirming" | "executing" | "done";

// ─── Component ─────────────────────────────────────────────────────────────

export default function EmailDiscrepancyAudit() {
  // Scan state
  const [scanning, setScanning] = useState(false);
  const [scanned, setScanned] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [mismatches, setMismatches] = useState<MismatchRecord[]>([]);
  const [notOnboarded, setNotOnboarded] = useState<NotOnboardedRecord[]>([]);
  const [summary, setSummary] = useState<ScanSummary | null>(null);

  // Tab state
  const [activeTab, setActiveTab] = useState<ActiveTab>(TABS.MISMATCHES);

  // Selection state for fixes
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  // Fix flow state (step 3)
  const [fixStep, setFixStep] = useState<FixStep>("idle");
  const [previewResults, setPreviewResults] = useState<Record<string, string>[]>([]);
  const [previewRaw, setPreviewRaw] = useState<any[]>([]);
  const [fixResults, setFixResults] = useState<{
    successful: { associate_id: number; business_entity_id: number; old_email: string; new_email: string }[];
    failed: { associate_id: number; business_entity_id: number; error: string }[];
  } | null>(null);
  const [fixError, setFixError] = useState<string | null>(null);

  const [toast, setToast] = useToast();

  // Current step for progress indicator
  const currentStep = fixStep === "done" ? 3 : fixStep !== "idle" ? 2 : !scanned && !scanError ? 0 : 1;

  // ── Auto-scan on mount (with cache) ────────────────────────────────────────

  useEffect(() => {
    // Use cache if fresh
    if (scanCache && Date.now() - scanCache.timestamp < SCAN_CACHE_TTL_MS) {
      setMismatches(scanCache.mismatches);
      setNotOnboarded(scanCache.notOnboarded);
      setSummary(scanCache.summary);
      setScanned(true);
      return;
    }
    runScan();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
      // Cache the results
      if (s) {
        scanCache = { mismatches: m, notOnboarded: n, summary: s, timestamp: Date.now() };
      }
    } catch (e: any) {
      const detail = e.response?.data?.detail;
      const status = e.response?.status;
      if (status === 404) {
        setScanError(detail || "Required database connections not found. Add CPR and NFC Prod connections first.");
      } else if (status === 503) {
        setScanError(detail || "Database connection failed. Check network/VPN.");
      } else if (status === 403) {
        setScanError("Permission denied. You need 'admin:email_discrepancy_audit' access.");
      } else {
        setScanError(detail || "An unexpected error occurred during the scan.");
      }
    }
    setScanning(false);
  }, []);

  // ── Selection ────────────────────────────────────────────────────────────

  const toggleSelection = (associateId: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(associateId)) {
        next.delete(associateId);
      } else {
        next.add(associateId);
      }
      return next;
    });
  };

  const selectAllMismatches = () => {
    const allIds = mismatches.map((m) => m.associate_id);
    setSelectedIds(new Set(allIds));
  };

  const clearSelection = () => setSelectedIds(new Set());

  // ── Fix step (inline) ────────────────────────────────────────────────────

  const selectedMismatches = useMemo(
    () => mismatches.filter((m) => selectedIds.has(m.associate_id)),
    [mismatches, selectedIds],
  );

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
      // Build CsvPreview-compatible rows
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
      setFixResults({
        successful: response.data.successful_updates || [],
        failed: response.data.failed_updates || [],
      });
      setFixStep("done");
      if (failedCount === 0) setToast({ ok: true, msg: `${successCount} email(s) updated successfully.` });
      else setToast({ ok: false, msg: `${successCount} updated, ${failedCount} failed.` });
      // Invalidate cache so re-scan fetches fresh
      scanCache = null;
    } catch (e: any) {
      setFixError(e.response?.data?.detail || "Batch fix failed.");
      setToast({ ok: false, msg: e.response?.data?.detail || "Batch fix failed." });
      setFixStep("confirming");
    }
  }, [previewRaw, selectedMismatches, setToast]);

  const previewHeaders = ["Associate ID", "BEID", "Current NFC Email", "New Email (CPR)", "Status"];
  const readyCount = previewRaw.filter((r: any) => r.status === "ready").length;

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

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="container audit-container">
      <div className="toolbar">
        <span className="toolbar-title">Email Discrepancy Audit</span>
        <span className="toolbar-subtitle">Compares CPR AssociateEmailAccount against NFC Prod users table</span>
        <div className="toolbar-spacer" />
        {mismatches.length > 0 && <DownloadButton onClick={downloadMismatchesCsv} label="Download" doneLabel="Done" />}
        <Button variant="primary" onClick={runScan} disabled={scanning}>
          <SyncIcon sx={{ fontSize: 16, mr: 0.5 }} /> {scanning ? "Scanning..." : "Re-scan"}
        </Button>
      </div>

      <StepProgress steps={AUDIT_STEPS} currentStep={currentStep} />

      {scanning && <Spinner size="lg" label="Querying CPR + NFC Prod..." />}
      {scanError && <div className="lookup-error-badge">{scanError}</div>}

      {/* Summary Cards — only on step 1/2 */}
      {summary && fixStep === "idle" && (
        <div className="email-disc-summary">
          <div className="email-disc-stat">
            <span className="email-disc-stat-value">{summary.total_nfc_users}</span>
            <span className="email-disc-stat-label">NFC Users</span>
          </div>
          <div className="email-disc-stat">
            <span className="email-disc-stat-value">{summary.matched_in_cpr}</span>
            <span className="email-disc-stat-label">Found in CPR</span>
          </div>
          <div className="email-disc-stat">
            <span className="email-disc-stat-value">{summary.emails_in_sync_count}</span>
            <span className="email-disc-stat-label">Emails In Sync</span>
          </div>
          <div className="email-disc-stat email-disc-stat--warning">
            <span className="email-disc-stat-value">{summary.email_mismatches_count}</span>
            <span className="email-disc-stat-label">Email Mismatches</span>
          </div>
          <div className="email-disc-stat email-disc-stat--info">
            <span className="email-disc-stat-value">{summary.not_found_in_cpr_count}</span>
            <span className="email-disc-stat-label">Not in CPR</span>
          </div>
        </div>
      )}

      {/* Tabs — only show on step 1/2 (idle) */}
      {scanned && !scanning && fixStep === "idle" && (
        <>
          <div style={{ margin: "16px 0" }}>
            <ToggleGroup
              type="single"
              value={activeTab}
              onValueChange={(val) => {
                if (val) setActiveTab(val as ActiveTab);
              }}
            >
              <ToggleGroupItem value={TABS.MISMATCHES}>Email Mismatches ({mismatches.length})</ToggleGroupItem>
              <ToggleGroupItem value={TABS.NOT_ONBOARDED}>Not in CPR ({notOnboarded.length})</ToggleGroupItem>
            </ToggleGroup>
          </div>

          {/* Mismatches Tab */}
          {activeTab === TABS.MISMATCHES && (
            <>
              {mismatches.length === 0 ? (
                <Panel className="lookup-empty">
                  <CheckCircleIcon sx={{ fontSize: 36, color: "#22c55e" }} />
                  <span>All NFC user emails match their CPR primary email. No discrepancies found.</span>
                </Panel>
              ) : (
                <MismatchTable
                  mismatches={mismatches}
                  selectedIds={selectedIds}
                  onToggle={toggleSelection}
                  onSelectAll={selectAllMismatches}
                  onClearSelection={clearSelection}
                  onPreview={runPreview}
                />
              )}
            </>
          )}

          {/* Not Found in CPR Tab */}
          {activeTab === TABS.NOT_ONBOARDED && (
            <>
              {notOnboarded.length === 0 ? (
                <Panel className="lookup-empty">
                  <CheckCircleIcon sx={{ fontSize: 36, color: "#22c55e" }} />
                  <span>All NFC users have matching CPR associate records.</span>
                </Panel>
              ) : (
                <Panel>
                  <PanelHeader>Not Found in CPR — {notOnboarded.length} NFC users with no CPR match</PanelHeader>
                  <div className="csv-preview-scroll">
                    <table className="data-table">
                      <thead>
                        <tr>
                          {NOT_ONBOARDED_COLUMNS.map((col) => (
                            <th key={col}>{COLUMN_LABELS[col] || col}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {notOnboarded.map((row) => (
                          <tr key={row.associate_id}>
                            {NOT_ONBOARDED_COLUMNS.map((col) => (
                              <td key={col}>{(row as any)[col] ?? ""}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Panel>
              )}
            </>
          )}
        </>
      )}

      {/* ═══ Step 3: Fix ═══ */}
      {fixStep !== "idle" && (
        <FixStep
          fixStep={fixStep as any}
          fixError={fixError}
          selectedCount={selectedMismatches.length}
          readyCount={readyCount}
          previewHeaders={previewHeaders}
          previewResults={previewResults}
          fixResults={fixResults}
          onBack={() => setFixStep("idle")}
          onConfirm={executeFix}
          onBackAndRescan={() => {
            setFixStep("idle");
            setFixResults(null);
            scanCache = null;
            runScan();
          }}
        />
      )}

      {/* Empty state when scanned but nothing found */}
      {scanned && !scanning && mismatches.length === 0 && notOnboarded.length === 0 && fixStep === "idle" && (
        <Panel className="lookup-empty">
          <SearchOffIcon sx={{ fontSize: 36, opacity: 0.5 }} />
          <span>No discrepancies found. All emails are in sync.</span>
        </Panel>
      )}

      <Toast toast={toast} />
    </div>
  );
}
