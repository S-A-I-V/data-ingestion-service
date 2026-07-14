/**
 * ReportPolicySelector — Step 0: searchable/filterable table of reports.
 * Uses the same Panel + data-table pattern as Audit Log and Report Mapping Hub.
 */
import { useState, useMemo } from "react";
import { Spinner, Panel, PanelHeader } from "../ui";
import SearchIcon from "@mui/icons-material/Search";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import ListAltIcon from "@mui/icons-material/ListAlt";
import type { ReportDef } from "../../types/reportPolicies";

const PAGE_SIZES = [20, 50, 100] as const;

interface Props {
  reports: ReportDef[];
  loading: boolean;
  onSelect: (report: ReportDef) => void;
}

export default function ReportPolicySelector({ reports, loading, onSelect }: Props) {
  const [search, setSearch] = useState("");
  const [appFilter, setAppFilter] = useState("");
  const [sortCol, setSortCol] = useState<string | null>(null);
  const [sortAsc, setSortAsc] = useState(true);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(50);

  const appNames = [...new Set(reports.map((r) => r.application_name).filter(Boolean))].sort();

  const handleSort = (col: string) => {
    setPage(0);
    if (sortCol === col) setSortAsc(!sortAsc);
    else {
      setSortCol(col);
      setSortAsc(true);
    }
  };

  const filtered = useMemo(() => {
    let rows = reports.filter((r) => {
      const matchesSearch = !search || r.report_name.toLowerCase().includes(search.toLowerCase());
      const matchesApp = !appFilter || r.application_name === appFilter;
      return matchesSearch && matchesApp;
    });
    if (sortCol) {
      rows = [...rows].sort((a, b) => {
        const av = (a as any)[sortCol] ?? "";
        const bv = (b as any)[sortCol] ?? "";
        const cmp = typeof av === "number" ? av - bv : String(av).localeCompare(String(bv));
        return sortAsc ? cmp : -cmp;
      });
    }
    return rows;
  }, [reports, search, appFilter, sortCol, sortAsc]);

  const totalFiltered = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / pageSize));
  const paginated = filtered.slice(page * pageSize, (page + 1) * pageSize);

  if (loading) return <Spinner size="lg" label="Loading reports..." />;

  return (
    <div className="audit-table-col" style={{ marginTop: 16, marginBottom: 32 }}>
      <Panel>
        <PanelHeader>
          <ListAltIcon sx={{ fontSize: 18, verticalAlign: "middle", mr: 0.5 }} /> Report Definitions
          <span className="status-pill status-pill--info" style={{ marginLeft: "auto" }}>
            {totalFiltered} / {reports.length}
          </span>
        </PanelHeader>

        {/* Search & Filter bar */}
        <div className="csv-toolbar">
          <div className="csv-search-wrap">
            <SearchIcon sx={{ fontSize: 16, color: "var(--text-secondary)" }} />
            <input
              className="csv-search-input"
              placeholder="Search reports..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(0);
              }}
            />
          </div>
          <div className="rm-filter-chips">
            <button
              type="button"
              className={`rm-filter-chip ${!appFilter ? "active" : ""}`}
              onClick={() => {
                setAppFilter("");
                setPage(0);
              }}
            >
              All
            </button>
            {appNames.map((app) => (
              <button
                type="button"
                key={app}
                className={`rm-filter-chip ${appFilter === app ? "active" : ""}`}
                onClick={() => {
                  setAppFilter(appFilter === app ? "" : app);
                  setPage(0);
                }}
              >
                {app}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        {totalFiltered === 0 ? (
          <div className="rm-empty">
            <p>{search || appFilter ? "No reports matching filters" : "No report definitions found."}</p>
          </div>
        ) : (
          <>
            <div className="csv-preview-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th className="csv-sortable-th" onClick={() => handleSort("report_name")}>
                      <span className="csv-th-content">
                        Report Name
                        {sortCol === "report_name" &&
                          (sortAsc ? (
                            <ArrowUpwardIcon sx={{ fontSize: 14, ml: 0.3 }} />
                          ) : (
                            <ArrowDownwardIcon sx={{ fontSize: 14, ml: 0.3 }} />
                          ))}
                      </span>
                    </th>
                    <th className="csv-sortable-th" onClick={() => handleSort("application_name")}>
                      <span className="csv-th-content">
                        Application
                        {sortCol === "application_name" &&
                          (sortAsc ? (
                            <ArrowUpwardIcon sx={{ fontSize: 14, ml: 0.3 }} />
                          ) : (
                            <ArrowDownwardIcon sx={{ fontSize: 14, ml: 0.3 }} />
                          ))}
                      </span>
                    </th>
                    <th className="csv-sortable-th" onClick={() => handleSort("is_fastie")}>
                      <span className="csv-th-content">
                        Type
                        {sortCol === "is_fastie" &&
                          (sortAsc ? (
                            <ArrowUpwardIcon sx={{ fontSize: 14, ml: 0.3 }} />
                          ) : (
                            <ArrowDownwardIcon sx={{ fontSize: 14, ml: 0.3 }} />
                          ))}
                      </span>
                    </th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((r) => (
                    <tr key={r.report_id}>
                      <td style={{ fontWeight: 600 }}>{r.report_name}</td>
                      <td>
                        <span className="rm-card-chip">{r.application_name}</span>
                      </td>
                      <td>
                        {r.is_fastie && <span className="status-pill status-pill--warning">Fastie</span>}
                        {!r.is_fastie && <span className="text-muted">Standard</span>}
                      </td>
                      <td>
                        <div className="table-actions">
                          <button type="button" className="btn btn-sm btn-primary" onClick={() => onSelect(r)}>
                            View Policies
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="csv-pagination">
              <div className="csv-page-size">
                <span>Rows per page:</span>
                {PAGE_SIZES.map((s) => (
                  <button
                    key={s}
                    type="button"
                    className={`btn btn-sm ${pageSize === s ? "btn-primary" : ""}`}
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
                <button type="button" className="btn btn-sm" disabled={page === 0} onClick={() => setPage(0)}>
                  ««
                </button>
                <button type="button" className="btn btn-sm" disabled={page === 0} onClick={() => setPage(page - 1)}>
                  ‹
                </button>
                <span className="csv-page-current">
                  {page + 1} / {totalPages}
                </span>
                <button
                  type="button"
                  className="btn btn-sm"
                  disabled={page >= totalPages - 1}
                  onClick={() => setPage(page + 1)}
                >
                  ›
                </button>
                <button
                  type="button"
                  className="btn btn-sm"
                  disabled={page >= totalPages - 1}
                  onClick={() => setPage(totalPages - 1)}
                >
                  »»
                </button>
              </div>
            </div>
          </>
        )}
      </Panel>
    </div>
  );
}
