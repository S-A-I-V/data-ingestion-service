import React from "react";
import { registerModule } from "./maf-api";
import JobSlaAnalyzer from "../pages/JobSlaAnalyzer";

const JobSlaScreen: React.FC = () => {
  return <JobSlaAnalyzer />;
};

registerModule(JobSlaScreen, { routeOverrides: {} });

export default JobSlaScreen;
