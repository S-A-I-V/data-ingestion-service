import React from "react";
import { registerModule } from "./maf-api";
import "../styles/index.css";
import Home from "../pages/Home";

const HomeScreen: React.FC = () => {
  return (
    <div className="nfc-app-root">
      <Home />
    </div>
  );
};

registerModule(HomeScreen, { routeOverrides: {} });

export default HomeScreen;
