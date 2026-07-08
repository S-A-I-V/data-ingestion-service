/**
 * PreviewPanel — Shows the SQL statements that will be executed
 * before applying changes to the production database.
 * Uses sql-formatter for clean SQL display.
 */
import { format } from "sql-formatter";

interface PreviewStatement {
  sql: string;
  params: Record<string, unknown>;
}

interface PreviewPanelProps {
  statements: PreviewStatement[];
  executing: boolean;
  onBackToEdit: () => void;
  onApply: () => void;
}

/** Format SQL for display — removes excessive indentation */
function formatSql(raw: string): string {
  try {
    return format(raw, {
      language: "postgresql",
      tabWidth: 2,
      keywordCase: "upper",
      linesBetweenQueries: 1,
    });
  } catch {
    // Fallback: just trim leading whitespace from each line
    return raw
      .split("\n")
      .map((line) => line.trimStart())
      .join("\n")
      .trim();
  }
}

export default function PreviewPanel({ statements }: PreviewPanelProps) {
  return (
    <div className="rm-preview-panel">
      <div className="rm-preview-header">
        <h4>
          {statements.length} statement{statements.length !== 1 ? "s" : ""} will be executed
        </h4>
      </div>
      <div className="rm-preview-statements">
        {statements.map((s, i) => (
          <div key={i} className="rm-preview-stmt">
            <span className="rm-preview-stmt-num">#{i + 1}</span>
            <div>
              <code>{formatSql(s.sql)}</code>
              <div className="rm-preview-stmt-params">
                {Object.entries(s.params)
                  .map(([k, v]) => `${k}=${JSON.stringify(v)}`)
                  .join("  |  ")}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
