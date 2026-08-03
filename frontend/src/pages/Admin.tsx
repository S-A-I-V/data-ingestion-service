/**
 * Admin — Dashboard page listing all admin tools as cards.
 * Each card links to its respective feature page.
 */

import { Link } from "react-router-dom";
import SearchIcon from "@mui/icons-material/Search";
import GroupsIcon from "@mui/icons-material/Groups";
import AccountTreeIcon from "@mui/icons-material/AccountTree";
import SyncProblemIcon from "@mui/icons-material/SyncProblem";
import MonitorHeartIcon from "@mui/icons-material/MonitorHeart";
import WorkIcon from "@mui/icons-material/Work";
import ManageAccountsIcon from "@mui/icons-material/ManageAccounts";
import QueryStatsIcon from "@mui/icons-material/QueryStats";
import InfoSidebar from "../components/InfoSidebar";
import Highlight from "../components/ui/Highlight";

interface Props {
  permissions: string[];
}

const ADMIN_TOOLS = [
  {
    permission: "admin:manage_users",
    title: "User Management",
    description:
      "Manage user roles and permissions. Assign or revoke roles, view effective permissions, and monitor cache stats.",
    icon: ManageAccountsIcon,
    to: "/admin/user-management",
  },
  {
    permission: "admin:associate_lookup",
    title: "Associate Lookup",
    description: "Query the Sybase CustomerRepository for associate and business entity data by BEID or DMZID.",
    icon: SearchIcon,
    to: "/admin/associate-lookup",
  },
  {
    permission: "admin:client_onboarding",
    title: "Client Onboarding",
    description: "Onboard new clients or edit existing client configurations — groups, BEIDs, reports, and aliases.",
    icon: GroupsIcon,
    to: "/admin/client-onboarding",
  },
  {
    permission: "admin:job_onboarding",
    title: "Job Onboarding",
    description:
      "Onboard new jobs or edit existing jobs — SLA policies, proxy inference rules, and artifact definitions.",
    icon: WorkIcon,
    to: "/admin/job-onboarding",
  },
  {
    permission: "admin:report_mapping",
    title: "Report Job Mapping",
    description: "Visual DAG editor for report→job pipelines. Create, copy, edit, and export mapping configurations.",
    icon: AccountTreeIcon,
    to: "/admin/report-mapping",
  },
  {
    permission: "admin:email_discrepancy_audit",
    title: "Email Discrepancy Audit",
    description: "Scan CPR vs NFC to find email mismatches. Preview and batch-fix stale emails in the users table.",
    icon: SyncProblemIcon,
    to: "/admin/email-discrepancy",
  },
  {
    permission: "admin:report_health",
    title: "Report Health Dashboard",
    description:
      "Full pipeline observability — SLA status, delay attribution, per-job events, proxy inference, run heatmaps, and ownership for every active report.",
    icon: MonitorHeartIcon,
    to: "/admin/report-health",
  },
  {
    permission: "admin:report_policies",
    title: "Report Policies",
    description:
      "View and edit report definitions & SLA policies. Manage expected delivery times, schedule frequencies, and window configurations.",
    icon: MonitorHeartIcon,
    to: "/admin/report-policies",
  },
  {
    permission: "admin:job_sla_analyzer",
    title: "Job SLA Analyzer",
    description:
      "Deep-dive analysis of job SLA compliance. Timeline charts, day×hour heatmaps, run history, artifacts, proxy inference, and incident tracking.",
    icon: QueryStatsIcon,
    to: "/admin/job-sla-analyzer",
  },
];

export default function Admin({ permissions }: Props) {
  const visibleTools = ADMIN_TOOLS.filter((t) => permissions.includes(t.permission));

  return (
    <div className="lf-layout">
      {/* LEFT SIDEBAR */}
      <aside className="lf-sidebar-left">
        <InfoSidebar />
      </aside>

      {/* CENTER CONTENT */}
      <main className="lf-main">
        <div style={{ width: "100%" }}>
          <div className="toolbar">
            <span className="toolbar-title">
              <Highlight>Admin Tools</Highlight>
            </span>
          </div>

          <div className="admin-grid">
            {visibleTools.map((tool) => {
              const Icon = tool.icon;
              return (
                <Link key={tool.to} to={tool.to} className="admin-tool-card lf-corners-hover no-underline">
                  <div className="admin-tool-header">
                    <div className="admin-tool-icon">
                      <Icon sx={{ fontSize: 18 }} />
                    </div>
                    <h3>{tool.title}</h3>
                  </div>
                  <p>{tool.description}</p>
                </Link>
              );
            })}
          </div>
        </div>
      </main>

      {/* RIGHT SIDEBAR */}
      <aside className="lf-sidebar-right" />
    </div>
  );
}
