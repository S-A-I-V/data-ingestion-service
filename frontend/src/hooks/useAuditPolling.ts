import { useState, useEffect, useCallback } from "react";
import api from "../api";
import type { AuditLog, AuditMetrics } from "../types";

const POLL_INTERVAL_MS = 30_000;

interface UseAuditPollingResult {
  logs: AuditLog[];
  metrics: AuditMetrics | null;
  loading: boolean;
  refresh: () => void;
}

export default function useAuditPolling(): UseAuditPollingResult {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [metrics, setMetrics] = useState<AuditMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(() => {
    api
      .get("/audit")
      .then((r) => setLogs(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
    api
      .get("/audit/metrics")
      .then((r) => setMetrics(r.data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [refresh]);

  return { logs, metrics, loading, refresh };
}
