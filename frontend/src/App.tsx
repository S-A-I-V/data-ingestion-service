import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import { AnimatePresence } from "framer-motion";
import api from "./api";
import Login from "./pages/Login";
import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import Ingest from "./pages/Ingest";
import AuditLog from "./pages/AuditLog";
import Nav from "./components/Nav";

interface User { id: string; email: string; name: string; picture: string; }

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const location = useLocation();

  useEffect(() => {
    api.get("/auth/me").then(r => setUser(r.data)).catch(() => setUser(null)).finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
      <div className="loader" />
    </div>
  );
  if (!user) return <Login />;

  const isHome = location.pathname === "/home";

  return (
    <>
      <Nav user={user} />
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          <Route path="/home" element={<Home />} />
          <Route path="/connections" element={<Dashboard />} />
          <Route path="/ingest" element={<Ingest />} />
          <Route path="/audit" element={<AuditLog />} />
          <Route path="/" element={<Navigate to="/home" />} />
          <Route path="*" element={<Navigate to="/home" />} />
        </Routes>
      </AnimatePresence>
    </>
  );
}
