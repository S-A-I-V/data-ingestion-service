import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import { AnimatePresence } from "framer-motion";
import api from "./api";
import type { User } from "./types";
import Login from "./pages/Login";
import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import Ingest from "./pages/Ingest";
import AuditLog from "./pages/AuditLog";
import Nav from "./components/Nav";
import PublicNav from "./components/PublicNav";

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const location = useLocation();

  const checkAuth = () => {
    const token = localStorage.getItem("token");
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    api
      .get("/auth/me", { headers })
      .then((r) => setUser(r.data))
      .catch(() => { setUser(null); localStorage.removeItem("token"); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { checkAuth(); }, []);

  if (loading)
    return (
      <div className="loader-page">
        <div className="loader" />
      </div>
    );

  // Login page — show public nav + login form
  if (location.pathname === "/login") {
    if (user) return <Navigate to="/connections" />;
    return (
      <>
        <PublicNav />
        <Login onLogin={checkAuth} />
      </>
    );
  }

  // Public pages (Home) — show public nav
  if (!user) {
    return (
      <>
        <PublicNav />
        <AnimatePresence mode="wait">
          <Routes location={location} key={location.pathname}>
            <Route path="/home" element={<Home />} />
            <Route path="/" element={<Navigate to="/home" />} />
            <Route path="*" element={<Navigate to="/home" />} />
          </Routes>
        </AnimatePresence>
      </>
    );
  }

  // Authenticated pages
  return (
    <>
      <Nav user={user} />
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          <Route path="/home" element={<Home />} />
          <Route path="/connections" element={<Dashboard />} />
          <Route path="/ingest" element={<Ingest />} />
          <Route path="/audit" element={<AuditLog />} />
          <Route path="/" element={<Navigate to="/connections" />} />
          <Route path="*" element={<Navigate to="/connections" />} />
        </Routes>
      </AnimatePresence>
    </>
  );
}
