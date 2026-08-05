import React from "react";
import { registerModule } from "./maf-api";
import Admin from "../pages/Admin";

const AdminScreen: React.FC = () => {
  return <Admin />;
};

registerModule(AdminScreen, { routeOverrides: {} });

export default AdminScreen;
