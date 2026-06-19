/**
 * MismatchTable — Selectable, searchable/filterable table of email mismatches.
 * Extracted from EmailDiscrepancyAudit for modularization.
 */
import { useState, useMemo } from "react";
import SearchIcon from "@mui/icons-material/Search";
import { Button, Panel, PanelHeader } from "../ui";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { COLUMN_LABELS, MISMATCH_COLUMNS } from "../../constants/emailDiscrepancy";

interface MismatchRecord {
  associate_id: number;
  business_entity_id: number;
  first_name: string;
  last_name: string;
  dmzid: string;
  cpr_current_email: string;
  nfc_email: string;
  nfc_updated_at: string;
}

interface Props {
  mismatches: MismatchRecord[];
  selectedIds: Set<number>;
  onToggle: (id: number) => void;
  onSelectAll: () => void;
  onClearSelection: () => void;
  onPreview: () => void;
}

export default function MismatchTable({
  mismatches,
  selectedIds,
  onToggle,
  onSelectAll,
  onClearSelection,
  onPreview,
}: Props) {
  const [search, setSearch] = useState("");
  const [filterCol, setFilterCol] = useState("");
  const [filterVal, setFilterVal] = useState("");

  const filteredMismatches = useMemo(() => {
    let rows = mismatches;
    if (search) {
      const q = search.toLowerCase();
      rows = rows.filter((m) =>
        MISMATCH_COLUMNS.some((col) =>
          String((m as any)[col] ?? "")
            .toLowerCase()
            .includes(q),
        ),
      );
    }
    if (filterCol && filterVal) {
      const fv = filterVal.toLowerCase();
      rows = rows.filter((m) =>
        String((m as any)[filterCol] ?? "")
          .toLowerCase()
          .includes(fv),
      );
    }
    return rows;
  }, [mismatches, search, filterCol, filterVal]);

  return (
    <>
      {/* Selection Controls */}
      <div className="email-disc-actions">
        <Button variant="secondary" onClick={onSelectAll}>
          Select All ({mismatches.length})
        </Button>
        <Button variant="secondary" onClick={onClearSelection} disabled={selectedIds.size === 0}>
          Clear Selection
        </Button>
        <span className="email-disc-selected-count">{selectedIds.size} selected</span>
        <div className="toolbar-spacer" />
        <Button variant="primary" onClick={onPreview} disabled={selectedIds.size === 0}>
          Preview Fix ({selectedIds.size})
        </Button>
      </div>

      {/* Table */}
      <Panel>
        <PanelHeader>
          Email Mismatches — {filteredMismatches.length}
          {filteredMismatches.length !== mismatches.length && ` / ${mismatches.length}`} discrepancies
        </PanelHeader>

        <div className="csv-toolbar">
          <div className="csv-search-wrap">
            <SearchIcon sx={{ fontSize: 16, color: "var(--text-secondary)" }} />
            <input
              className="csv-search-input"
              placeholder="Search all columns"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="csv-filter-wrap">
            <Select
              value={filterCol || "__none__"}
              onValueChange={(val) => {
                setFilterCol(val === "__none__" ? "" : val);
                setFilterVal("");
              }}
            >
              <SelectTrigger className="csv-select-trigger">
                <SelectValue placeholder="Filter by column" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">None</SelectItem>
                {MISMATCH_COLUMNS.map((col) => (
                  <SelectItem key={col} value={col}>
                    {COLUMN_LABELS[col] || col}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {filterCol && (
              <input
                className="csv-filter-input"
                placeholder={`Filter ${COLUMN_LABELS[filterCol] || filterCol}`}
                value={filterVal}
                onChange={(e) => setFilterVal(e.target.value)}
              />
            )}
            {(search || filterCol) && (
              <Button
                size="sm"
                onClick={() => {
                  setSearch("");
                  setFilterCol("");
                  setFilterVal("");
                }}
              >
                Clear
              </Button>
            )}
          </div>
        </div>

        <div className="csv-preview-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: 40 }}>
                  <input
                    type="checkbox"
                    checked={selectedIds.size === filteredMismatches.length && filteredMismatches.length > 0}
                    onChange={() => {
                      if (selectedIds.size === filteredMismatches.length) onClearSelection();
                      else {
                        const allIds = filteredMismatches.map((m) => m.associate_id);
                        allIds.forEach((id) => onToggle(id));
                      }
                    }}
                    aria-label="Select all mismatches"
                  />
                </th>
                {MISMATCH_COLUMNS.map((col) => (
                  <th key={col}>{COLUMN_LABELS[col] || col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredMismatches.map((row) => (
                <tr
                  key={row.associate_id}
                  className={selectedIds.has(row.associate_id) ? "email-disc-row--selected" : ""}
                >
                  <td>
                    <input
                      type="checkbox"
                      checked={selectedIds.has(row.associate_id)}
                      onChange={() => onToggle(row.associate_id)}
                      aria-label={`Select associate ${row.associate_id}`}
                    />
                  </td>
                  {MISMATCH_COLUMNS.map((col) => (
                    <td
                      key={col}
                      className={
                        col === "cpr_current_email"
                          ? "email-disc-cell--correct"
                          : col === "nfc_email"
                            ? "email-disc-cell--stale"
                            : ""
                      }
                    >
                      {(row as any)[col] ?? ""}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </>
  );
}
