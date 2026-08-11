import React from "react";
import { MemoryRouter } from "react-router-dom";
import "../styles/index.css";
import { registerModule } from "./maf-api";
import { useScreenUser } from "./useScreenUser";
import Nav from "../components/Nav";
import AuditLog from "../pages/AuditLog";

const AuditLogScreen: React.FC = () => {
  const { user, loading } = useScreenUser();
  if (loading) return <div style={{ padding: 40 }}>Loading...</div>;
  return (
    <div className="nfc-app-root">
      <MemoryRouter initialEntries={["/audit"]}>
        <Nav user={user} />
        <AuditLog user={user} />
      </MemoryRouter>
    </div>
  );
};

registerModule(AuditLogScreen, { routeOverrides: {} });

export default AuditLogScreen;
