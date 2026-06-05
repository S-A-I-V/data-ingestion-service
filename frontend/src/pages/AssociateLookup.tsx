import { useState, useMemo, useRef } from "react";
import api from "../api";
import SearchIcon from "@mui/icons-material/Search";
import SearchOffIcon from "@mui/icons-material/SearchOff";
import ViewColumnIcon from "@mui/icons-material/ViewColumn";
import DragIndicatorIcon from "@mui/icons-material/DragIndicator";
import { Button, Spinner, ToggleGroup, ToggleGroupItem, DownloadButton } from "../components/ui";
import { getColumnLabel, isDefaultColumn } from "../utils/columnHelpers";
import { validateEmail, validatePositiveInt } from "../utils/validation";

export default function AssociateLookup() {
  const [searchType, setSearchType] = useState<"beid" | "dmzid">("beid");
  const [beid, setBeid] = useState("");
  const [dmzid, setDmzid] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);
  const [allColumns, setAllColumns] = useState<string[]>([]);
  const [rows, setRows] = useState<any[][]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [searched, setSearched] = useState(false);
  const [searchedBeid, setSearchedBeid] = useState("");
  // Ordered array of visible columns — order = display + download order
  const [columnOrder, setColumnOrder] = useState<string[]>([]);
  const [colSearch, setColSearch] = useState("");

  // Drag state refs
  const dragIdx = useRef<number | null>(null);
  const [dropTarget, setDropTarget] = useState<{ idx: number; side: "left" | "right" } | null>(null);

  const visibleCols = useMemo(() => new Set(columnOrder), [columnOrder]);

  const validateInput = (): string | null => {
    if (searchType === "beid") {
      return validatePositiveInt(beid, "BEID");
    } else {
      return validateEmail(dmzid);
    }
  };

  const search = async () => {
    const err = validateInput();
    if (err) {
      setValidationError(err);
      return;
    }
    setValidationError(null);
    const value = searchType === "beid" ? beid.trim() : dmzid.trim();
    setLoading(true);
    setError(null);
    setAllColumns([]);
    setRows([]);
    setSearched(false);
    setSearchedBeid(value);
    try {
      const params = searchType === "beid" ? { beid: value } : { dmzid: value };
      const r = await api.get("/admin/associate-lookup", { params });
      setAllColumns(r.data.columns);
      setRows(r.data.rows);
      setTotal(r.data.total);
      if (r.data.columns.length > 0) {
        const initial = (r.data.columns as string[]).filter((c) => isDefaultColumn(c));
        setColumnOrder(initial.length > 0 ? initial : r.data.columns.slice(0, 8));
      }
    } catch (e: any) {
      if (e.response) {
        const status = e.response.status;
        const detail = e.response.data?.detail;
        if (status === 503) {
          setError(detail || "Database server is unavailable. Check network/VPN connectivity.");
        } else if (status === 504) {
          setError(detail || "Connection timed out. The database server did not respond.");
        } else if (status === 502) {
          setError(detail || "Authentication failed with the database server.");
        } else if (status === 404) {
          setError(detail || "No saved connection found. Please add the connection in Database Connections first.");
        } else if (status === 403) {
          setError("Permission denied. You do not have access to Associate Lookup.");
        } else if (status === 400) {
          setError(detail || "Invalid search input.");
        } else {
          setError(detail || "An unexpected server error occurred. Please try again.");
        }
      } else if (e.request) {
        setError("Network error — unable to reach the server. Check your internet or VPN connection.");
      } else {
        setError("An unexpected error occurred. Please try again.");
      }
    }
    setSearched(true);
    setLoading(false);
  };

  const toggleColumn = (col: string) => {
    setColumnOrder((prev) => {
      if (prev.includes(col)) {
        return prev.filter((c) => c !== col);
      }
      return [...prev, col];
    });
  };

  const selectAll = () => setColumnOrder([...allColumns]);
  const selectNone = () => setColumnOrder([]);

  // Display columns in user-defined order
  const displayColumns = columnOrder;
  const displayRows = useMemo(() => {
    const indices = displayColumns.map((c) => allColumns.indexOf(c));
    return rows.map((row) => indices.map((i) => row[i]));
  }, [rows, displayColumns, allColumns]);

  // Drag-to-reorder handlers for the strip
  const handleDragStart = (e: React.DragEvent, idx: number) => {
    dragIdx.current = idx;
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", String(idx));
    const el = e.currentTarget as HTMLElement;
    requestAnimationFrame(() => el.classList.add("dragging"));
  };

  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragIdx.current === idx) {
      setDropTarget(null);
      return;
    }
    // Determine left/right side based on cursor position relative to chip center
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const midX = rect.left + rect.width / 2;
    const side = e.clientX < midX ? "left" : "right";
    setDropTarget({ idx, side });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const fromIdx = dragIdx.current;
    if (fromIdx === null || !dropTarget) {
      // If no dropTarget but we're dropping, treat as end-drop
      if (fromIdx !== null) {
        setColumnOrder((prev) => {
          const updated = [...prev];
          const [dragged] = updated.splice(fromIdx, 1);
          updated.push(dragged);
          return updated;
        });
      }
      dragIdx.current = null;
      setDropTarget(null);
      return;
    }
    const { idx: targetIdx, side } = dropTarget;
    // Calculate the insert position
    let insertAt = side === "left" ? targetIdx : targetIdx + 1;
    // Adjust if dragging from before the insert point
    if (fromIdx < insertAt) insertAt -= 1;
    if (fromIdx === insertAt) {
      dragIdx.current = null;
      setDropTarget(null);
      return;
    }
    setColumnOrder((prev) => {
      const updated = [...prev];
      const [dragged] = updated.splice(fromIdx, 1);
      updated.splice(insertAt, 0, dragged);
      return updated;
    });
    dragIdx.current = null;
    setDropTarget(null);
  };

  const handleDropEnd = (e: React.DragEvent) => {
    e.preventDefault();
    const fromIdx = dragIdx.current;
    if (fromIdx === null) return;
    setColumnOrder((prev) => {
      const updated = [...prev];
      const [dragged] = updated.splice(fromIdx, 1);
      updated.push(dragged);
      return updated;
    });
    dragIdx.current = null;
    setDropTarget(null);
  };

  const handleDragEnd = (e: React.DragEvent) => {
    (e.currentTarget as HTMLElement).classList.remove("dragging");
    dragIdx.current = null;
    setDropTarget(null);
  };

  const downloadCsv = () => {
    if (!displayColumns.length || !displayRows.length) return;
    const header = displayColumns.map((c) => getColumnLabel(c)).join(",");
    const body = displayRows.map((row) =>
      row.map((cell: any) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(","),
    );
    const csv = [header, ...body].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `associates_beid_${searchedBeid}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="container audit-container">
      <div className="toolbar">
        <span className="toolbar-title">Associate Lookup</span>
        <div className="toolbar-spacer" />
        {rows.length > 0 && <DownloadButton onClick={downloadCsv} label="Download" doneLabel="Done" />}
      </div>

      <div className="panel">
        <div className="panel-header">Search Associate</div>
        <div className="lookup-search-body">
          <div className="form-row">
            <ToggleGroup
              type="single"
              value={searchType}
              onValueChange={(val) => {
                if (val) setSearchType(val as "beid" | "dmzid");
              }}
            >
              <ToggleGroupItem value="beid">BEID</ToggleGroupItem>
              <ToggleGroupItem value="dmzid">Email / DMZID</ToggleGroupItem>
            </ToggleGroup>
            {searchType === "beid" ? (
              <input
                type="text"
                value={beid}
                onChange={(e) => setBeid(e.target.value.replace(/[^0-9, ]/g, ""))}
                placeholder="Enter BEID(s) — e.g. 123, 456, 890"
                onKeyDown={(e) => {
                  if (e.key === "Enter") search();
                }}
              />
            ) : (
              <input
                type="text"
                value={dmzid}
                onChange={(e) => setDmzid(e.target.value)}
                placeholder="Enter email (e.g. user@company.com)"
                onKeyDown={(e) => e.key === "Enter" && search()}
              />
            )}
            <Button
              variant="primary"
              onClick={search}
              disabled={loading || !(searchType === "beid" ? beid.trim() : dmzid.trim())}
            >
              <SearchIcon sx={{ fontSize: 16, verticalAlign: "middle", mr: 0.5 }} /> Search
            </Button>
          </div>
        </div>
      </div>

      {loading && <Spinner size="lg" label="Querying REDACTED_DB..." />}
      {validationError && <div className="lookup-error-badge">{validationError}</div>}
      {error && <div className="lookup-error-badge">{error}</div>}

      {searched && !loading && !error && rows.length === 0 && (
        <div className="panel lookup-empty">
          <SearchOffIcon sx={{ fontSize: 36, opacity: 0.5 }} />
          <span>
            No entries found for {searchType === "beid" ? "Business Entity ID" : "DMZID"}:{" "}
            <strong className="lookup-empty-beid">{searchedBeid}</strong>
          </span>
        </div>
      )}

      {rows.length > 0 && (
        <div className="lookup-results-layout">
          {/* Column Order Strip — drag chips to reorder (table width only) */}
          <div className="lookup-order-strip">
            <span className="lookup-order-label">Column order:</span>
            <div className="lookup-order-chips">
              {columnOrder.map((col, idx) => (
                <div
                  key={col}
                  className={`lookup-order-chip${dragIdx.current === idx ? " dragging" : ""}${dropTarget?.idx === idx && dropTarget.side === "left" ? " drop-left" : ""}${dropTarget?.idx === idx && dropTarget.side === "right" ? " drop-right" : ""}`}
                  draggable
                  onDragStart={(e) => handleDragStart(e, idx)}
                  onDragOver={(e) => handleDragOver(e, idx)}
                  onDrop={handleDrop}
                  onDragEnd={(e) => handleDragEnd(e)}
                >
                  <DragIndicatorIcon className="lookup-order-grip" sx={{ fontSize: 12 }} />
                  <span>{getColumnLabel(col)}</span>
                  <button
                    type="button"
                    className="lookup-order-remove"
                    onClick={() => toggleColumn(col)}
                    aria-label={`Remove ${getColumnLabel(col)}`}
                  >
                    ×
                  </button>
                </div>
              ))}
              {/* Trailing drop zone — fills remaining space for easy end-drop */}
              <div
                className="lookup-order-end-zone"
                onDragOver={(e) => {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = "move";
                  setDropTarget(null);
                }}
                onDrop={handleDropEnd}
              />
            </div>
          </div>

          {/* Results Table */}
          <div className="lookup-table-col">
            <div className="panel">
              <div className="panel-header">
                Results — {total} associate{total !== 1 ? "s" : ""} found
              </div>
              <div className="csv-preview-scroll">
                <table className="data-table">
                  <thead>
                    <tr>
                      {displayColumns.map((col) => (
                        <th key={col}>{getColumnLabel(col)}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {displayRows.map((row, i) => (
                      <tr key={i}>
                        {row.map((cell: any, j: number) => (
                          <td key={j}>{cell != null ? String(cell) : ""}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Column Picker Sidebar */}
          <aside className="lookup-col-picker">
            <div className="panel">
              <div className="panel-header">
                <ViewColumnIcon sx={{ fontSize: 16, verticalAlign: "middle", mr: 0.5 }} /> Columns
                <span className="lookup-col-count">
                  {visibleCols.size}/{allColumns.length}
                </span>
              </div>
              <div className="lookup-col-actions">
                <button type="button" className="lookup-col-action-btn" onClick={selectAll}>
                  All
                </button>
                <button type="button" className="lookup-col-action-btn" onClick={selectNone}>
                  None
                </button>
              </div>
              <div className="lookup-col-search">
                <input
                  placeholder="Filter columns..."
                  value={colSearch}
                  onChange={(e) => setColSearch(e.target.value)}
                />
              </div>
              <div className="lookup-col-list">
                {[...allColumns]
                  .sort((a, b) =>
                    getColumnLabel(a).localeCompare(getColumnLabel(b), undefined, { sensitivity: "base" }),
                  )
                  .filter((col) => getColumnLabel(col).toLowerCase().includes(colSearch.trim().toLowerCase()))
                  .map((col) => (
                    <div
                      key={col}
                      className={`lookup-col-item${visibleCols.has(col) ? " active" : ""}`}
                      onClick={() => toggleColumn(col)}
                    >
                      <span>{getColumnLabel(col)}</span>
                    </div>
                  ))}
              </div>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
