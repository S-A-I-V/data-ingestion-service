import React from "react";
import { registerModule } from "./maf-api";
import Ingest from "../pages/Ingest";

const IngestScreen: React.FC = () => {
  return <Ingest />;
};

registerModule(IngestScreen, { routeOverrides: {} });

export default IngestScreen;
