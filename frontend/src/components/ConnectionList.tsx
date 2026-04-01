import { Stagger, StaggerItem, HoverCard, motion } from "./Motion";
import { DB_TYPES } from "../constants/database";
import DbIcon from "./DbIcon";
import StorageIcon from "@mui/icons-material/Storage";
import LockIcon from "@mui/icons-material/Lock";
import VpnKeyIcon from "@mui/icons-material/VpnKey";
import type { Connection } from "../types";

interface Props {
  connections: Connection[];
  onTest: (id: number) => void;
  onDelete: (id: number) => void;
  onEdit: (conn: Connection) => void;
}

export default function ConnectionList({ connections, onTest, onDelete, onEdit }: Props) {
  if (connections.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-icon"><StorageIcon sx={{ fontSize: 40 }} /></div>
        <div className="empty-title">No connections yet</div>
        <div className="empty-desc">Add a database connection to get started.</div>
      </div>
    );
  }

  return (
    <Stagger>
      {connections.map((c) => {
        const info = DB_TYPES.find((d) => d.value === c.db_type);
        return (
          <StaggerItem key={c.id}>
            <HoverCard className="conn-card">
              <div className="conn-icon"><DbIcon icon={info?.icon || ""} size={24} /></div>
              <div className="conn-info">
                <div className="conn-name">{c.name}</div>
                <div className="conn-detail">
                  {info?.label} · {c.host}:{c.port}/{c.database}
                  {c.use_ssl && <><span> · </span><LockIcon sx={{ fontSize: 14, verticalAlign: "middle" }} /></>}
                  {c.ssh_enabled && <><span> · </span><VpnKeyIcon sx={{ fontSize: 14, verticalAlign: "middle" }} /></>}
                </div>
              </div>
              <div className="conn-actions">
                <motion.button
                  type="button"
                  className="btn btn-sm"
                  onClick={() => onEdit(c)}
                  whileHover={{ scale: 1.08 }}
                  whileTap={{ scale: 0.95 }}
                >
                  Edit
                </motion.button>
                <motion.button
                  type="button"
                  className="btn btn-sm btn-success"
                  onClick={() => onTest(c.id)}
                  whileHover={{ scale: 1.08 }}
                  whileTap={{ scale: 0.95 }}
                >
                  Test
                </motion.button>
                <motion.button
                  type="button"
                  className="btn btn-sm btn-danger"
                  onClick={() => onDelete(c.id)}
                  whileHover={{ scale: 1.08 }}
                  whileTap={{ scale: 0.95 }}
                >
                  Delete
                </motion.button>
              </div>
            </HoverCard>
          </StaggerItem>
        );
      })}
    </Stagger>
  );
}
