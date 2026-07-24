/**
 * Company/DB logo section — wordmark style.
 * Shows database names as text wordmarks in two rows,
 * with some having "Read story" links.
 * Uses grayscale text styling, no icon cards.
 */

const ROW_1 = [
  { name: "PostgreSQL", hasStory: true },
  { name: "Snowflake", hasStory: false },
  { name: "ClickHouse", hasStory: false },
  { name: "BigQuery", hasStory: true },
  { name: "Oracle", hasStory: false },
  { name: "Databricks", hasStory: false },
];

const ROW_2 = [
  { name: "MySQL", hasStory: true },
  { name: "Vertica", hasStory: false },
  { name: "Teradata", hasStory: false },
  { name: "SAP HANA", hasStory: false },
  { name: "Elasticsearch", hasStory: false },
  { name: "DuckDB", hasStory: true },
];

function LogoRow({ items }: { items: typeof ROW_1 }) {
  return (
    <div className="db-logo-row">
      {items.map((item) => (
        <div key={item.name} className="db-logo-item">
          <span className="db-logo-name">{item.name}</span>
          {item.hasStory && <span className="db-logo-story">Read story</span>}
        </div>
      ))}
    </div>
  );
}

export default function DbLogoSection() {
  return (
    <div className="db-logos-section">
      <LogoRow items={ROW_1} />
      <LogoRow items={ROW_2} />
    </div>
  );
}
