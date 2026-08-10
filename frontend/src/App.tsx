import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import api from "./api";
import type { User } from "./types";
// Login page commented out — MAF handles authentication
// import Login from "./pages/Login";
import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import Ingest from "./pages/Ingest";
import AuditLog from "./pages/AuditLog";
import AssociateLookup from "./pages/AssociateLookup";
import ClientOnboarding from "./pages/ClientOnboarding";
import ClientOnboardingHub from "./pages/ClientOnboardingHub";
import ClientEdit from "./pages/ClientEdit";
import JobOnboardingHub from "./pages/JobOnboardingHub";
import JobOnboarding from "./pages/JobOnboarding";
import JobEdit from "./pages/JobEdit";
import ReportMappingHub from "./pages/ReportMappingHub";
import ReportMappingEditor from "./pages/ReportMappingEditor";
import ReportMappingLiveEdit from "./pages/ReportMappingLiveEdit";
import Admin from "./pages/Admin";
import EmailDiscrepancyAudit from "./pages/EmailDiscrepancyAudit";
import ReportHealthDashboard from "./pages/ReportHealthDashboard";
import ReportPolicies from "./pages/ReportPolicies";
import UserManagement from "./pages/UserManagement";
import JobSlaAnalyzer from "./pages/JobSlaAnalyzer";
import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";
import Nav from "./components/Nav";
import PublicNav from "./components/PublicNav";
import CookieConsent from "./components/CookieConsent";

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const location = useLocation();

  useEffect(() => {
    // In MAF mode, the backend trusts X-Auth-Email header (dev) or MAF JWT (deployed)
    // No login redirect needed — just fetch the user profile
    api
      .get("/auth/me")
      .then((r) => setUser(r.data))
      .catch((err) => {
        console.warn("[App] Failed to fetch user profile:", err.message);
        // Even if /me fails, still show the app — user just won't have permissions
        setUser({ id: "dev", email: "dev@local", name: "Developer", permissions: [] } as User);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  if (loading) {
    return (
      <div className="loader-page">
        <div className="loader" />
      </div>
    );
  }

  // Login route removed — MAF handles authentication
  // All routes are accessible once the user profile is loaded

  if (!user) {
    return (
      <>
        <PublicNav userName="" userEmail="" />
        <Routes location={location}>
          <Route path="/home" element={<Home isAuthenticated={false} />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/" element={<Navigate to="/home" />} />
          <Route path="*" element={<Navigate to="/home" />} />
        </Routes>
        <CookieConsent />
      </>
    );
  }

  return (
    <>
      <Nav user={user} />
      <Routes location={location}>
        <Route path="/home" element={<Home isAuthenticated={true} />} />
        <Route path="/connections" element={<Dashboard user={user} />} />
        <Route path="/ingest" element={<Ingest user={user} />} />
        <Route path="/audit" element={<AuditLog user={user} />} />

        {/* Admin routes */}
        <Route path="/admin" element={<Admin permissions={user.permissions || []} />} />
        <Route path="/admin/associate-lookup" element={<AssociateLookup />} />
        <Route path="/admin/email-discrepancy" element={<EmailDiscrepancyAudit />} />
        <Route path="/admin/report-health" element={<ReportHealthDashboard />} />
        <Route path="/admin/client-onboarding" element={<ClientOnboardingHub />} />
        <Route path="/admin/client-onboarding/new" element={<ClientOnboarding />} />
        <Route path="/admin/client-onboarding/edit" element={<ClientEdit />} />
        <Route path="/admin/job-onboarding" element={<JobOnboardingHub />} />
        <Route path="/admin/job-onboarding/new" element={<JobOnboarding />} />
        <Route path="/admin/job-onboarding/edit" element={<JobEdit />} />
        <Route path="/admin/report-mapping" element={<ReportMappingHub />} />
        <Route path="/admin/report-mapping/editor" element={<ReportMappingEditor />} />
        <Route path="/admin/report-mapping/live-edit" element={<ReportMappingLiveEdit />} />
        <Route path="/admin/report-policies" element={<ReportPolicies />} />
        <Route path="/admin/user-management" element={<UserManagement />} />
        <Route path="/admin/job-sla-analyzer" element={<JobSlaAnalyzer />} />

        <Route path="/privacy" element={<Privacy />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/" element={<Navigate to="/connections" />} />
        <Route path="*" element={<Navigate to="/connections" />} />
      </Routes>
      <CookieConsent />
    </>
  );
}
