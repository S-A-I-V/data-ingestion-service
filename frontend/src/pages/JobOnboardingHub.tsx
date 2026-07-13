/**
 * JobOnboardingHub — Landing page to choose between new job onboarding or editing an existing job.
 * Acts as the entry point at /admin/job-onboarding.
 */

import { useNavigate } from "react-router-dom";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import WorkIcon from "@mui/icons-material/Work";
import Highlight from "../components/ui/Highlight";

export default function JobOnboardingHub() {
  const navigate = useNavigate();

  return (
    <div className="container audit-container">
      <div className="toolbar">
        <span className="toolbar-title">
          <Highlight>Job Onboarding</Highlight>
        </span>
      </div>

      <div className="onboarding-hub">
        <div className="onboarding-hub-header">
          <WorkIcon sx={{ fontSize: 32, color: "var(--text-primary)" }} />
          <h2>What would you like to do?</h2>
          <p>Choose to onboard a new job or modify an existing job's configuration.</p>
        </div>

        <div className="onboarding-hub-cards">
          <button
            className="onboarding-hub-card lf-corners-hover"
            onClick={() => navigate("/admin/job-onboarding/new")}
          >
            <div className="onboarding-hub-card-icon">
              <AddIcon sx={{ fontSize: 24 }} />
            </div>
            <h3>Onboard New Job</h3>
            <p>
              Create a new job with owner info, SLA policies, proxy inference rules, and artifact definitions. All
              changes execute atomically.
            </p>
          </button>

          <button
            className="onboarding-hub-card lf-corners-hover"
            onClick={() => navigate("/admin/job-onboarding/edit")}
          >
            <div className="onboarding-hub-card-icon">
              <EditIcon sx={{ fontSize: 24 }} />
            </div>
            <h3>Edit Existing Job</h3>
            <p>
              Search for a previously onboarded job to update owner details, SLA policies, proxy rules, or artifact
              definitions.
            </p>
          </button>
        </div>
      </div>
    </div>
  );
}
