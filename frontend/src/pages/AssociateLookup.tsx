import { useState, useMemo } from "react";
import api from "../api";
import SearchIcon from "@mui/icons-material/Search";
import DownloadIcon from "@mui/icons-material/Download";
import SearchOffIcon from "@mui/icons-material/SearchOff";
import ViewColumnIcon from "@mui/icons-material/ViewColumn";
import { Button, Spinner } from "../components/ui";
import { DEFAULT_VISIBLE_COLUMNS } from "../constants/associateLookup";

export default function AssociateLookup() {
  const [beid, setBeid] = useState("");
  const [allColumns, setAllColumns] = useState<string[]>([]);
  const [rows, setRows] = useState<any[][]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [searched, setSearched] = useState(false);
  const [searchedBeid, setSearchedBeid] = useState("");
  const [visibleCols, setVisibleCols] = useState<Set<string>>(new Set(DEFAULT_VISIBLE_COLUMNS));
  const [colSearch, setColSearch] = useState("");

  const search = async () => {
    if (!beid.trim()) return;
    setLoading(true);
    setError(null);
    setAllColumns([]);
    setRows([]);
    setSearched(false);
    const currentBeid = beid.trim();
    setSearchedBeid(currentBeid);
    try {
      const r = await api.get("/admin/associate-lookup", { params: { beid: Number(currentBeid) } });
      setAllColumns(r.data.columns);
      setRows(r.data.rows);
      setTotal(r.data.total);
      // On first search, init visible columns from defaults (intersected with actual results)
      if (r.data.columns.length > 0) {
        const available = new Set(r.data.columns as string[]);
        const initial = DEFAULT_VISIBLE_COLUMNS.filter((c) => available.has(c));
        setVisibleCols(new Set(initial.length > 0 ? initial : r.data.columns.slice(0, 8)));
      }
    } catch (e: any) {
      setError(e.response?.data?.detail || "Lookup failed");
    }
    setSearched(true);
    setLoading(false);
  };

  const toggleColumn = (col: string) => {
    setVisibleCols((prev) => {
      const next = new Set(prev);
      if (next.has(col)) next.delete(col);
      else next.add(col);
      return next;
    });
  };

  const selectAll = () => setVisibleCols(new Set(allColumns));
  const selectNone = () => setVisibleCols(new Set());

  // Filter columns/rows to only visible
  const displayColumns = useMemo(() => allColumns.filter((c) => visibleCols.has(c)), [allColumns, visibleCols]);
  const displayRows = useMemo(() => {
    const indices = displayColumns.map((c) => allColumns.indexOf(c));
    return rows.map((row) => indices.map((i) => row[i]));
  }, [rows, displayColumns, allColumns]);

  const downloadCsv = () => {
    if (!displayColumns.length || !displayRows.length) return;
    const header = displayColumns.join(",");
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
        {rows.length > 0 && (
          <Button size="sm" onClick={downloadCsv}>
            <DownloadIcon sx={{ fontSize: 14, verticalAlign: "middle", mr: 0.5 }} /> Download CSV
          </Button>
        )}
      </div>

      <div className="panel">
        <div className="panel-header">Search by Business Entity ID</div>
        <div className="lookup-search-body">
          <div className="form-row">
            <label className="lookup-label">BusinessEntityID:</label>
            <input
              type="number"
              value={beid}
              onChange={(e) => setBeid(e.target.value)}
              placeholder="Enter Business Entity ID"
              onKeyDown={(e) => e.key === "Enter" && search()}
            />
            <Button variant="primary" onClick={search} disabled={loading || !beid.trim()}>
              <SearchIcon sx={{ fontSize: 16, verticalAlign: "middle", mr: 0.5 }} /> Search
            </Button>
          </div>
        </div>
      </div>

      {loading && <Spinner size="lg" label="Querying REDACTED_DB..." />}
      {error && <div className="badge badge-failed">{error}</div>}

      {searched && !loading && !error && rows.length === 0 && (
        <div className="panel lookup-empty">
          <SearchOffIcon sx={{ fontSize: 36, opacity: 0.5 }} />
          <span>
            No entries found for Business Entity ID: <strong className="lookup-empty-beid">{searchedBeid}</strong>
          </span>
        </div>
      )}

      {rows.length > 0 && (
        <div className="lookup-results-layout">
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
                        <th key={col}>{col}</th>
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
                  .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }))
                  .filter((col) => col.toLowerCase().includes(colSearch.toLowerCase()))
                  .map((col) => (
                    <div
                      key={col}
                      className={`lookup-col-item${visibleCols.has(col) ? " active" : ""}`}
                      onClick={() => toggleColumn(col)}
                    >
                      <span>{col}</span>
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
