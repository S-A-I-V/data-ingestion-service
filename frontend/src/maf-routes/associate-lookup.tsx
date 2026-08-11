import React from "react";
import { registerModule } from "./maf-api";
import "../styles/index.css";
import AssociateLookup from "../pages/AssociateLookup";

const AssociateLookupScreen: React.FC = () => {
  return (
    <div className="nfc-app-root">
      <AssociateLookup />
    </div>
  );
};

registerModule(AssociateLookupScreen, { routeOverrides: {} });

export default AssociateLookupScreen;
