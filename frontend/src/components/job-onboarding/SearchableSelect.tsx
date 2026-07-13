/**
 * SearchableSelect — Typeable/filterable dropdown.
 * Click or focus to open, type to filter, click item to select.
 */

import { useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";

interface Option {
  value: string;
  label: string;
}

interface Props {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  loading?: boolean;
}

export default function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = "Search...",
  loading = false,
}: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedLabel = options.find((o) => o.value === value)?.label || "";

  const filtered = search ? options.filter((o) => o.label.toLowerCase().includes(search.toLowerCase())) : options;

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSelect = (optValue: string) => {
    onChange(optValue);
    setOpen(false);
    setSearch("");
    inputRef.current?.blur();
  };

  return (
    <div ref={wrapRef} className="job-input-wrap" style={{ position: "relative" }}>
      <input
        ref={inputRef}
        type="text"
        className="job-input"
        style={{ paddingRight: 28, cursor: "pointer" }}
        value={open ? search : selectedLabel}
        onChange={(e) => {
          setSearch(e.target.value);
          if (!open) setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onClick={() => setOpen(true)}
        placeholder={placeholder}
      />
      <ChevronDown
        style={{
          position: "absolute",
          right: 8,
          top: "50%",
          transform: "translateY(-50%)",
          width: 14,
          height: 14,
          opacity: 0.5,
          pointerEvents: "none",
        }}
      />

      {open && (
        <div className="searchable-select-dropdown">
          {loading && <div className="searchable-select-empty">Loading...</div>}
          {!loading && filtered.length === 0 && search && <div className="searchable-select-empty">No matches</div>}
          {!loading && !search && options.length > 0 && (
            <div className="searchable-select-empty">Start typing to filter...</div>
          )}
          {!loading &&
            filtered.slice(0, 50).map((opt) => (
              <div
                key={opt.value}
                className={`searchable-select-item${opt.value === value ? " active" : ""}`}
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleSelect(opt.value);
                }}
              >
                {opt.label}
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
