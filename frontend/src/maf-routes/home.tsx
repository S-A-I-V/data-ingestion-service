import React from "react";
import { registerModule } from "./maf-api";
import Home from "../pages/Home";

const HomeScreen: React.FC = () => {
  return <Home />;
};

registerModule(HomeScreen, { routeOverrides: {} });

export default HomeScreen;
