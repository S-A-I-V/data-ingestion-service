/**
 * FixStep — Preview, confirm, execute, and show results for email fixes.
 * Extracted from EmailDiscrepancyAudit for modularization.
 */
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import { Button, Spinner, Panel, PanelHeader } from "../ui";
import CsvPreview from "../ingest/CsvPreview";

interface FixResult {
  successful: { associate_id: number; business_entity_id: number; old_email: string; new_email: string }[];
  failed: { associate_id: number; business_entity_id: number; error: string }[];
}

interface Props {
  fixStep: "previewing" | "confirming" | "executing" | "done";
  fixError: string | null;
  selectedCount: number;
  readyCount: number;
  previewHeaders: string[];
  previewResults: Record<string, string>[];
  fixResults: FixResult | null;
  onBack: () => void;
  onConfirm: () => void;
  onBackAndRescan: () => void;
}

export default function FixStep({
  fixStep,
  fixError,
  selectedCount,
  readyCount,
  previewHeaders,
  previewResults,
  fixResults,
  onBack,
  onConfirm,
  onBackAndRescan,
}: Props) {
  if (fixStep === "previewing") {
    return <Spinner size="lg" label="Verifying target users in NFC Prod..." />;
  }

  if (fixStep === "executing") {
    return <Spinner size="lg" label="Updating NFC Prod users table..." />;
  }

  if (fixStep === "confirming") {
    return (
      <>
        {fixError && <div className="lookup-error-badge">{fixError}</div>}

        <div className="email-disc-summary">
          <div className="email-disc-stat">
            <span className="email-disc-stat-value">{selectedCount}</span>
            <span className="email-disc-stat-label">Selected</span>
          </div>
          <div className="email-disc-stat email-disc-stat--warning">
            <span className="email-disc-stat-value">{readyCount}</span>
            <span className="email-disc-stat-label">Ready to Fix</span>
          </div>
        </div>

        {previewResults.length > 0 && <CsvPreview headers={previewHeaders} rows={previewResults} />}

        <div className="email-disc-actions">
          <Button variant="secondary" onClick={onBack}>
            ← Back to Select
          </Button>
          <div className="toolbar-spacer" />
          <Button variant="primary" onClick={onConfirm} disabled={readyCount === 0}>
            Confirm &amp; Apply ({readyCount} updates)
          </Button>
        </div>
      </>
    );
  }

  if (fixStep === "done" && fixResults) {
    return (
      <Panel>
        <PanelHeader>
          {fixResults.failed.length === 0 ? (
            <span className="email-disc-cell--correct">
              <CheckCircleIcon sx={{ fontSize: 18, verticalAlign: "middle", mr: 0.5 }} />
              All Updates Successful
            </span>
          ) : (
            <span className="email-disc-cell--stale">
              <WarningAmberIcon sx={{ fontSize: 18, verticalAlign: "middle", mr: 0.5 }} />
              Partial Success
            </span>
          )}
        </PanelHeader>
        <div className="email-disc-results-body">
          <p>
            <strong>{fixResults.successful.length}</strong> emails updated.
            {fixResults.failed.length > 0 && (
              <>
                {" "}
                <strong>{fixResults.failed.length}</strong> failed.
              </>
            )}
          </p>
          <div className="email-disc-actions">
            <Button variant="secondary" onClick={onBackAndRescan}>
              ← Back &amp; Re-scan
            </Button>
          </div>
        </div>
      </Panel>
    );
  }

  return null;
}
