/**
 * ClientOnboardingHub — Landing page to choose between new onboarding or editing an existing client.
 * Acts as the entry point at /admin/client-onboarding.
 */

import { useNavigate } from "react-router-dom";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import GroupsIcon from "@mui/icons-material/Groups";

export default function ClientOnboardingHub() {
  const navigate = useNavigate();

  return (
    <div className="container audit-container">
      <div className="toolbar">
        <span className="toolbar-title">Client Onboarding</span>
      </div>

      <div className="onboarding-hub">
        <div className="onboarding-hub-header">
          <GroupsIcon sx={{ fontSize: 40, color: "var(--accent)" }} />
          <h2>What would you like to do?</h2>
          <p>Choose to onboard a new client or modify an existing client's configuration.</p>
        </div>

        <div className="onboarding-hub-cards">
          <button className="onboarding-hub-card" onClick={() => navigate("/admin/client-onboarding/new")}>
            <div className="onboarding-hub-card-icon">
              <AddIcon sx={{ fontSize: 32 }} />
            </div>
            <h3>Onboard New Client</h3>
            <p>
              Create a new client with group, BEID mappings, report assignments, and optional Fastie aliases. All
              changes execute atomically.
            </p>
          </button>

          <button className="onboarding-hub-card" onClick={() => navigate("/admin/client-onboarding/edit")}>
            <div className="onboarding-hub-card-icon onboarding-hub-card-icon--edit">
              <EditIcon sx={{ fontSize: 32 }} />
            </div>
            <h3>Edit Existing Client</h3>
            <p>
              Search for a previously onboarded client to add/remove BEIDs, update report mappings, change group name,
              or manage Fastie aliases.
            </p>
          </button>
        </div>
      </div>
    </div>
  );
}
