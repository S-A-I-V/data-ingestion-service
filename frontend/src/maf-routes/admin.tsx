import React from "react";
import { MemoryRouter } from "react-router-dom";
import "../styles/index.css";
import { registerModule } from "./maf-api";
import { useScreenUser } from "./useScreenUser";
import Nav from "../components/Nav";
import Admin from "../pages/Admin";

const AdminScreen: React.FC = () => {
  const { user, loading } = useScreenUser();
  if (loading) return <div style={{ padding: 40 }}>Loading...</div>;
  return (
    <MemoryRouter initialEntries={["/admin"]}>
      <Nav user={user} />
      <Admin permissions={user.permissions || []} />
    </MemoryRouter>
  );
};

registerModule(AdminScreen, { routeOverrides: {} });

export default AdminScreen;
