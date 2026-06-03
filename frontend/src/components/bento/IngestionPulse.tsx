import { useEffect, useRef, useState } from "react";

const EVENTS = [
  { source: "PostgreSQL", rows: "12,400", status: "success", table: "users" },
  { source: "Snowflake", rows: "88,200", status: "success", table: "events" },
  { source: "ClickHouse", rows: "4,100", status: "running", table: "metrics" },
  { source: "MySQL", rows: "31,000", status: "success", table: "orders" },
  { source: "BigQuery", rows: "210,500", status: "success", table: "sessions" },
  { source: "Redshift", rows: "9,800", status: "running", table: "logs" },
];

export function IngestionPulse() {
  const [visible, setVisible] = useState(EVENTS.slice(0, 6));
  const idx = useRef(6);

  useEffect(() => {
    const t = setInterval(() => {
      const next = EVENTS[idx.current % EVENTS.length];
      idx.current++;
      setVisible((prev) => [next, ...prev.slice(0, 5)]);
    }, 2200);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="bento-pulse-grid">
      {visible.map((e, i) => (
        <div
          key={`${e.source}-${i}`}
          className={`bento-pulse-card bento-pulse-card--${e.status}${i === 0 ? " bento-pulse-card--new" : ""}`}
        >
          <div className="bento-pulse-card__header">
            <span className={`bento-pulse-card__dot bento-pulse-card__dot--${e.status}`} />
            <span className="bento-pulse-card__source">{e.source}</span>
          </div>
          <span className="bento-pulse-card__table">{e.table}</span>
          <div className="bento-pulse-card__footer">
            <span className="bento-pulse-card__rows">{e.rows}</span>
            <span className={`bento-pulse-card__badge bento-pulse-card__badge--${e.status}`}>
              {e.status === "running" ? "syncing" : "done"}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
