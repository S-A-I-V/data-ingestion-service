/**
 * ConfirmDialog — Reusable confirmation modal.
 * Shows a title, message, and confirm/cancel buttons.
 */

import WarningAmberIcon from "@mui/icons-material/WarningAmber";

interface Props {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  loading = false,
  onConfirm,
  onCancel,
}: Props) {
  if (!open) return null;

  return (
    <div className="confirm-dialog-overlay" onClick={onCancel}>
      <div className="confirm-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="confirm-dialog-icon">
          <WarningAmberIcon sx={{ fontSize: 36, color: "var(--warning)" }} />
        </div>
        <h3 className="confirm-dialog-title">{title}</h3>
        <p className="confirm-dialog-message">{message}</p>
        <div className="confirm-dialog-actions">
          <button type="button" className="btn btn-sm" onClick={onCancel} disabled={loading}>
            {cancelLabel}
          </button>
          <button type="button" className="btn btn-sm btn-primary" onClick={onConfirm} disabled={loading}>
            {loading ? "Executing..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
