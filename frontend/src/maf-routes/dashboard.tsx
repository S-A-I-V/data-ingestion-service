import React from "react";
import { registerModule } from "./maf-api";
import Dashboard from "../pages/Dashboard";

const DashboardScreen: React.FC = () => {
  return <Dashboard />;
};

registerModule(DashboardScreen, { routeOverrides: {} });

export default DashboardScreen;
