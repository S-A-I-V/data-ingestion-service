/**
 * ColumnMapper — Step 3 of the ingestion flow.
 * Maps CSV columns to database columns with a visual two-column layout.
 */
import { Panel, PanelHeader, PanelBody } from "../ui";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { SKIP_COLUMN_VALUE } from "../../constants/ingest";
import type { ColInfo } from "../../types";

interface ColumnMapperProps {
  csvHeaders: string[];
  dbColumns: ColInfo[];
  mapping: Record<string, string>;
  onMappingChange: (newMapping: Record<string, string>) => void;
  mappedCount: number;
  totalRows?: number;
  fileSize?: number;
}

function fmtBytes(b: number): string {
  if (b < 1024) return `${b} B`;
  if (b < 1048576) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1048576).toFixed(1)} MB`;
}

export default function ColumnMapper({
  csvHeaders,
  dbColumns,
  mapping,
  onMappingChange,
  mappedCount,
  totalRows,
  fileSize,
}: ColumnMapperProps) {
  return (
    <Panel>
      <PanelHeader>
        <span className="step-num">3</span> Column Mapping
        <span
          style={{
            marginLeft: "auto",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            fontSize: "11px",
            color: "var(--text-secondary)",
          }}
        >
          {totalRows != null && (
            <span>
              <strong>{totalRows.toLocaleString()}</strong> rows
            </span>
          )}
          {totalRows != null && <span>·</span>}
          <span>
            <strong>{csvHeaders.length}</strong> cols
          </span>
          {fileSize != null && <span>·</span>}
          {fileSize != null && (
            <span>
              <strong>{fmtBytes(fileSize)}</strong>
            </span>
          )}
          <span>·</span>
          <span className="status-pill status-pill--info">
            {mappedCount}/{csvHeaders.length} mapped
          </span>
        </span>
      </PanelHeader>
      <PanelBody>
        <div className="mapper-header">
          <span className="mapper-col-label">CSV Column</span>
          <span className="mapper-arrow-spacer" />
          <span className="mapper-col-label">Database Column</span>
        </div>
        {csvHeaders.map((h) => (
          <div className="mapper-row" key={h}>
            <span className="mapper-csv-name">{h}</span>
            <span className="mapper-arrow">→</span>
            <Select
              value={mapping[h] || SKIP_COLUMN_VALUE}
              onValueChange={(v) => onMappingChange({ ...mapping, [h]: v === SKIP_COLUMN_VALUE ? "" : v })}
            >
              <SelectTrigger className="mapper-select">
                <SelectValue placeholder="(skip)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={SKIP_COLUMN_VALUE}>(skip)</SelectItem>
                {dbColumns.map((c) => (
                  <SelectItem key={c.name} value={c.name}>
                    {c.name} ({c.type})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ))}
      </PanelBody>
    </Panel>
  );
}
