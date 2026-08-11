import React from "react";
import { registerModule } from "./maf-api";
import "../styles/index.css";
import UserManagement from "../pages/UserManagement";

const UserManagementScreen: React.FC = () => {
  return (
    <div className="nfc-app-root">
      <UserManagement />
    </div>
  );
};

registerModule(UserManagementScreen, { routeOverrides: {} });

export default UserManagementScreen;
