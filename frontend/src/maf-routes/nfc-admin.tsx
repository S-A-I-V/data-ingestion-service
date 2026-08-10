/**
 * MAF Screen Entry Point: nfc-admin
 *
 * This renders the entire NFC Data Ingestion admin tool as a single MAF screen.
 * It wraps the full React Router SPA inside MAF's registerModule lifecycle.
 *
 * App: nfc-admin (standalone)
 * Screen: nfc-admin
 * URL: https://nfc.dev.apps.nielsen.com/nfc-admin/nfc-admin
 */
import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

// Global styles — must be imported here so webpack bundles them into the screen chunk
import "../styles/index.css";
import { registerModule } from "./maf-api";

// Navigation — rendered at the top level like App.tsx does locally
import PublicNav from "../components/PublicNav";

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

const NfcAdminScreen: React.FC = () => {
  // The basename ensures all routes are relative to the MAF screen URL
  const basename = "/nfc-admin/nfc-admin";

  // Inject Google Fonts <link> into document head at runtime.
  // MAF shell doesn't allow us to modify the HTML template, so we do it here.
  React.useEffect(() => {
    const fontId = "nfc-fira-code-font";
    if (!document.getElementById(fontId)) {
      const link = document.createElement("link");
      link.id = fontId;
      link.rel = "stylesheet";
      link.href = "https://fonts.googleapis.com/css2?family=Fira+Code:wght@300;400;500;600;700&display=swap";
      document.head.appendChild(link);
    }
  }, []);

  return (
    <div className="nfc-app-root">
      <BrowserRouter basename={basename}>
        <PublicNav />
        <Routes>
          <Route path="/" element={<Home isAuthenticated={true} />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/ingest" element={<Ingest />} />
          <Route path="/admin" element={<Admin />} />
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
