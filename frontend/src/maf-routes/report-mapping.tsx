import React from "react";
import { registerModule } from "./maf-api";
import ReportMappingHub from "../pages/ReportMappingHub";

const ReportMappingScreen: React.FC = () => {
  return <ReportMappingHub />;
};

registerModule(ReportMappingScreen, { routeOverrides: {} });

export default ReportMappingScreen;
