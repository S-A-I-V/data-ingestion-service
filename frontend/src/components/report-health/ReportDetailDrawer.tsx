/**
 * ReportDetailDrawer — slide-over panel shell.
 * Handles overlay, drawer chrome, header, tab switching, escape key, and resize.
 * Tab content is delegated to OverviewTab, JobsTab, TimelineTab.
 */
import React, { useState, useCallback, useEffect } from "react";
import CloseIcon from "@mui/icons-material/Close";
import type { ReportHealthPayload } from "../../types/reportHealth";
import { DRAWER_TAB } from "../../constants/reportHealth";
import Pill from "./shared/Pill";
import OverviewTab from "./tabs/OverviewTab";
import JobsTab from "./tabs/JobsTab";
import TimelineTab from "./tabs/TimelineTab";

interface Props {
  payload: ReportHealthPayload;
  loading?: boolean;
  onClose: () => void;
}

export default function ReportDetailDrawer({ payload, loading = false, onClose }: Props) {
  const [tab, setTab] = useState<string>(DRAWER_TAB.OVERVIEW);
  const [drawerWidth, setDrawerWidth] = useState(50);
  const { report: r, jobs } = payload;

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  // Drag to resize
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      const startX = e.clientX;
      const startWidth = drawerWidth;
      const vw = window.innerWidth / 100;
      const onMouseMove = (ev: MouseEvent) => {
        const delta = startX - ev.clientX;
        setDrawerWidth(Math.min(80, Math.max(20, startWidth + delta / vw)));
      };
      const onMouseUp = () => {
        document.removeEventListener("mousemove", onMouseMove);
        document.removeEventListener("mouseup", onMouseUp);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      };
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", onMouseUp);
    },
    [drawerWidth],
  );

  return (
    <>
      <div className="rh-overlay" onClick={onClose} aria-hidden="true" />
      <aside
        className="rh-drawer"
        role="dialog"
        aria-label={`Report details: ${r.report_name}`}
        style={{ width: `${drawerWidth}vw` }}
      >
        <div className="rh-drawer-resize" onMouseDown={handleMouseDown} title="Drag to resize" />

        {/* Header */}
        <div className="rh-drawer-head">
          <div className="rh-drawer-title-block">
            <div className="rh-drawer-name">{r.report_name}</div>
            <div className="rh-drawer-submeta">
              <span className="rh-drawer-submeta-item">App: {r.application_name}</span>
              <span className="rh-drawer-submeta-item">Client: {r.client_name || "—"}</span>
              <span className="rh-drawer-submeta-item">Delivery: {r.delivery_date}</span>
              <span className="rh-drawer-submeta-item">Data: {r.data_date}</span>
              <Pill status={r.report_delay_status} />
              <Pill status={r.report_delivery_status} type="job" />
            </div>
          </div>
          <button type="button" className="rh-drawer-close" onClick={onClose} aria-label="Close">
            <CloseIcon sx={{ fontSize: 13 }} />
          </button>
        </div>

        {/* Tabs */}
        <div className="rh-drawer-tabs" role="tablist">
          {[
            { key: DRAWER_TAB.OVERVIEW, label: "Overview" },
            { key: DRAWER_TAB.JOBS, label: `Jobs (${jobs.length})` },
            { key: DRAWER_TAB.TIMELINE, label: "Timeline" },
          ].map((t) => (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={tab === t.key ? "true" : "false"}
              className={`rh-drawer-tab${tab === t.key ? " active" : ""}`}
              onClick={() => setTab(t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="rh-drawer-body">
          {loading ? (
            <div className="rh-drawer-loading">
              <div className="rh-spin" />
              <span>Loading job data…</span>
            </div>
          ) : (
            <>
              {tab === DRAWER_TAB.OVERVIEW && <OverviewTab payload={payload} />}
              {tab === DRAWER_TAB.JOBS && <JobsTab jobs={jobs} />}
              {tab === DRAWER_TAB.TIMELINE && <TimelineTab jobs={jobs} />}
            </>
          )}
        </div>
      </aside>
    </>
  );
}
