/**
 * ColumnPicker — Sidebar for toggling column visibility in Associate Lookup.
 * Provides search, select all/none, and a scrollable list of checkable columns.
 */
import { useState, useMemo } from "react";
import ViewColumnIcon from "@mui/icons-material/ViewColumn";
import { Panel, PanelHeader } from "../ui";
import { getColumnLabel } from "../../utils/columnHelpers";

interface ColumnPickerProps {
  allColumns: string[];
  visibleColumns: Set<string>;
  onToggle: (col: string) => void;
  onSelectAll: () => void;
  onSelectNone: () => void;
}

export default function ColumnPicker({
  allColumns,
  visibleColumns,
  onToggle,
  onSelectAll,
  onSelectNone,
}: ColumnPickerProps) {
  const [colSearch, setColSearch] = useState("");

  const filteredColumns = useMemo(
    () =>
      [...allColumns]
        .sort((a, b) => getColumnLabel(a).localeCompare(getColumnLabel(b), undefined, { sensitivity: "base" }))
        .filter((col) => getColumnLabel(col).toLowerCase().includes(colSearch.trim().toLowerCase())),
    [allColumns, colSearch],
  );

  return (
    <aside className="lookup-col-picker">
      <Panel>
        <PanelHeader>
          <ViewColumnIcon sx={{ fontSize: 16, verticalAlign: "middle", mr: 0.5 }} /> Columns
          <span className="lookup-col-count">
            {visibleColumns.size}/{allColumns.length}
          </span>
        </PanelHeader>
        <div className="lookup-col-actions">
          <button type="button" className="btn btn-sm" onClick={onSelectAll}>
            All
          </button>
          <button type="button" className="btn btn-sm" onClick={onSelectNone}>
            None
          </button>
        </div>
        <div className="lookup-col-search">
          <input placeholder="Filter columns..." value={colSearch} onChange={(e) => setColSearch(e.target.value)} />
        </div>
        <div className="lookup-col-list">
          {filteredColumns.map((col) => (
            <div
              key={col}
              className={`lookup-col-item${visibleColumns.has(col) ? " active" : ""}`}
              onClick={() => onToggle(col)}
            >
              <span>{getColumnLabel(col)}</span>
            </div>
          ))}
        </div>
      </Panel>
    </aside>
  );
}
