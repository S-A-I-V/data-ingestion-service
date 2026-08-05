import React from "react";
import { registerModule } from "./maf-api";
import JobOnboarding from "../pages/JobOnboarding";

const JobOnboardingScreen: React.FC = () => {
  return <JobOnboarding />;
};

registerModule(JobOnboardingScreen, { routeOverrides: {} });

export default JobOnboardingScreen;
