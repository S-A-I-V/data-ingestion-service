import React from "react";
import { registerModule } from "./maf-api";
import "../styles/index.css";
import ReportPolicies from "../pages/ReportPolicies";

const ReportPoliciesScreen: React.FC = () => {
  return (
    <div className="nfc-app-root">
      <ReportPolicies />
    </div>
  );
};

registerModule(ReportPoliciesScreen, { routeOverrides: {} });

export default ReportPoliciesScreen;
