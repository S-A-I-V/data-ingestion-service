import React from "react";
import { registerModule } from "./maf-api";
import AssociateLookup from "../pages/AssociateLookup";

const AssociateLookupScreen: React.FC = () => {
  return <AssociateLookup />;
};

registerModule(AssociateLookupScreen, { routeOverrides: {} });

export default AssociateLookupScreen;
