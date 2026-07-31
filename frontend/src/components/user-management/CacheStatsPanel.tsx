/**
 * CacheStatsPanel — Shows permission cache statistics with invalidation control.
 * Designed for right sidebar layout.
 */

import CachedIcon from "@mui/icons-material/Cached";
import RefreshIcon from "@mui/icons-material/Refresh";
import { Spinner } from "../ui";
import { LABELS, CACHE_LABELS } from "../../constants/userManagement";
import type { CacheStats } from "../../types/userManagement";

interface CacheStatsPanelProps {
  stats: CacheStats | null;
  onInvalidateAll: () => void;
}

export function CacheStatsPanel({ stats, onInvalidateAll }: CacheStatsPanelProps) {
  return (
    <div className="sidebar-card">
      <div className="sidebar-card-content">
        <div className="sidebar-card-title">
          <h2 className="font-sans text-[13px] font-medium leading-[1.2] tracking-[-0.02em] text-neutral-900 flex items-center gap-2">
            <CachedIcon sx={{ fontSize: 16 }} /> {LABELS.SECTION_CACHE}
          </h2>
        </div>

        {stats ? (
          <div className="um-cache-stats">
            <div className="um-stat-row">
              <span>{CACHE_LABELS.TYPE}</span>
              <span>{stats.type}</span>
            </div>
            <div className="um-stat-row">
              <span>{CACHE_LABELS.CACHED_USERS}</span>
              <span>
                {stats.size}
                {stats.max_size != null && ` / ${stats.max_size}`}
              </span>
            </div>
            <div className="um-stat-row">
              <span>{CACHE_LABELS.TTL}</span>
              <span>{stats.ttl_seconds}s</span>
            </div>
            {stats.hit_rate_percent != null && (
              <div className="um-stat-row">
                <span>{CACHE_LABELS.HIT_RATE}</span>
                <span>{stats.hit_rate_percent.toFixed(1)}%</span>
              </div>
            )}
            <button type="button" className="btn btn-sm um-cache-btn" onClick={onInvalidateAll}>
              <RefreshIcon sx={{ fontSize: 12 }} /> {LABELS.CLEAR_ALL}
            </button>
          </div>
        ) : (
          <div className="um-loading">
            <Spinner size="sm" />
          </div>
        )}
      </div>
    </div>
  );
}
