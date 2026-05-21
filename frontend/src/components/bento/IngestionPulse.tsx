import { useEffect, useRef, useState } from "react";

const EVENTS = [
  { source: "PostgreSQL", rows: "12,400", status: "success" },
  { source: "Snowflake", rows: "88,200", status: "success" },
  { source: "ClickHouse", rows: "4,100", status: "running" },
  { source: "MySQL", rows: "31,000", status: "success" },
  { source: "BigQuery", rows: "210,500", status: "success" },
  { source: "Redshift", rows: "9,800", status: "running" },
  { source: "DuckDB", rows: "1,200", status: "success" },
];

export function IngestionPulse() {
  const [visible, setVisible] = useState(EVENTS.slice(0, 4));
  const idx = useRef(4);

  useEffect(() => {
    const t = setInterval(() => {
      const next = EVENTS[idx.current % EVENTS.length];
      idx.current++;
      setVisible((prev) => [next, ...prev.slice(0, 3)]);
    }, 1800);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="bento-pulse">
      {visible.map((e, i) => (
        <div key={`${e.source}-${i}`} className={`bento-pulse__row bento-pulse__row--${i === 0 ? "new" : "old"}`}>
          <span className={`bento-pulse__dot bento-pulse__dot--${e.status}`} />
          <span className="bento-pulse__source">{e.source}</span>
          <span className="bento-pulse__rows">{e.rows} rows</span>
          <span className={`bento-pulse__badge bento-pulse__badge--${e.status}`}>
            {e.status === "running" ? "syncing" : "done"}
          </span>
        </div>
      ))}
    </div>
  );
}
