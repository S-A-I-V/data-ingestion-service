import React from "react";
import { registerModule } from "./maf-api";
import "../styles/index.css";
import ReportMappingHub from "../pages/ReportMappingHub";

const ReportMappingScreen: React.FC = () => {
  return (
    <div className="nfc-app-root">
      <ReportMappingHub />
    </div>
  );
};

registerModule(ReportMappingScreen, { routeOverrides: {} });

export default ReportMappingScreen;
