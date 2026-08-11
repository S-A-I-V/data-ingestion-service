import React from "react";
import { registerModule } from "./maf-api";
import "../styles/index.css";
import JobSlaAnalyzer from "../pages/JobSlaAnalyzer";

const JobSlaScreen: React.FC = () => {
  return (
    <div className="nfc-app-root">
      <JobSlaAnalyzer />
    </div>
  );
};

registerModule(JobSlaScreen, { routeOverrides: {} });

export default JobSlaScreen;
