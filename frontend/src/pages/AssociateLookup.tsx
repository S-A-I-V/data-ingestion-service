/**
 * AssociateLookup — Search associates by BEID or email/DMZID.
 * Displays results in a configurable table with drag-to-reorder columns.
 */
import { useState, useMemo } from "react";
import api from "../api";
import SearchIcon from "@mui/icons-material/Search";
import SearchOffIcon from "@mui/icons-material/SearchOff";
import { Button, Spinner, Panel, PanelHeader, ToggleGroup, ToggleGroupItem, DownloadButton } from "../components/ui";
import ColumnOrderStrip from "../components/associate-lookup/ColumnOrderStrip";
import ColumnPicker from "../components/associate-lookup/ColumnPicker";
import { getColumnLabel, isDefaultColumn } from "../utils/columnHelpers";
import { validateEmail, validatePositiveInt } from "../utils/validation";

/** Maximum columns shown by default if no defaults match */
const DEFAULT_COLUMN_FALLBACK_COUNT = 8;

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
  const [columnOrder, setColumnOrder] = useState<string[]>([]);

  const visibleCols = useMemo(() => new Set(columnOrder), [columnOrder]);

  const validateInput = (): string | null => {
    if (searchType === "beid") {
      return validatePositiveInt(beid, "BEID");
    }
    return validateEmail(dmzid);
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
        setColumnOrder(initial.length > 0 ? initial : r.data.columns.slice(0, DEFAULT_COLUMN_FALLBACK_COUNT));
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
    setColumnOrder((prev) => (prev.includes(col) ? prev.filter((c) => c !== col) : [...prev, col]));
  };

  const selectAll = () => setColumnOrder([...allColumns]);
  const selectNone = () => setColumnOrder([]);

  // Display columns in user-defined order
  const displayColumns = columnOrder;
  const displayRows = useMemo(() => {
    const indices = displayColumns.map((c) => allColumns.indexOf(c));
    return rows.map((row) => indices.map((i) => row[i]));
  }, [rows, displayColumns, allColumns]);

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

      <Panel>
        <PanelHeader>Search Associate</PanelHeader>
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
      </Panel>

      {loading && <Spinner size="lg" label="Querying CustomerRepository..." />}
      {validationError && <div className="lookup-error-badge">{validationError}</div>}
      {error && <div className="lookup-error-badge">{error}</div>}

      {searched && !loading && !error && rows.length === 0 && (
        <Panel className="lookup-empty">
          <SearchOffIcon sx={{ fontSize: 36, opacity: 0.5 }} />
          <span>
            No entries found for {searchType === "beid" ? "Business Entity ID" : "DMZID"}:{" "}
            <strong className="lookup-empty-beid">{searchedBeid}</strong>
          </span>
        </Panel>
      )}

      {rows.length > 0 && (
        <div className="lookup-results-layout">
          <ColumnOrderStrip columnOrder={columnOrder} onReorder={setColumnOrder} onRemove={toggleColumn} />

          {/* Results Table */}
          <div className="lookup-table-col">
            <Panel>
              <PanelHeader>
                Results — {total} associate{total !== 1 ? "s" : ""} found
              </PanelHeader>
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
            </Panel>
          </div>

          <ColumnPicker
            allColumns={allColumns}
            visibleColumns={visibleCols}
            onToggle={toggleColumn}
            onSelectAll={selectAll}
            onSelectNone={selectNone}
          />
        </div>
      )}
    </div>
  );
}
