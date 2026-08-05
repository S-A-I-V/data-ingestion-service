import React from "react";
import { registerModule } from "./maf-api";
import AuditLog from "../pages/AuditLog";

const AuditLogScreen: React.FC = () => {
  return <AuditLog />;
};

registerModule(AuditLogScreen, { routeOverrides: {} });

export default AuditLogScreen;
