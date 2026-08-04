/**
 * ReportMappingHub — Landing page for the Report Job Mapping tool.
 * Choose: New mapping, Load saved, or Copy from existing report.
 */

import { useNavigate } from "react-router-dom";
import { Spinner, ToggleGroup, ToggleGroupItem, Panel, PanelHeader } from "../components/ui";
import Highlight from "../components/ui/Highlight";
import AddIcon from "@mui/icons-material/Add";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import FolderOpenIcon from "@mui/icons-material/FolderOpen";
import DeleteIcon from "@mui/icons-material/Delete";
import AccountTreeIcon from "@mui/icons-material/AccountTree";
import SearchIcon from "@mui/icons-material/Search";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import HexagonIcon from "../components/report-health/shared/Sev1Icon";
import { format } from "date-fns";
import { useReportMappingHub, type SavedMapping, type ExistingReport } from "../hooks/useReportMappingHub";

// ── Column Definitions ───────────────────────────────────────────────────────

const SAVED_COLUMNS = [
  { key: "name", label: "Name" },
  { key: "report_name", label: "Report" },
  { key: "application_name", label: "Application" },
  { key: "node_count", label: "Total Nodes" },
  { key: "assigned_count", label: "Assigned" },
  { key: "edge_count", label: "Edges" },
  { key: "created_at", label: "Created" },
  { key: "updated_at", label: "Updated" },
] as const;

const EXISTING_COLUMNS = [
  { key: "report_name", label: "Report Name" },
  { key: "application_name", label: "Application" },
  { key: "job_count", label: "Jobs" },
] as const;

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    return format(new Date(iso), "dd MMM yyyy, HH:mm");
  } catch {
    return iso.slice(0, 16).replace("T", " ");
  }
}

// ── Component ────────────────────────────────────────────────────────────────

