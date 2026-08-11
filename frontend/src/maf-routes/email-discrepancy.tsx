import React from "react";
import { registerModule } from "./maf-api";
import "../styles/index.css";
import EmailDiscrepancyAudit from "../pages/EmailDiscrepancyAudit";

const EmailDiscrepancyScreen: React.FC = () => {
  return (
    <div className="nfc-app-root">
      <EmailDiscrepancyAudit />
    </div>
  );
};

registerModule(EmailDiscrepancyScreen, { routeOverrides: {} });

export default EmailDiscrepancyScreen;
