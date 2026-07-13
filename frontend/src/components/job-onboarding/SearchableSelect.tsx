/**
 * SearchableSelect — A typeable/filterable dropdown.
 *
 * Shows an input field you can type into. Dropdown filters options as you type.
 * Click an option to select it. Uses job-input-wrap styling for consistency.
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

  // Display label for current value
  const selectedLabel = options.find((o) => o.value === value)?.label || "";

  // Filter options by search text
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
  };

  return (
    <div ref={wrapRef} className="job-input-wrap" style={{ position: "relative" }}>
      <div
        style={{ display: "flex", alignItems: "center", cursor: "pointer" }}
        onClick={() => {
          setOpen(!open);
          inputRef.current?.focus();
        }}
      >
        <input
          ref={inputRef}
          type="text"
          className="job-input"
          style={{ paddingRight: 28 }}
          value={open ? search : selectedLabel}
          onChange={(e) => {
            setSearch(e.target.value);
            if (!open) setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder={value ? selectedLabel : placeholder}
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
          }}
        />
      </div>

      {open && (
        <div className="searchable-select-dropdown">
          {loading && <div className="searchable-select-empty">Loading...</div>}
          {!loading && filtered.length === 0 && search && <div className="searchable-select-empty">No matches</div>}
          {!loading && !search && <div className="searchable-select-empty">Start typing to search...</div>}
          {!loading &&
            filtered.slice(0, 50).map((opt) => (
              <div
                key={opt.value}
                className={`searchable-select-item${opt.value === value ? " active" : ""}`}
                onClick={() => handleSelect(opt.value)}
              >
                {opt.label}
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
