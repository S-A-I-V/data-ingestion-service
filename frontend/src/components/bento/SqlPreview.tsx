import { useEffect, useState } from "react";

const LEFT_QUERIES = [
  `SELECT o.id, u.email, SUM(o.total) AS revenue\nFROM orders o JOIN users u ON o.user_id = u.id\nWHERE o.created_at > NOW() - INTERVAL '30d'\nGROUP BY o.id, u.email\nHAVING SUM(o.total) > 500;`,
  `WITH daily AS (\n  SELECT date_trunc('day', ts) AS day,\n    source, COUNT(*) AS events\n  FROM raw_events\n  WHERE ts >= CURRENT_DATE - 90\n  GROUP BY 1, 2\n)\nSELECT * FROM daily;`,
];

const RIGHT_QUERIES = [
  `INSERT INTO warehouse.dim_customers\n  (id, name, segment, lifetime_value)\nSELECT c.id, c.full_name,\n  CASE WHEN total > 10000\n    THEN 'VIP' ELSE 'Standard' END,\n  COALESCE(SUM(o.amount), 0)\nFROM staging.customers c\nLEFT JOIN staging.orders o\n  ON c.id = o.customer_id\nGROUP BY 1, 2, 3;`,
  `MERGE INTO production.inventory t\nUSING staging.shipments s\n  ON t.sku = s.sku\nWHEN MATCHED THEN UPDATE\n  SET t.qty = t.qty + s.qty,\n      t.updated_at = NOW()\nWHEN NOT MATCHED THEN INSERT\n  (sku, qty, warehouse)\n  VALUES (s.sku, s.qty, s.wh);`,
];

function useTypewriter(queries: string[], speed = 22, pause = 2400) {
  const [queryIdx, setQueryIdx] = useState(0);
  const [displayed, setDisplayed] = useState("");
  const [charIdx, setCharIdx] = useState(0);

  useEffect(() => {
    const query = queries[queryIdx];
    if (charIdx < query.length) {
      const t = setTimeout(() => {
        setDisplayed(query.slice(0, charIdx + 1));
        setCharIdx((c) => c + 1);
      }, speed);
      return () => clearTimeout(t);
    } else {
      const t = setTimeout(() => {
        setQueryIdx((q) => (q + 1) % queries.length);
        setDisplayed("");
        setCharIdx(0);
      }, pause);
      return () => clearTimeout(t);
    }
  }, [charIdx, queryIdx, queries, speed, pause]);

  return displayed;
}

function colorize(text: string) {
  return text
    .replace(
      /\b(SELECT|INSERT|INTO|FROM|WHERE|JOIN|LEFT|ON|GROUP BY|ORDER BY|HAVING|LIMIT|CASE|WHEN|THEN|ELSE|END|AS|WITH|MERGE|USING|MATCHED|UPDATE|SET|VALUES|AND|OR|NOT|COUNT|SUM|AVG|COALESCE|OVER|PARTITION BY|ROWS|PRECEDING|DESC|CURRENT_DATE|NOW|INTERVAL)\b/g,
      '<span class="sql-kw">$1</span>',
    )
    .replace(/('[^']*')/g, '<span class="sql-str">$1</span>')
    .replace(/\b(\d+)\b/g, '<span class="sql-num">$1</span>');
}

function Terminal({ title, text }: { title: string; text: string }) {
  return (
    <div className="bento-sql">
      <div className="bento-sql__bar">
        <span className="bento-sql__dot bento-sql__dot--red" />
        <span className="bento-sql__dot bento-sql__dot--yellow" />
        <span className="bento-sql__dot bento-sql__dot--green" />
        <span className="bento-sql__title">{title}</span>
      </div>
      <pre
        className="bento-sql__code"
        dangerouslySetInnerHTML={{ __html: colorize(text) + '<span class="bento-sql__cursor">▋</span>' }}
      />
    </div>
  );
}

export function SqlPreview() {
  const leftText = useTypewriter(LEFT_QUERIES, 20, 2800);
  const rightText = useTypewriter(RIGHT_QUERIES, 24, 2200);

  return (
    <div className="bento-sql-split">
      <Terminal title="read.sql" text={leftText} />
      <Terminal title="write.sql" text={rightText} />
    </div>
  );
}
