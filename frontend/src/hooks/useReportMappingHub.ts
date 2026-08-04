/**
 * useReportMappingHub — Custom hook for the Report Mapping Hub page.
 * Encapsulates all state, data loading, filtering, sorting, and pagination.
 */

import { useState, useMemo, useEffect } from "react";
import api from "../api";

export interface SavedMapping {
  id: number;
  name: string;
  report_name: string;
  application_name: string;
  node_count: number;
  assigned_count: number;
  edge_count: number;
  created_at: string | null;
  updated_at: string | null;
}

export interface ExistingReport {
  report_id: number;
  report_name: string;
  application_name: string;
  job_count: number;
}

const PAGE_SIZES = [20, 50, 100] as const;

export function useReportMappingHub() {
  const [tab, setTab] = useState<"saved" | "existing">("saved");
  const [saved, setSaved] = useState<SavedMapping[]>([]);
  const [existing, setExisting] = useState<ExistingReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [appFilter, setAppFilter] = useState("");
  const [sortCol, setSortCol] = useState<string | null>(null);
  const [sortAsc, setSortAsc] = useState(true);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(50);

  // Derived: unique application names for filter chips
  const savedAppNames = [...new Set(saved.map((m) => m.application_name).filter(Boolean))].sort();
  const existingAppNames = [...new Set(existing.map((r) => r.application_name).filter(Boolean))].sort();

  // ── Data Loading ───────────────────────────────────────────────────────────

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

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this saved mapping?")) return;
    try {
      await api.delete(`/admin/report-mapping/saved/${id}`);
      setSaved((prev) => prev.filter((m) => m.id !== id));
    } catch (e: any) {
      setError(e.response?.data?.detail || "Delete failed");
    }
  };

  const handleSort = (col: string) => {
    setPage(0);
    if (sortCol === col) setSortAsc(!sortAsc);
    else {
      setSortCol(col);
      setSortAsc(true);
    }
  };

  const handleTabChange = (v: string | undefined) => {
    if (v) {
      setTab(v as "saved" | "existing");
      setSortCol(null);
    }
  };

  // ── Filtering + Sorting ────────────────────────────────────────────────────

  const filteredSaved = useMemo(() => {
    let rows = saved.filter((m) => {
      const matchesSearch =
        !search ||
        m.name.toLowerCase().includes(search.toLowerCase()) ||
        (m.report_name || "").toLowerCase().includes(search.toLowerCase());
      const matchesApp = !appFilter || m.application_name === appFilter;
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
  }, [saved, search, appFilter, sortCol, sortAsc]);

  const filteredExisting = useMemo(() => {
    let rows = existing.filter((r) => {
      const matchesSearch =
        !search ||
        r.report_name.toLowerCase().includes(search.toLowerCase()) ||
        r.application_name.toLowerCase().includes(search.toLowerCase());
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
  }, [existing, search, appFilter, sortCol, sortAsc]);

  // ── Pagination ─────────────────────────────────────────────────────────────

  const currentData = tab === "saved" ? filteredSaved : filteredExisting;
  const totalFiltered = currentData.length;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / pageSize));
  const paginated = currentData.slice(page * pageSize, (page + 1) * pageSize);

  // Reset page when tab/search/filter changes
  useEffect(() => {
    setPage(0);
  }, [tab, search, appFilter]);

  return {
    tab,
    setTab: handleTabChange,
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
    filteredSaved,
    filteredExisting,
    totalFiltered,
    totalPages,
    paginated,
    handleDelete,
  };
}
