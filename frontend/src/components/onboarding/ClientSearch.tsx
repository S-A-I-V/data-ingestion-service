/**
 * ClientSearch — Searchable dropdown to find and select an existing client.
 */

import { useState, useEffect, useRef } from "react";
import api from "../../api";
import { Spinner } from "../ui";
import SearchIcon from "@mui/icons-material/Search";
import EditIcon from "@mui/icons-material/Edit";

interface Client {
  client_id: number;
  client_name: string;
}

interface Props {
  onSelect: (clientId: number) => void;
  onCancel: () => void;
}

export default function ClientSearch({ onSelect, onCancel }: Props) {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setLoading(true);
    api
      .get("/admin/client-onboarding/clients")
      .then((r) => setClients(r.data.clients || []))
      .catch((e) => setError(e.response?.data?.detail || "Failed to fetch clients"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const filtered = clients.filter(
    (c) => c.client_name.toLowerCase().includes(search.toLowerCase()) || String(c.client_id).includes(search),
  );

  if (loading) {
    return (
      <div className="client-search">
        <Spinner size="md" label="Loading clients..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="client-search">
        <div className="client-search-error">{error}</div>
        <button className="btn btn-sm" onClick={onCancel}>
          Back
        </button>
      </div>
    );
  }

  return (
    <div className="client-search">
      <div className="client-search-header">
        <EditIcon sx={{ fontSize: 20, color: "var(--accent)" }} />
        <h3>Select Client to Edit</h3>
      </div>

      <div className="client-search-input-wrapper">
        <SearchIcon sx={{ fontSize: 18, color: "var(--text-muted)" }} />
        <input
          ref={inputRef}
          type="text"
          placeholder="Search by name or ID..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="client-search-input"
        />
      </div>

      <div className="client-search-results">
        {filtered.length === 0 ? (
          <div className="client-search-empty">No clients found matching "{search}"</div>
        ) : (
          <div className="client-search-grid">
            {filtered.map((c) => (
              <button key={c.client_id} className="client-search-card" onClick={() => onSelect(c.client_id)}>
                <span className="client-search-card-id">#{c.client_id}</span>
                <span className="client-search-card-name">{c.client_name}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="client-search-footer">
        <button className="btn btn-sm" onClick={onCancel}>
          ← Back to New Onboarding
        </button>
        <span className="client-search-count">{clients.length} clients total</span>
      </div>
    </div>
  );
}
