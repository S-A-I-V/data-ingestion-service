import React from "react";
import { registerModule } from "./maf-api";
import "../styles/index.css";
import ClientOnboarding from "../pages/ClientOnboarding";

const ClientOnboardingScreen: React.FC = () => {
  return (
    <div className="nfc-app-root">
      <ClientOnboarding />
    </div>
  );
};

registerModule(ClientOnboardingScreen, { routeOverrides: {} });

export default ClientOnboardingScreen;
