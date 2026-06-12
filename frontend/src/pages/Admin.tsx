/**
 * Admin — Dashboard page listing all admin tools as cards.
 * Each card links to its respective feature page.
 */

import { Link } from "react-router-dom";
import SearchIcon from "@mui/icons-material/Search";
import GroupsIcon from "@mui/icons-material/Groups";
import AccountTreeIcon from "@mui/icons-material/AccountTree";

interface Props {
  permissions: string[];
}

const ADMIN_TOOLS = [
  {
    permission: "admin:associate_lookup",
    title: "Associate Lookup",
    description: "Query the Sybase REDACTED_DB for associate and business entity data by BEID or DMZID.",
    icon: SearchIcon,
    to: "/admin/associate-lookup",
    color: "var(--accent)",
    bg: "rgba(15, 177, 178, 0.1)",
  },
  {
    permission: "admin:client_onboarding",
    title: "Client Onboarding",
    description: "Onboard new clients or edit existing client configurations — groups, BEIDs, reports, and aliases.",
    icon: GroupsIcon,
    to: "/admin/client-onboarding",
    color: "#22c55e",
    bg: "rgba(34, 197, 94, 0.1)",
  },
  {
    permission: "admin:report_mapping",
    title: "Report Job Mapping",
    description: "Visual DAG editor for report→job pipelines. Create, copy, edit, and export mapping configurations.",
    icon: AccountTreeIcon,
    to: "/admin/report-mapping",
    color: "#f59e0b",
    bg: "rgba(245, 158, 11, 0.1)",
  },
];

export default function Admin({ permissions }: Props) {
  const visibleTools = ADMIN_TOOLS.filter((t) => permissions.includes(t.permission));

  return (
    <div className="container audit-container">
      <div className="toolbar">
        <span className="toolbar-title">Admin Tools</span>
      </div>

      <div className="admin-grid">
        {visibleTools.map((tool) => {
          const Icon = tool.icon;
          return (
            <Link key={tool.to} to={tool.to} className="admin-tool-card">
              <div className="admin-tool-icon" style={{ background: tool.bg, color: tool.color }}>
                <Icon sx={{ fontSize: 22 }} />
              </div>
              <h3>{tool.title}</h3>
              <p>{tool.description}</p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
