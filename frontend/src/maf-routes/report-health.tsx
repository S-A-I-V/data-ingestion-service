import React from "react";
import { registerModule } from "./maf-api";
import ReportHealthDashboard from "../pages/ReportHealthDashboard";

const ReportHealthScreen: React.FC = () => {
  return <ReportHealthDashboard />;
};

registerModule(ReportHealthScreen, { routeOverrides: {} });

export default ReportHealthScreen;
