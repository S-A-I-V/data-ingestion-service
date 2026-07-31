/**
 * AccessDenied — Displayed when user lacks permission to access a feature.
 */

import LockOutlinedIcon from "@mui/icons-material/LockOutlined";

interface AccessDeniedProps {
  /** Feature name to display in the message */
  feature?: string;
  /** Custom message to display */
  message?: string;
}

export default function AccessDenied({ feature, message }: AccessDeniedProps) {
  const displayMessage = message || `You don't have permission to access ${feature || "this feature"}.`;

  return (
    <div className="access-denied">
      <div className="access-denied-icon">
        <LockOutlinedIcon sx={{ fontSize: 48 }} />
      </div>
      <h2 className="access-denied-title">Access Denied</h2>
      <p className="access-denied-message">{displayMessage}</p>
      <p className="access-denied-hint">Contact your administrator if you need access to this feature.</p>
    </div>
  );
}
