import { DB_TYPES } from "../constants/database";
import DbIcon from "./DbIcon";
import ConnectionStatusBadge, { type ConnStatus } from "./ConnectionStatusBadge";
import LockIcon from "@mui/icons-material/Lock";
import VpnKeyIcon from "@mui/icons-material/VpnKey";
import EditIcon from "@mui/icons-material/Edit";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import { Button, Badge, EmptyState } from "./ui";
import StorageIcon from "@mui/icons-material/Storage";
import type { Connection } from "../types";

export type ViewMode = "grid" | "list";

interface Props {
  connections: Connection[];
  statuses: Record<number, ConnStatus>;
  onTest: (id: number) => void;
  onDelete: (id: number) => void;
  onEdit: (conn: Connection) => void;
  view?: ViewMode;
}

export default function ConnectionList({ connections, statuses, onTest, onDelete, onEdit, view = "grid" }: Props) {
  if (connections.length === 0) {
    return (
      <EmptyState
        icon={<StorageIcon sx={{ fontSize: 40 }} />}
        title="No connections yet"
        description="Add a database connection to get started."
      />
    );
  }

  if (view === "list") {
    return (
      <div className="conn-list">
        {connections.map((c) => {
          const info = DB_TYPES.find((d) => d.value === c.db_type);
          const status = statuses[c.id] ?? "unknown";
          return (
            <div key={c.id} className={`conn-list-row conn-list-row--${status}`}>
              {/* Icon — no status overlay in list view, row tint handles it */}
              <div className="conn-list-icon">
                <DbIcon icon={info?.icon || ""} size={32} />
              </div>

              {/* Name */}
              <div className="conn-list-name">{c.name}</div>

              {/* DB type — own column */}
              <div className="conn-list-type">{info?.label}</div>

              {/* Host */}
              <div className="conn-list-host">
                {c.host}:{c.port}/{c.database}
              </div>

              {/* Badges */}
              <div className="conn-list-badges">
                {c.use_ssl && (
                  <Badge>
                    <LockIcon sx={{ fontSize: 11 }} /> SSL
                  </Badge>
                )}
                {c.ssh_enabled && (
                  <Badge>
                    <VpnKeyIcon sx={{ fontSize: 11 }} /> SSH
                  </Badge>
                )}
              </div>

              {/* Actions */}
              <div className="conn-list-actions">
                <Button size="sm" onClick={() => onEdit(c)}>
                  <EditIcon sx={{ fontSize: 14 }} /> Edit
                </Button>
                <Button size="sm" variant="success" onClick={() => onTest(c.id)}>
                  <PlayArrowIcon sx={{ fontSize: 14 }} /> Test
                </Button>
                <Button size="sm" variant="danger" onClick={() => onDelete(c.id)}>
                  <DeleteOutlineIcon sx={{ fontSize: 14 }} />
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  // Grid / tile view (default)
  return (
    <div className="conn-grid">
      {connections.map((c) => {
        const info = DB_TYPES.find((d) => d.value === c.db_type);
        return (
          <div key={c.id} className="conn-grid-card">
            <ConnectionStatusBadge status={statuses[c.id] ?? "unknown"} />
            <div className="conn-grid-icon">
              <DbIcon icon={info?.icon || ""} size={40} />
            </div>
            <div className="conn-grid-name">{c.name}</div>
            <div className="conn-grid-type">{info?.label}</div>
            <div className="conn-grid-host">
              {c.host}:{c.port}/{c.database}
            </div>
            <div className="conn-grid-badges">
              {c.use_ssl && (
                <Badge>
                  <LockIcon sx={{ fontSize: 12 }} /> SSL
                </Badge>
              )}
              {c.ssh_enabled && (
                <Badge>
                  <VpnKeyIcon sx={{ fontSize: 12 }} /> SSH
                </Badge>
              )}
            </div>
            <div className="conn-grid-actions">
              <Button size="sm" onClick={() => onEdit(c)}>
                <EditIcon sx={{ fontSize: 14 }} /> Edit
              </Button>
              <Button size="sm" variant="success" onClick={() => onTest(c.id)}>
                <PlayArrowIcon sx={{ fontSize: 14 }} /> Test
              </Button>
              <Button size="sm" variant="danger" onClick={() => onDelete(c.id)}>
                <DeleteOutlineIcon sx={{ fontSize: 14 }} />
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
