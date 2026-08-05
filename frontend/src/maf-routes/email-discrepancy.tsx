import React from "react";
import { registerModule } from "./maf-api";
import EmailDiscrepancyAudit from "../pages/EmailDiscrepancyAudit";

const EmailDiscrepancyScreen: React.FC = () => {
  return <EmailDiscrepancyAudit />;
};

registerModule(EmailDiscrepancyScreen, { routeOverrides: {} });

export default EmailDiscrepancyScreen;
