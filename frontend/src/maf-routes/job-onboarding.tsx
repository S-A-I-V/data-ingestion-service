import React from "react";
import { registerModule } from "./maf-api";
import "../styles/index.css";
import JobOnboarding from "../pages/JobOnboarding";

const JobOnboardingScreen: React.FC = () => {
  return (
    <div className="nfc-app-root">
      <JobOnboarding />
    </div>
  );
};

registerModule(JobOnboardingScreen, { routeOverrides: {} });

export default JobOnboardingScreen;
