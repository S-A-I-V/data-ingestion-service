import { motion } from "./Motion";
import { DB_TYPES } from "../constants/database";
import DbIcon from "./DbIcon";
import ConnectionStatusBadge, { type ConnStatus } from "./ConnectionStatusBadge";
import StorageIcon from "@mui/icons-material/Storage";
import LockIcon from "@mui/icons-material/Lock";
import VpnKeyIcon from "@mui/icons-material/VpnKey";
import EditIcon from "@mui/icons-material/Edit";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import type { Connection } from "../types";

interface Props {
  connections: Connection[];
  statuses: Record<number, ConnStatus>;
  onTest: (id: number) => void;
  onDelete: (id: number) => void;
  onEdit: (conn: Connection) => void;
}

export default function ConnectionList({ connections, statuses, onTest, onDelete, onEdit }: Props) {
  if (connections.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-icon">
          <StorageIcon sx={{ fontSize: 40 }} />
        </div>
        <div className="empty-title">No connections yet</div>
        <div className="empty-desc">Add a database connection to get started.</div>
      </div>
    );
  }

  return (
    <div className="conn-grid">
      {connections.map((c, i) => {
        const info = DB_TYPES.find((d) => d.value === c.db_type);
        return (
          <motion.div key={c.id} className="conn-grid-card">
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
                <span className="conn-grid-badge">
                  <LockIcon sx={{ fontSize: 12 }} /> SSL
                </span>
              )}
              {c.ssh_enabled && (
                <span className="conn-grid-badge">
                  <VpnKeyIcon sx={{ fontSize: 12 }} /> SSH
                </span>
              )}
            </div>
            <div className="conn-grid-actions">
              <motion.button
                type="button"
                className="btn btn-sm"
                title="Edit"
                onClick={() => onEdit(c)}
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.95 }}
              >
                <EditIcon sx={{ fontSize: 14, mr: 0.3 }} /> Edit
              </motion.button>
              <motion.button
                type="button"
                className="btn btn-sm btn-success"
                title="Test connection"
                onClick={() => onTest(c.id)}
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.95 }}
              >
                <PlayArrowIcon sx={{ fontSize: 14, mr: 0.3 }} /> Test
              </motion.button>
              <motion.button
                type="button"
                className="btn btn-sm btn-danger"
                title="Delete"
                onClick={() => onDelete(c.id)}
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.95 }}
              >
                <DeleteOutlineIcon sx={{ fontSize: 14 }} />
              </motion.button>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
