/**
 * Combobox — A searchable dropdown (type to filter, click to select).
 * Shows a filtered list of options as you type.
 */
import { useState, useRef, useEffect } from "react";

interface Props {
  value: string;
  onChange: (val: string) => void;
  options: string[];
  placeholder?: string;
  ariaLabel?: string;
}

export default function Combobox({ value, onChange, options, placeholder = "Type to filter…", ariaLabel }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(value);
  const wrapRef = useRef<HTMLDivElement>(null);

  // Sync external value changes
  useEffect(() => {
    setQuery(value);
  }, [value]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = query ? options.filter((o) => o.toLowerCase().includes(query.toLowerCase())) : options;

  return (
    <div className="rh-combobox" ref={wrapRef}>
      <input
        type="text"
        className="rh-search"
        placeholder={placeholder}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        aria-label={ariaLabel}
        autoComplete="off"
      />
      {open && filtered.length > 0 && (
        <ul className="rh-combobox-list">
          {filtered.slice(0, 20).map((opt) => (
            <li
              key={opt}
              className={`rh-combobox-item${opt === value ? " rh-combobox-item--active" : ""}`}
              onMouseDown={(e) => {
                e.preventDefault();
                onChange(opt);
                setQuery(opt);
                setOpen(false);
              }}
            >
              {opt}
            </li>
          ))}
          {filtered.length > 20 && (
            <li className="rh-combobox-item rh-combobox-item--more">+{filtered.length - 20} more…</li>
          )}
        </ul>
      )}
    </div>
  );
}
