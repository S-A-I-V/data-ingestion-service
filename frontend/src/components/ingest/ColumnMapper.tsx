/**
 * ColumnMapper — Step 3 of the ingestion flow.
 * Maps CSV columns to database columns with a visual two-column layout.
 */
import { Panel, PanelHeader, PanelBody, Badge } from "../ui";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { SKIP_COLUMN_VALUE } from "../../constants/ingest";
import type { ColInfo } from "../../types";

interface ColumnMapperProps {
  csvHeaders: string[];
  dbColumns: ColInfo[];
  mapping: Record<string, string>;
  onMappingChange: (newMapping: Record<string, string>) => void;
  mappedCount: number;
}

export default function ColumnMapper({
  csvHeaders,
  dbColumns,
  mapping,
  onMappingChange,
  mappedCount,
}: ColumnMapperProps) {
  return (
    <Panel>
      <PanelHeader>
        <span className="step-num">3</span> Column Mapping
        <Badge variant="info" className="mapper-badge">
          {mappedCount}/{csvHeaders.length} mapped
        </Badge>
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
