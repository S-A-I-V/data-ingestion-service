import React from "react";
import { registerModule } from "./maf-api";
import ClientOnboarding from "../pages/ClientOnboarding";

const ClientOnboardingScreen: React.FC = () => {
  return <ClientOnboarding />;
};

registerModule(ClientOnboardingScreen, { routeOverrides: {} });

export default ClientOnboardingScreen;
