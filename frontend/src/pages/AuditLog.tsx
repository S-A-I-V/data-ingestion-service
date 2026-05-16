import { useState, useEffect, useMemo } from "react";
import api from "../api";
import { motion, AnimatePresence } from "../components/Motion";
import HistoryIcon from "@mui/icons-material/History";
import SearchIcon from "@mui/icons-material/Search";
import RefreshIcon from "@mui/icons-material/Refresh";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import ZoomInIcon from "@mui/icons-material/ZoomIn";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";
import { Button, Badge, EmptyState, Spinner } from "../components/ui";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import type { AuditLog as Log } from "../types";

const COLUMNS = [
  { key: "executed_at", label: "Time" },
  { key: "user_email", label: "User" },
  { key: "connection_name", label: "Connection" },
  { key: "operation", label: "Op" },
  { key: "table_name", label: "Table" },
  { key: "row_count", label: "Rows" },
  { key: "status", label: "Status" },
  { key: "details", label: "Details" },
];

function getDetail(l: Log): string {
  return l.error_message || l.query_preview || "";
}

function getCellValue(l: Log, key: string): string {
  if (key === "executed_at") return new Date(l.executed_at).toLocaleString();
  if (key === "details") return getDetail(l);
  return String((l as any)[key] ?? "");
}

