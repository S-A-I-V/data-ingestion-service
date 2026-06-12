/**
 * ReportMappingHub — Landing page for the Report Job Mapping tool.
 * Choose: New mapping, Load saved, or Copy from existing report.
 */

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";
import { Button, Spinner } from "../components/ui";
import AddIcon from "@mui/icons-material/Add";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import FolderOpenIcon from "@mui/icons-material/FolderOpen";
import DeleteIcon from "@mui/icons-material/Delete";
import AccountTreeIcon from "@mui/icons-material/AccountTree";

interface SavedMapping {
  id: number;
  name: string;
  report_name: string;
  application_name: string;
  node_count: number;
  edge_count: number;
  updated_at: string | null;
}

interface ExistingReport {
  report_id: number;
  report_name: string;
  application_name: string;
  job_count: number;
}

export default function ReportMappingHub() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<"saved" | "existing">("saved");
  const [saved, setSaved] = useState<SavedMapping[]>([]);
  const [existing, setExisting] = useState<ExistingReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.get("/admin/report-mapping/saved").catch(() => ({ data: { mappings: [] } })),
      api.get("/admin/report-mapping/existing").catch(() => ({ data: { reports: [] } })),
    ])
      .then(([savedRes, existingRes]) => {
        setSaved(savedRes.data.mappings || []);
        setExisting(existingRes.data.reports || []);
      })
      .catch((e) => setError(e.response?.data?.detail || "Failed to load data"))
      .finally(() => setLoading(false));
  }, []);

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this saved mapping?")) return;
    try {
      await api.delete(`/admin/report-mapping/saved/${id}`);
      setSaved((prev) => prev.filter((m) => m.id !== id));
    } catch (e: any) {
      setError(e.response?.data?.detail || "Delete failed");
    }
  };

  const handleCopyExisting = (reportId: number) => {
    navigate(`/admin/report-mapping/editor?copy=${reportId}`);
  };

  if (loading) {
    return (
      <div className="container audit-container">
        <div className="toolbar">
          <span className="toolbar-title">Report Job Mapping</span>
        </div>
        <Spinner size="lg" label="Loading..." />
      </div>
    );
  }

  return (
    <div className="container audit-container">
      <div className="toolbar">
        <span className="toolbar-title">Report Job Mapping</span>
        <div className="toolbar-spacer" />
        <Button variant="primary" onClick={() => navigate("/admin/report-mapping/editor")}>
          <AddIcon sx={{ fontSize: 16 }} /> New Mapping
        </Button>
      </div>

      {error && <div className="onboarding-global-error">{error}</div>}

      {/* Tab selector */}
      <div className="rm-tabs">
        <button className={`rm-tab ${tab === "saved" ? "active" : ""}`} onClick={() => setTab("saved")}>
          <FolderOpenIcon sx={{ fontSize: 16 }} /> My Saved ({saved.length})
        </button>
        <button className={`rm-tab ${tab === "existing" ? "active" : ""}`} onClick={() => setTab("existing")}>
          <ContentCopyIcon sx={{ fontSize: 16 }} /> Copy from Existing ({existing.length})
        </button>
      </div>

      {/* Saved mappings */}
      {tab === "saved" && (
        <div className="rm-grid">
          {saved.length === 0 ? (
            <div className="rm-empty">
              <AccountTreeIcon sx={{ fontSize: 40, color: "var(--text-muted)" }} />
              <p>No saved mappings yet. Create one to get started.</p>
            </div>
          ) : (
            saved.map((m) => (
              <div key={m.id} className="rm-card">
                <div className="rm-card-header">
                  <h4>{m.name}</h4>
                  <button className="rm-card-delete" onClick={() => handleDelete(m.id)} title="Delete">
                    <DeleteIcon sx={{ fontSize: 14 }} />
                  </button>
                </div>
                {m.report_name && <p className="rm-card-report">{m.report_name}</p>}
                <div className="rm-card-stats">
                  <span>{m.node_count} jobs</span>
                  <span>{m.edge_count} edges</span>
                </div>
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => navigate(`/admin/report-mapping/editor?load=${m.id}`)}
                >
                  Open
                </Button>
              </div>
            ))
          )}
        </div>
      )}

      {/* Existing report mappings to copy */}
      {tab === "existing" && (
        <>
          <div className="rm-search-bar">
            <input
              type="text"
              placeholder="Search by report name or application..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="rm-search-input"
            />
          </div>
          <div className="rm-grid">
            {existing.filter(
              (r) =>
                r.report_name.toLowerCase().includes(search.toLowerCase()) ||
                r.application_name.toLowerCase().includes(search.toLowerCase()),
            ).length === 0 ? (
              <div className="rm-empty">
                <p>{search ? `No reports matching "${search}"` : "No existing report mappings found in NFC Prod."}</p>
              </div>
            ) : (
              existing
                .filter(
                  (r) =>
                    r.report_name.toLowerCase().includes(search.toLowerCase()) ||
                    r.application_name.toLowerCase().includes(search.toLowerCase()),
                )
                .map((r) => (
                  <div key={r.report_id} className="rm-card">
                    <div className="rm-card-header">
                      <h4>{r.report_name}</h4>
                    </div>
                    <p className="rm-card-report">{r.application_name}</p>
                    <div className="rm-card-stats">
                      <span>{r.job_count} jobs</span>
                    </div>
                    <Button size="sm" onClick={() => handleCopyExisting(r.report_id)}>
                      <ContentCopyIcon sx={{ fontSize: 14 }} /> Copy & Edit
                    </Button>
                  </div>
                ))
            )}
          </div>
        </>
      )}
    </div>
  );
}
