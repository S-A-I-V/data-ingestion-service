import { useEffect, useState } from "react";

const QUERIES = [
  `SELECT * FROM orders\nWHERE created_at > NOW() - INTERVAL '7d'\nLIMIT 1000;`,
  `INSERT INTO warehouse.events\nSELECT id, user_id, payload\nFROM source.raw_events;`,
  `CREATE TABLE IF NOT EXISTS\n  analytics.daily_summary AS\nSELECT date, SUM(revenue)\nFROM transactions\nGROUP BY date;`,
  `COPY users FROM 's3://bucket/users.csv'\nCREDENTIALS '...'\nFORMAT CSV HEADER;`,
];

export function SqlPreview() {
  const [queryIdx, setQueryIdx] = useState(0);
  const [displayed, setDisplayed] = useState("");
  const [charIdx, setCharIdx] = useState(0);

  useEffect(() => {
    const query = QUERIES[queryIdx];
    if (charIdx < query.length) {
      const t = setTimeout(() => {
        setDisplayed(query.slice(0, charIdx + 1));
        setCharIdx((c) => c + 1);
      }, 28);
      return () => clearTimeout(t);
    } else {
      const t = setTimeout(() => {
        setQueryIdx((q) => (q + 1) % QUERIES.length);
        setDisplayed("");
        setCharIdx(0);
      }, 2200);
      return () => clearTimeout(t);
    }
  }, [charIdx, queryIdx]);

  const colorize = (text: string) =>
    text
      .replace(
        /(SELECT|INSERT|CREATE|COPY|FROM|WHERE|INTO|TABLE|IF NOT EXISTS|AS|GROUP BY|LIMIT|FORMAT|CREDENTIALS|INTERVAL|SUM|NOW)/g,
        '<span class="sql-kw">$1</span>',
      )
      .replace(/('[^']*')/g, '<span class="sql-str">$1</span>')
      .replace(/(\d+)/g, '<span class="sql-num">$1</span>');

  return (
    <div className="bento-sql">
      <div className="bento-sql__bar">
        <span className="bento-sql__dot bento-sql__dot--red" />
        <span className="bento-sql__dot bento-sql__dot--yellow" />
        <span className="bento-sql__dot bento-sql__dot--green" />
        <span className="bento-sql__title">query.sql</span>
      </div>
      <pre
        className="bento-sql__code"
        dangerouslySetInnerHTML={{ __html: colorize(displayed) + '<span class="bento-sql__cursor">▋</span>' }}
      />
    </div>
  );
}
