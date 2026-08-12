/**
 * MAF Screen Entry Point: nfc-admin
 *
 * This renders the entire NFC Data Ingestion admin tool as a single MAF screen.
 * It wraps the full React Router SPA inside MAF's registerModule lifecycle.
 *
 * App: nfc-admin (standalone)
 * Screen: nfc-admin
 * URL: https://nfc.dev.apps.nielsen.com/nfc-admin/nfc-admin
 *
 * Authentication:
 * - MAF handles login/logout via OIDC (Okta) — no login page needed here.
 * - The MAF shell provides the user object via window.maf.useMAFContext().
 * - The MAF App Gateway injects a signed JWT into API requests (force_user: true).
 * - Logout is handled by the MAF shell's built-in user menu.
 */
import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

// Global styles — must be imported here so webpack bundles them into the screen chunk
import "../styles/index.css";
import { registerModule } from "./maf-api";

// Navigation — rendered at the top level like App.tsx does locally
import Nav from "../components/Nav";

// Pages
import Home from "../pages/Home";
import Dashboard from "../pages/Dashboard";
import Ingest from "../pages/Ingest";
import Admin from "../pages/Admin";
import ReportHealthDashboard from "../pages/ReportHealthDashboard";
import ReportMappingHub from "../pages/ReportMappingHub";
import ReportMappingEditor from "../pages/ReportMappingEditor";
import ReportMappingLiveEdit from "../pages/ReportMappingLiveEdit";
import ReportPolicies from "../pages/ReportPolicies";
import JobSlaAnalyzer from "../pages/JobSlaAnalyzer";
import JobOnboarding from "../pages/JobOnboarding";
import ClientOnboarding from "../pages/ClientOnboarding";
import AssociateLookup from "../pages/AssociateLookup";
import EmailDiscrepancyAudit from "../pages/EmailDiscrepancyAudit";
import UserManagement from "../pages/UserManagement";
import AuditLog from "../pages/AuditLog";

/**
 * Get user info from MAF context at runtime.
 * MAF provides: { email, firstName, lastName, id, roles, ... }
 * via useMAFContext().selectors.useUserData()
 * Falls back to a default for local dev where MAF shell isn't running.
 */
function getMAFUser(): { name: string; email: string } {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const maf = (window as any).maf;
    if (maf) {
      // IFL2 pattern: useMAFContext().selectors.useUserData()
      const ctx = maf.useMAFContext ? maf.useMAFContext() : null;
      if (ctx?.selectors?.useUserData) {
        const userData = ctx.selectors.useUserData();
        if (userData && userData.email) {
          const name =
            [userData.firstName, userData.lastName].filter(Boolean).join(" ") || userData.email.split("@")[0];
          return { name, email: userData.email };
        }
      }
      // Fallback: try direct user property on context
      const user = ctx?.user;
      if (user && user.email) {
        const name = [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email.split("@")[0];
        return { name, email: user.email };
      }
    }
  } catch {
    // MAF context not available yet — use fallback
  }
  // Local dev fallback
  return { name: "MAF Admin", email: "mafadminuser.local@nielsen.com" };
}

const NfcAdminScreen: React.FC = () => {
  // The basename ensures all routes are relative to the MAF screen URL
  const basename = "/nfc-admin/nfc-admin";
  const mafUser = getMAFUser();

  // Fetch full user profile (with permissions) from backend
  const [user, setUser] = React.useState<{ name: string; email: string; picture: string; permissions: string[] }>({
    name: mafUser.name,
    email: mafUser.email,
    picture: "",
    permissions: [],
  });
  const [authError, setAuthError] = React.useState(false);

  React.useEffect(() => {
    const tryFetch = async () => {
      const mafApiPath = "/api/v3/nfc-admin/api/auth/me";
      const res = await fetch(mafApiPath, { credentials: "include" }).catch(() => null);

      if (res && res.ok) {
        const contentType = res.headers.get("content-type") || "";
        if (contentType.includes("application/json")) {
          const data = await res.json();
          setUser({
            name: data.name || mafUser.name,
            email: data.email || mafUser.email,
            picture: data.picture || "",
            permissions: data.permissions || [],
          });
          return;
        }
      }

      // Gateway unavailable or returned non-JSON — show error state
      console.warn("[nfc-admin] MAF gateway /api/auth/me failed or unavailable");
      setAuthError(true);
    };
    tryFetch();
  }, []);

  // Inject Google Fonts <link> into document head at runtime.
  // MAF shell doesn't allow us to modify the HTML template, so we do it here.
  // Load all fonts used by the app (matching index.html) — not just Fira Code.
  React.useEffect(() => {
    const fontId = "nfc-fira-code-font";
    if (!document.getElementById(fontId)) {
      // Preconnect for faster font loading
      const preconnect1 = document.createElement("link");
      preconnect1.rel = "preconnect";
      preconnect1.href = "https://fonts.googleapis.com";
      document.head.appendChild(preconnect1);

      const preconnect2 = document.createElement("link");
      preconnect2.rel = "preconnect";
      preconnect2.href = "https://fonts.gstatic.com";
      preconnect2.crossOrigin = "anonymous";
      document.head.appendChild(preconnect2);

      const link = document.createElement("link");
      link.id = fontId;
      link.rel = "stylesheet";
      link.href =
        "https://fonts.googleapis.com/css2?family=Fira+Code:wght@300;400;500;600;700&family=Inter:wght@300;400;500;600;700&display=block";
      document.head.appendChild(link);
    }
  }, []);

  if (authError) {
    return (
      <div className="nfc-app-root">
        <div className="access-denied">
          <div className="access-denied-title">Service Unavailable</div>
          <div className="access-denied-message">
            Unable to connect to the NFC Admin backend. The MAF API gateway may not be configured or the backend is
            unreachable.
          </div>
          <div className="access-denied-hint">Check that the manifest is deployed and the backend is running.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="nfc-app-root">
      <BrowserRouter basename={basename}>
        <Nav user={user} />
        <Routes>
          <Route path="/" element={<Home isAuthenticated={true} />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/ingest" element={<Ingest />} />
          <Route path="/admin" element={<Admin permissions={user.permissions} />} />
          <Route path="/report-health" element={<ReportHealthDashboard />} />
          <Route path="/report-mapping" element={<ReportMappingHub />} />
          <Route path="/report-mapping/editor" element={<ReportMappingEditor />} />
          <Route path="/report-mapping/live-edit" element={<ReportMappingLiveEdit />} />
          <Route path="/report-policies" element={<ReportPolicies />} />
          <Route path="/job-sla" element={<JobSlaAnalyzer />} />
          <Route path="/job-onboarding" element={<JobOnboarding />} />
          <Route path="/client-onboarding" element={<ClientOnboarding />} />
          <Route path="/associate-lookup" element={<AssociateLookup />} />
          <Route path="/email-discrepancy" element={<EmailDiscrepancyAudit />} />
          <Route path="/user-management" element={<UserManagement />} />
          <Route path="/audit-log" element={<AuditLog />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
};

registerModule(NfcAdminScreen, { routeOverrides: {} });

export default NfcAdminScreen;
