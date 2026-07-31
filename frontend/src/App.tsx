import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import api from "./api";
import type { User } from "./types";
import Login from "./pages/Login";
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
import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";
import Nav from "./components/Nav";
import PublicNav from "./components/PublicNav";
import ProtectedRoute from "./components/ProtectedRoute";
import CookieConsent from "./components/CookieConsent";
import {
  PERM_ADMIN_CONNECTIONS,
  PERM_ADMIN_CONNECTIONS_VIEW,
  PERM_ADMIN_DATA_TRANSFER,
  PERM_ADMIN_DATA_TRANSFER_PREVIEW,
  PERM_ADMIN_AUDIT,
  PERM_ADMIN_ASSOCIATE_LOOKUP,
  PERM_ADMIN_CLIENT_ONBOARDING,
  PERM_ADMIN_JOB_ONBOARDING,
  PERM_ADMIN_REPORT_MAPPING,
  PERM_ADMIN_REPORT_POLICIES,
  PERM_ADMIN_REPORT_HEALTH,
  PERM_ADMIN_MANAGE_USERS,
} from "./constants/permissions";

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(!localStorage.getItem("token"));
  const location = useLocation();

  const checkAuth = () => {
    const token = localStorage.getItem("token");
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    api
      .get("/auth/me", { headers })
      .then((r) => setUser(r.data))
      .catch(() => {
        setUser(null);
        localStorage.removeItem("token");
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  if (loading)
    return (
      <div className="loader-page">
        <div className="loader" />
      </div>
    );

  if (location.pathname === "/login") {
    if (user) return <Navigate to="/connections" />;
    return (
      <>
        <PublicNav />
        <Login onLogin={checkAuth} />
        <CookieConsent />
      </>
    );
  }

  if (!user) {
    return (
      <>
        <PublicNav />
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

        {/* Protected routes with permission checks */}
        <Route
          path="/connections"
          element={
            <ProtectedRoute
              user={user}
              permissions={[PERM_ADMIN_CONNECTIONS, PERM_ADMIN_CONNECTIONS_VIEW]}
              feature="Connections"
            >
              <Dashboard user={user} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/ingest"
          element={
            <ProtectedRoute
              user={user}
              permissions={[PERM_ADMIN_DATA_TRANSFER, PERM_ADMIN_DATA_TRANSFER_PREVIEW]}
              feature="Data Transfer"
            >
              <Ingest user={user} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/audit"
          element={
            <ProtectedRoute user={user} permissions={[PERM_ADMIN_AUDIT]} feature="Audit Log">
              <AuditLog user={user} />
            </ProtectedRoute>
          }
        />

        {/* Admin routes — all protected with specific permissions */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute
              user={user}
              permissions={[
                PERM_ADMIN_ASSOCIATE_LOOKUP,
                PERM_ADMIN_CLIENT_ONBOARDING,
                PERM_ADMIN_JOB_ONBOARDING,
                PERM_ADMIN_REPORT_MAPPING,
                PERM_ADMIN_REPORT_POLICIES,
                PERM_ADMIN_REPORT_HEALTH,
                PERM_ADMIN_MANAGE_USERS,
              ]}
              feature="Admin Panel"
            >
              <Admin permissions={user.permissions || []} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/associate-lookup"
          element={
            <ProtectedRoute user={user} permissions={[PERM_ADMIN_ASSOCIATE_LOOKUP]} feature="Associate Lookup">
              <AssociateLookup />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/email-discrepancy"
          element={
            <ProtectedRoute
              user={user}
              permissions={["admin:email_discrepancy_audit"]}
              feature="Email Discrepancy Audit"
            >
              <EmailDiscrepancyAudit />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/report-health"
          element={
            <ProtectedRoute user={user} permissions={[PERM_ADMIN_REPORT_HEALTH]} feature="Report Health Dashboard">
              <ReportHealthDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/client-onboarding"
          element={
            <ProtectedRoute user={user} permissions={[PERM_ADMIN_CLIENT_ONBOARDING]} feature="Client Onboarding">
              <ClientOnboardingHub />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/client-onboarding/new"
          element={
            <ProtectedRoute user={user} permissions={[PERM_ADMIN_CLIENT_ONBOARDING]} feature="Client Onboarding">
              <ClientOnboarding />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/client-onboarding/edit"
          element={
            <ProtectedRoute user={user} permissions={[PERM_ADMIN_CLIENT_ONBOARDING]} feature="Client Onboarding">
              <ClientEdit />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/job-onboarding"
          element={
            <ProtectedRoute user={user} permissions={[PERM_ADMIN_JOB_ONBOARDING]} feature="Job Onboarding">
              <JobOnboardingHub />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/job-onboarding/new"
          element={
            <ProtectedRoute user={user} permissions={[PERM_ADMIN_JOB_ONBOARDING]} feature="Job Onboarding">
              <JobOnboarding />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/job-onboarding/edit"
          element={
            <ProtectedRoute user={user} permissions={[PERM_ADMIN_JOB_ONBOARDING]} feature="Job Onboarding">
              <JobEdit />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/report-mapping"
          element={
            <ProtectedRoute user={user} permissions={[PERM_ADMIN_REPORT_MAPPING]} feature="Report Mapping">
              <ReportMappingHub />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/report-mapping/editor"
          element={
            <ProtectedRoute user={user} permissions={[PERM_ADMIN_REPORT_MAPPING]} feature="Report Mapping">
              <ReportMappingEditor />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/report-mapping/live-edit"
          element={
            <ProtectedRoute user={user} permissions={[PERM_ADMIN_REPORT_MAPPING]} feature="Report Mapping">
              <ReportMappingLiveEdit />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/report-policies"
          element={
            <ProtectedRoute user={user} permissions={[PERM_ADMIN_REPORT_POLICIES]} feature="Report Policies">
              <ReportPolicies />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/user-management"
          element={
            <ProtectedRoute user={user} permissions={[PERM_ADMIN_MANAGE_USERS]} feature="User Management">
              <UserManagement />
            </ProtectedRoute>
          }
        />

        <Route path="/privacy" element={<Privacy />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/" element={<Navigate to="/connections" />} />
        <Route path="*" element={<Navigate to="/connections" />} />
      </Routes>
      <CookieConsent />
    </>
  );
}
