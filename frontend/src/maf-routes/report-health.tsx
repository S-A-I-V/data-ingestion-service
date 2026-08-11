import React from "react";
import { registerModule } from "./maf-api";
import "../styles/index.css";
import ReportHealthDashboard from "../pages/ReportHealthDashboard";

const ReportHealthScreen: React.FC = () => {
  return (
    <div className="nfc-app-root">
      <ReportHealthDashboard />
    </div>
  );
};

registerModule(ReportHealthScreen, { routeOverrides: {} });

export default ReportHealthScreen;
