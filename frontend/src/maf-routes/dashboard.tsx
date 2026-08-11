import React from "react";
import { MemoryRouter } from "react-router-dom";
import "../styles/index.css";
import { registerModule } from "./maf-api";
import { useScreenUser } from "./useScreenUser";
import Nav from "../components/Nav";
import Dashboard from "../pages/Dashboard";

const DashboardScreen: React.FC = () => {
  const { user, loading } = useScreenUser();
  if (loading) return <div style={{ padding: 40 }}>Loading...</div>;
  return (
    <div className="nfc-app-root">
      <MemoryRouter initialEntries={["/connections"]}>
        <Nav user={user} />
        <Dashboard user={user} />
      </MemoryRouter>
    </div>
  );
};

registerModule(DashboardScreen, { routeOverrides: {} });

export default DashboardScreen;
