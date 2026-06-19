import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "../Motion";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";
import { Button, DownloadButton } from "../ui";

interface Props {
  detailText: string | null;
  onClose: () => void;
}

interface ChangeManifest {
  operation: string;
  total_attempted: number;
  successful_count: number;
  failed_count: number;
  changes: { associate_id: number; business_entity_id: number; old_email: string; new_email: string }[];
  failures: {
    associate_id: number;
    business_entity_id: number;
    old_email?: string;
    attempted_new_email?: string;
    error: string;
  }[];
}

function tryParseChangeManifest(text: string): ChangeManifest | null {
  try {
    const parsed = JSON.parse(text);
    if (parsed && parsed.operation === "EMAIL_DISCREPANCY_FIX" && Array.isArray(parsed.changes)) {
      return parsed as ChangeManifest;
    }
  } catch {
    // Not JSON or not our format
  }
  return null;
}

export default function AuditDetailModal({ detailText, onClose }: Props) {
  const [copied, setCopied] = useState(false);

  const manifest = useMemo(() => (detailText ? tryParseChangeManifest(detailText) : null), [detailText]);

  const handleCopy = () => {
    if (detailText) {
      navigator.clipboard.writeText(detailText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleExportCsv = () => {
    if (!manifest) return;
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    const headers = ["Associate ID", "BEID", "Old Email", "New Email", "Status"].join(",");
    const successRows = manifest.changes.map((r) =>
      [r.associate_id, r.business_entity_id, r.old_email, r.new_email, "SUCCESS"]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(","),
    );
    const failedRows = manifest.failures.map((r) =>
      [r.associate_id, r.business_entity_id, "", "", `FAILED: ${r.error}`]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(","),
    );
    const csv = [headers, ...successRows, ...failedRows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `email_fix_audit_${timestamp}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AnimatePresence>
      {detailText !== null && (
        <div className="audit-modal-overlay" onClick={onClose}>
          <motion.div
            className="audit-modal"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.2 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="audit-modal-header">
              <span>{manifest ? "Email Fix Report" : "Details"}</span>
              <div className="audit-modal-actions">
                {manifest && <DownloadButton onClick={handleExportCsv} label="Download" doneLabel="Done" />}
                <Button size="sm" title="Copy to clipboard" onClick={handleCopy}>
                  {copied ? (
                    <>
                      <CheckIcon sx={{ fontSize: 14 }} /> Copied
                    </>
                  ) : (
                    <>
                      <ContentCopyIcon sx={{ fontSize: 14 }} /> Copy
                    </>
                  )}
                </Button>
                <Button size="icon" variant="ghost" title="Close" onClick={onClose}>
                  <CloseIcon sx={{ fontSize: 18 }} />
                </Button>
              </div>
            </div>

            {manifest ? (
              <div className="audit-modal-body">
                <div className="email-disc-modal-summary" style={{ marginBottom: 12 }}>
                  <span>
                    <strong>{manifest.total_attempted}</strong> attempted
                  </span>
                  <span style={{ color: "#22c55e" }}>
                    <strong>{manifest.successful_count}</strong> successful
                  </span>
                  {manifest.failed_count > 0 && (
                    <span style={{ color: "#ef4444" }}>
                      <strong>{manifest.failed_count}</strong> failed
                    </span>
                  )}
                </div>
                {manifest.failed_count > 0 && (
                  <div className="email-disc-warning-box">
                    <strong>Failure details:</strong>
                    <ul style={{ margin: "6px 0 0", paddingLeft: 16, fontSize: "0.8rem" }}>
                      {manifest.failures.slice(0, 10).map((f) => (
                        <li key={`err-${f.associate_id}`}>
                          Associate {f.associate_id} (BEID {f.business_entity_id}): {f.error}
                        </li>
                      ))}
                      {manifest.failures.length > 10 && (
                        <li>...and {manifest.failures.length - 10} more. Export CSV for full list.</li>
                      )}
                    </ul>
                  </div>
                )}
                <p style={{ fontSize: "0.85rem", opacity: 0.7, marginTop: 12 }}>
                  Use <strong>Export CSV</strong> to download the full change report with all {manifest.total_attempted}{" "}
                  rows.
                </p>
              </div>
            ) : (
              <div className="audit-modal-body">{detailText}</div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
