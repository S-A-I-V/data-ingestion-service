import { useState, useMemo } from "react";

import { DB_TYPES, DB_CATEGORIES } from "../constants/database";
import DbIcon from "./DbIcon";
import { Button } from "./ui";
import CloseIcon from "@mui/icons-material/Close";
import type { DbCategory, DbType } from "../types";

interface Props {
  onSelect: (db: DbType) => void;
  onCancel: () => void;
}

export default function DbPicker({ onSelect, onCancel }: Props) {
  const [category, setCategory] = useState<DbCategory | "All">("All");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    let list = DB_TYPES;
    if (category !== "All") {
      list = list.filter((d) => d.category.includes(category));
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((d) => d.label.toLowerCase().includes(q) || d.value.toLowerCase().includes(q));
    }
    return list;
  }, [category, search]);

  return (
    <div className="db-picker">
      <div className="db-picker-header">
        <div>
          <h3 className="db-picker-title">Select your database</h3>
          <p className="db-picker-subtitle">Find your database driver in the list below.</p>
        </div>
        <button type="button" className="db-picker-close" title="Close" onClick={onCancel}>
          <CloseIcon sx={{ fontSize: 18 }} />
        </button>
      </div>

      <div className="db-picker-search">
        <svg
          className="db-picker-search-icon"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          type="text"
          placeholder="Type part of database/driver name to filter"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          autoFocus
        />
      </div>

      <div className="db-picker-body">
        <div className="db-picker-categories">
          {DB_CATEGORIES.map((c) => (
            <div
              key={c.id}
              className={`db-picker-cat ${category === c.id ? "active" : ""}`}
              onClick={() => setCategory(c.id)}
            >
              {c.label}
            </div>
          ))}
        </div>

        <div className="db-picker-grid-wrap">
          {filtered.length === 0 ? (
            <div className="db-picker-empty">No databases match your search.</div>
          ) : (
            <div className="db-picker-grid">
              {filtered.map((db) => (
                <button type="button" key={db.value} className="db-picker-card" onClick={() => onSelect(db)}>
                  <DbIcon icon={db.icon} size={40} />
                  <span className="db-picker-card-label">{db.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="db-picker-footer">
        <Button onClick={onCancel}>Cancel</Button>
      </div>
    </div>
  );
}
