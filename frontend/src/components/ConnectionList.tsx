import { Stagger, StaggerItem, HoverCard, motion } from "./Motion";
import { DB_TYPES } from "../constants/database";
import type { Connection } from "../types";

interface Props {
  connections: Connection[];
  onTest: (id: number) => void;
  onDelete: (id: number) => void;
}

export default function ConnectionList({ connections, onTest, onDelete }: Props) {
  if (connections.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-icon">🗄️</div>
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
              <div className="conn-icon">{info?.icon || "🗄️"}</div>
              <div className="conn-info">
                <div className="conn-name">{c.name}</div>
                <div className="conn-detail">
                  {info?.label} · {c.host}:{c.port}/{c.database}
                  {c.use_ssl && " · 🔒"}
                  {c.ssh_enabled && " · 🔑"}
                </div>
              </div>
              <div className="conn-actions">
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
