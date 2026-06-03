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
import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";
import Nav from "./components/Nav";
import PublicNav from "./components/PublicNav";
import Footer from "./components/Footer";
import CookieConsent from "./components/CookieConsent";

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
        <Footer />
        <CookieConsent />
      </>
    );
  }

  return (
    <>
      <Nav user={user} />
      <Routes location={location}>
        <Route path="/home" element={<Home isAuthenticated={true} />} />
        <Route path="/connections" element={<Dashboard />} />
        <Route path="/ingest" element={<Ingest />} />
        <Route path="/audit" element={<AuditLog />} />
        {user.permissions?.includes("admin:associate_lookup") && (
          <Route path="/admin/associate-lookup" element={<AssociateLookup />} />
        )}
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/" element={<Navigate to="/connections" />} />
        <Route path="*" element={<Navigate to="/connections" />} />
      </Routes>
      <Footer />
      <CookieConsent />
    </>
  );
}
