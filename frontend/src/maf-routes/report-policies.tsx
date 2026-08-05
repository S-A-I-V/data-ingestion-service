import React from "react";
import { registerModule } from "./maf-api";
import ReportPolicies from "../pages/ReportPolicies";

const ReportPoliciesScreen: React.FC = () => {
  return <ReportPolicies />;
};

registerModule(ReportPoliciesScreen, { routeOverrides: {} });

export default ReportPoliciesScreen;
