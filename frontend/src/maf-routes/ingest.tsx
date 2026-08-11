import React from "react";
import { MemoryRouter } from "react-router-dom";
import "../styles/index.css";
import { registerModule } from "./maf-api";
import { useScreenUser } from "./useScreenUser";
import Nav from "../components/Nav";
import Ingest from "../pages/Ingest";

const IngestScreen: React.FC = () => {
  const { user, loading } = useScreenUser();
  if (loading) return <div style={{ padding: 40 }}>Loading...</div>;
  return (
    <div className="nfc-app-root">
      <MemoryRouter initialEntries={["/ingest"]}>
        <Nav user={user} />
        <Ingest user={user} />
      </MemoryRouter>
    </div>
  );
};

registerModule(IngestScreen, { routeOverrides: {} });

export default IngestScreen;