export default function ReportMappingHub() {
  const navigate = useNavigate();
  const {
    tab,
    setTab,
    saved,
    existing,
    loading,
    error,
    search,
    setSearch,
    appFilter,
    setAppFilter,
    sortCol,
    sortAsc,
    handleSort,
    page,
    setPage,
    pageSize,
    setPageSize,
    PAGE_SIZES,
    savedAppNames,
    existingAppNames,
    totalFiltered,
    totalPages,
    paginated,
    handleDelete,
  } = useReportMappingHub();

  if (loading) {
    return (
      <div className="container audit-container">
        <div className="toolbar">
          <span className="toolbar-title">
            <Highlight>Report Job Mapping</Highlight>
          </span>
        </div>
        <Spinner size="lg" label="Loading reports and saved mappings..." />
      </div>
    );
  }

  return (
    <div className="container audit-container">
      <div className="toolbar">
        <span className="toolbar-title">
          <Highlight>Report Job Mapping</Highlight>
        </span>
        <div className="toolbar-spacer" />
        <button
          type="button"
          className="btn btn-sm btn-primary"
          onClick={() => navigate("/admin/report-mapping/editor")}
        >
          <AddIcon sx={{ fontSize: 16 }} /> New Mapping
        </button>
        <button type="button" className="btn btn-sm" onClick={() => navigate("/admin/report-mapping/live-edit")}>
          Edit Existing
        </button>
      </div>

      {error && <div className="onboarding-global-error">{error}</div>}

      {/* Tab selector */}
      <ToggleGroup type="single" value={tab} onValueChange={setTab} size="lg" className="w-full">
        <ToggleGroupItem value="saved" className="flex-1">
          <FolderOpenIcon sx={{ fontSize: 16 }} /> My Saved ({saved.length})
        </ToggleGroupItem>
        <ToggleGroupItem value="existing" className="flex-1">
          <ContentCopyIcon sx={{ fontSize: 16 }} /> Copy from Existing ({existing.length})
        </ToggleGroupItem>
      </ToggleGroup>

      {/* Table Panel */}
      <div className="audit-table-col" style={{ marginTop: 20, marginBottom: 32 }}>
        <Panel>
          <PanelHeader>
            <AccountTreeIcon sx={{ fontSize: 18, verticalAlign: "middle", mr: 0.5 }} />
            {tab === "saved" ? "Saved Mappings" : "Existing Report Mappings"}
            <span className="status-pill status-pill--info" style={{ marginLeft: "auto" }}>
              {totalFiltered} / {tab === "saved" ? saved.length : existing.length}
            </span>
          </PanelHeader>

          {/* Search & Filter */}
          <div className="csv-toolbar">
            <div className="csv-search-wrap">
              <SearchIcon sx={{ fontSize: 16, color: "var(--text-secondary)" }} />
              <input
                className="csv-search-input"
                placeholder={tab === "saved" ? "Search mappings..." : "Search reports..."}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="rm-filter-chips">
              <button
                type="button"
                className={`rm-filter-chip ${!appFilter ? "active" : ""}`}
                onClick={() => setAppFilter("")}
              >
                All
              </button>
              {(tab === "saved" ? savedAppNames : existingAppNames).map((app) => (
                <button
                  type="button"
                  key={app}
                  className={`rm-filter-chip ${appFilter === app ? "active" : ""}`}
                  onClick={() => setAppFilter(appFilter === app ? "" : app)}
                >
                  {app}
                </button>
              ))}
            </div>
          </div>

          {/* Table */}
          {totalFiltered === 0 ? (
            <div className="rm-empty">
              <AccountTreeIcon sx={{ fontSize: 40, color: "var(--text-muted)" }} />
              <p>{search || appFilter ? "No results matching filters" : "No data available."}</p>
            </div>
          ) : (
            <>
              <div className="csv-preview-scroll">
                <table className="data-table">
                  <thead>
                    <tr>
                      {(tab === "saved" ? SAVED_COLUMNS : EXISTING_COLUMNS).map((c) => (
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
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tab === "saved" &&
                      (paginated as SavedMapping[]).map((m) => {
                        const hasOrphans = m.assigned_count < m.node_count;
                        return (
                          <tr key={m.id} className={hasOrphans ? "rm-row-broken" : ""}>
                            <td>
                              <span style={{ fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 6 }}>
                                {hasOrphans && <HexagonIcon size={14} />}
                                {m.name}
                              </span>
                            </td>
                            <td>{m.report_name || "—"}</td>
                            <td>
                              {m.application_name ? <span className="rm-card-chip">{m.application_name}</span> : "—"}
                            </td>
                            <td>{m.node_count}</td>
                            <td>
                              <span className={hasOrphans ? "rm-orphan-count" : ""}>
                                {m.assigned_count}
                                {hasOrphans && (
                                  <span
                                    className="rm-orphan-badge"
                                    title={`${m.node_count - m.assigned_count} unassigned`}
                                  >
                                    {m.node_count - m.assigned_count} orphan
                                  </span>
                                )}
                              </span>
                            </td>
                            <td>{m.edge_count}</td>
                            <td className="text-muted">{formatDate(m.created_at)}</td>
                            <td className="text-muted">{formatDate(m.updated_at)}</td>
                            <td>
                              <div className="table-actions">
                                <a
                                  href={`/admin/report-mapping/editor?load=${m.id}`}
                                  className="btn btn-sm btn-primary no-underline"
                                  onClick={(e) => {
                                    if (!e.ctrlKey && !e.metaKey) {
                                      e.preventDefault();
                                      navigate(`/admin/report-mapping/editor?load=${m.id}`);
                                    }
                                  }}
                                >
                                  Open
                                </a>
                                <button
                                  type="button"
                                  className="btn btn-sm btn-danger"
                                  onClick={() => handleDelete(m.id)}
                                  title="Delete"
                                >
                                  <DeleteIcon sx={{ fontSize: 14 }} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    {tab === "existing" &&
                      (paginated as ExistingReport[]).map((r) => (
                        <tr key={r.report_id}>
                          <td style={{ fontWeight: 600 }}>{r.report_name}</td>
                          <td>
                            <span className="rm-card-chip">{r.application_name}</span>
                          </td>
                          <td>{r.job_count}</td>
                          <td>
                            <a
                              href={`/admin/report-mapping/editor?copy=${r.report_id}`}
                              className="btn btn-sm no-underline"
                              onClick={(e) => {
                                if (!e.ctrlKey && !e.metaKey) {
                                  e.preventDefault();
                                  navigate(`/admin/report-mapping/editor?copy=${r.report_id}`);
                                }
                              }}
                            >
                              <ContentCopyIcon sx={{ fontSize: 14 }} /> Copy & Edit
                            </a>
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
    </div>
  );
}