export default function AuditLog() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sortCol, setSortCol] = useState<string | null>(null);
  const [sortAsc, setSortAsc] = useState(true);
  const [filterCol, setFilterCol] = useState("");
  const [filterVal, setFilterVal] = useState("");
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(50);
  const [detailText, setDetailText] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const refresh = () =>
    api
      .get("/audit")
      .then((r) => setLogs(r.data))
      .catch(() => {})
      .finally(() => setPageLoading(false));

  useEffect(() => {
    refresh();
  }, []);

  const handleSort = (col: string) => {
    setPage(0);
    if (sortCol === col) {
      setSortAsc(!sortAsc);
    } else {
      setSortCol(col);
      setSortAsc(true);
    }
  };

  const processed = useMemo(() => {
    let rows = [...logs];

    if (search) {
      const q = search.toLowerCase();
      rows = rows.filter((l) => COLUMNS.some((c) => getCellValue(l, c.key).toLowerCase().includes(q)));
    }

    if (filterCol && filterVal) {
      const fv = filterVal.toLowerCase();
      rows = rows.filter((l) => getCellValue(l, filterCol).toLowerCase().includes(fv));
    }

    if (sortCol) {
      rows.sort((a, b) => {
        const va = getCellValue(a, sortCol);
        const vb = getCellValue(b, sortCol);
        const na = Number(va),
          nb = Number(vb);
        if (!isNaN(na) && !isNaN(nb)) return sortAsc ? na - nb : nb - na;
        return sortAsc ? va.localeCompare(vb) : vb.localeCompare(va);
      });
    }

    return rows;
  }, [logs, search, filterCol, filterVal, sortCol, sortAsc]);

  const totalFiltered = processed.length;
  const totalPages = Math.ceil(totalFiltered / pageSize);
  const paginated = processed.slice(page * pageSize, (page + 1) * pageSize);

  return (
    <>
      <div className="container">
        <>
          <div className="toolbar">
            <span className="toolbar-title">Audit Log</span>
            <div className="toolbar-spacer" />
            <Button size="sm" onClick={refresh}>
              <RefreshIcon sx={{ fontSize: 14, verticalAlign: "middle", mr: 0.5 }} /> Refresh
            </Button>
          </div>
        </>

        <>
          <div className="panel">
            <div className="panel-header">
              <HistoryIcon sx={{ fontSize: 18, verticalAlign: "middle", mr: 0.5 }} /> Execution History
              <Badge variant="info" className="mapper-badge">
                {totalFiltered}/{logs.length} entries
              </Badge>
            </div>

            {pageLoading ? (
              <Spinner size="lg" label="Loading audit log..." />
            ) : logs.length === 0 ? (
              <EmptyState
                icon={<HistoryIcon sx={{ fontSize: 40 }} />}
                title="No operations yet"
                description="Run a data transfer to see it here."
              />
            ) : (
              <>
                {/* Search & Filter */}
                <div className="csv-toolbar">
                  <div className="csv-search-wrap">
                    <SearchIcon sx={{ fontSize: 16, color: "var(--text-secondary)" }} />
                    <input
                      className="csv-search-input"
                      placeholder="Search all columns"
                      value={search}
                      onChange={(e) => {
                        setSearch(e.target.value);
                        setPage(0);
                      }}
                    />
                  </div>
                  <div className="csv-filter-wrap">
                    <Select
                      value={filterCol || "__none__"}
                      onValueChange={(val) => {
                        setFilterCol(val === "__none__" ? "" : val);
                        setFilterVal("");
                        setPage(0);
                      }}
                    >
                      <SelectTrigger className="csv-select-trigger">
                        <SelectValue placeholder="Filter by column" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">None</SelectItem>
                        {COLUMNS.map((c) => (
                          <SelectItem key={c.key} value={c.key}>
                            {c.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {filterCol && (
                      <input
                        className="csv-filter-input"
                        placeholder={`Filter ${COLUMNS.find((c) => c.key === filterCol)?.label}`}
                        value={filterVal}
                        onChange={(e) => {
                          setFilterVal(e.target.value);
                          setPage(0);
                        }}
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

                {/* Table */}
                <div className="csv-preview-scroll">
                  <table className="data-table">
                    <thead>
                      <tr>
                        {COLUMNS.map((c) => (
                          <th key={c.key} className="csv-sortable-th" onClick={() => handleSort(c.key)}>
                            <span className="csv-th-content">
                              {c.label}
                              {sortCol === c.key &&
                                (sortAsc ? (
                                  <ArrowUpwardIcon sx={{ fontSize: 14, ml: 0.3 }} />
                                ) : (
                                  <ArrowDownwardIcon sx={{ fontSize: 14, ml: 0.3 }} />
                                ))}
                            </span>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {paginated.length === 0 ? (
                        <tr>
                          <td colSpan={COLUMNS.length} className="csv-no-results">
                            No matching entries
                          </td>
                        </tr>
                      ) : (
                        paginated.map((l) => (
                          <tr key={l.id}>
                            <td className="audit-nowrap">{new Date(l.executed_at).toLocaleString()}</td>
                            <td>{l.user_email}</td>
                            <td>{l.connection_name}</td>
                            <td>
                              <Badge variant="info">{l.operation}</Badge>
                            </td>
                            <td>{l.table_name}</td>
                            <td>{l.row_count}</td>
                            <td>
                              <Badge variant={l.status === "success" ? "success" : "danger"}>{l.status}</Badge>
                            </td>
                            <td className="audit-details-cell">
                              <button
                                type="button"
                                className="audit-details-btn"
                                title="View full details"
                                onClick={() => {
                                  setDetailText(getDetail(l));
                                  setCopied(false);
                                }}
                              >
                                <ZoomInIcon sx={{ fontSize: 16 }} />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {totalFiltered > 0 && (
                  <div className="csv-pagination">
                    <div className="csv-page-size">
                      <span>Rows per page:</span>
                      {[20, 50, 100].map((s) => (
                        <button
                          key={s}
                          type="button"
                          className={`csv-page-size-btn ${pageSize === s ? "active" : ""}`}
                          onClick={() => {
                            setPageSize(s);
                            setPage(0);
                          }}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                    <div className="csv-page-info">
                      {page * pageSize + 1}–{Math.min((page + 1) * pageSize, totalFiltered)} of {totalFiltered}
                    </div>
                    <div className="csv-page-nav">
                      <button type="button" className="csv-page-btn" disabled={page === 0} onClick={() => setPage(0)}>
                        ««
                      </button>
                      <button
                        type="button"
                        className="csv-page-btn"
                        disabled={page === 0}
                        onClick={() => setPage(page - 1)}
                      >
                        ‹
                      </button>
                      <span className="csv-page-current">
                        {page + 1} / {totalPages}
                      </span>
                      <button
                        type="button"
                        className="csv-page-btn"
                        disabled={page >= totalPages - 1}
                        onClick={() => setPage(page + 1)}
                      >
                        ›
                      </button>
                      <button
                        type="button"
                        className="csv-page-btn"
                        disabled={page >= totalPages - 1}
                        onClick={() => setPage(totalPages - 1)}
                      >
                        »»
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </>
      </div>

      {/* Detail Popup Modal */}
      <AnimatePresence>
        {detailText !== null && (
          <div className="audit-modal-overlay" onClick={() => setDetailText(null)}>
            <motion.div
              className="audit-modal"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.2 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="audit-modal-header">
                <span>Details</span>
                <div className="audit-modal-actions">
                  <Button
                    size="sm"
                    title="Copy to clipboard"
                    onClick={() => {
                      navigator.clipboard.writeText(detailText);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    }}
                  >
                    {copied ? (
                      <>
                        <CheckIcon sx={{ fontSize: 14 }} /> Copied
                      </>
                    ) : (
                      <>
                        <ContentCopyIcon sx={{ fontSize: 14 }} /> Copy
                      </>
                    )}
                  </Button>
                  <button type="button" className="close-btn" title="Close" onClick={() => setDetailText(null)}>
                    <CloseIcon sx={{ fontSize: 18 }} />
                  </button>
                </div>
              </div>
              <div className="audit-modal-body">{detailText}</div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
