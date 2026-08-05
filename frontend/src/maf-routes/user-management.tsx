import React from "react";
import { registerModule } from "./maf-api";
import UserManagement from "../pages/UserManagement";

const UserManagementScreen: React.FC = () => {
  return <UserManagement />;
};

registerModule(UserManagementScreen, { routeOverrides: {} });

export default UserManagementScreen;
