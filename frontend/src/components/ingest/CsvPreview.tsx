import { useState, useMemo } from "react";
import { FadeIn, motion } from "../Motion";
import TextField from "@mui/material/TextField";
import InputAdornment from "@mui/material/InputAdornment";
import MenuItem from "@mui/material/MenuItem";
import TableChartIcon from "@mui/icons-material/TableChart";
import SearchIcon from "@mui/icons-material/Search";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";

const muiFieldSx = {
  "& .MuiOutlinedInput-root": {
    color: "var(--text-primary)", fontSize: "0.8rem", fontFamily: "inherit",
    "& fieldset": { borderColor: "var(--border)" },
    "&:hover fieldset": { borderColor: "var(--border-hover)" },
    "&.Mui-focused fieldset": { borderColor: "var(--accent)" },
  },
  "& .MuiInputLabel-root": {
    color: "var(--text-secondary)", fontSize: "0.8rem", fontFamily: "inherit",
    "&.Mui-focused": { color: "var(--accent)" },
  },
  "& .MuiSvgIcon-root": { color: "var(--text-secondary)" },
};

interface Props {
  headers: string[];
  rows: Record<string, string>[];
}

export default function CsvPreview({ headers, rows }: Props) {
  const [search, setSearch] = useState("");
  const [sortCol, setSortCol] = useState<string | null>(null);
  const [sortAsc, setSortAsc] = useState(true);
  const [filterCol, setFilterCol] = useState("");
  const [filterVal, setFilterVal] = useState("");
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(75);

  const handleSort = (col: string) => {
    setPage(0);
    if (sortCol === col) setSortAsc(!sortAsc);
    else { setSortCol(col); setSortAsc(true); }
  };

  const processed = useMemo(() => {
    let r = [...rows];
    if (search) {
      const q = search.toLowerCase();
      r = r.filter((row) => headers.some((h) => (row[h] || "").toLowerCase().includes(q)));
    }
    if (filterCol && filterVal) {
      const fv = filterVal.toLowerCase();
      r = r.filter((row) => (row[filterCol] || "").toLowerCase().includes(fv));
    }
    if (sortCol) {
      r.sort((a, b) => {
        const va = a[sortCol] || "", vb = b[sortCol] || "";
        const na = Number(va), nb = Number(vb);
        if (!isNaN(na) && !isNaN(nb)) return sortAsc ? na - nb : nb - na;
        return sortAsc ? va.localeCompare(vb) : vb.localeCompare(va);
      });
    }
    return r;
  }, [rows, headers, search, filterCol, filterVal, sortCol, sortAsc]);

  const totalFiltered = processed.length;
  const totalPages = Math.ceil(totalFiltered / pageSize);
  const paginated = processed.slice(page * pageSize, (page + 1) * pageSize);

  return (
    <FadeIn delay={0.15}>
      <div className="panel csv-preview-panel">
        <div className="panel-header">
          <TableChartIcon sx={{ fontSize: 18, verticalAlign: "middle", mr: 0.5 }} /> CSV Preview
          <span className="badge badge-info mapper-badge">{totalFiltered}/{rows.length} rows</span>
        </div>
        <div className="csv-toolbar">
          <TextField label="Search all columns" variant="outlined" size="small" value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 16, color: "var(--text-secondary)" }} /></InputAdornment> }}
            sx={{ flex: "0 1 300px", minWidth: 160, ...muiFieldSx }}
          />
          <div className="csv-filter-wrap">
            <TextField select label="Filter by column" variant="outlined" size="small" value={filterCol}
              onChange={(e) => { setFilterCol(e.target.value); setFilterVal(""); setPage(0); }}
              sx={{ minWidth: 220, ...muiFieldSx }}
            >
              <MenuItem value=""><em>None</em></MenuItem>
              {headers.map((h) => <MenuItem key={h} value={h}>{h}</MenuItem>)}
            </TextField>
            {filterCol && (
              <TextField label={`Filter ${filterCol}`} variant="outlined" size="small" value={filterVal}
                onChange={(e) => { setFilterVal(e.target.value); setPage(0); }}
                sx={{ width: 280, ...muiFieldSx }}
              />
            )}
            {(search || filterCol) && (
              <button type="button" className="btn btn-sm csv-clear-filter"
                onClick={() => { setSearch(""); setFilterCol(""); setFilterVal(""); }}>Clear</button>
            )}
          </div>
        </div>

        <div className="csv-preview-scroll">
          <table className="data-table">
            <thead>
              <tr>
                {headers.map((h) => (
                  <th key={h} className="csv-sortable-th" onClick={() => handleSort(h)}>
                    <span className="csv-th-content">
                      {h}
                      {sortCol === h && (sortAsc
                        ? <ArrowUpwardIcon sx={{ fontSize: 14, ml: 0.3 }} />
                        : <ArrowDownwardIcon sx={{ fontSize: 14, ml: 0.3 }} />
                      )}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 ? (
                <tr><td colSpan={headers.length} className="csv-no-results">No matching rows</td></tr>
              ) : paginated.map((row, i) => (
                <motion.tr key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.01 }}>
                  {headers.map((h) => <td key={h}>{row[h]}</td>)}
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
        {totalFiltered > 0 && (
          <div className="csv-pagination">
            <div className="csv-page-size">
              <span>Rows per page:</span>
              {[20, 50, 75, 100].map((s) => (
                <button key={s} type="button" className={`csv-page-size-btn ${pageSize === s ? "active" : ""}`}
                  onClick={() => { setPageSize(s); setPage(0); }}>{s}</button>
              ))}
            </div>
            <div className="csv-page-info">{page * pageSize + 1}–{Math.min((page + 1) * pageSize, totalFiltered)} of {totalFiltered}</div>
            <div className="csv-page-nav">
              <button type="button" className="csv-page-btn" disabled={page === 0} onClick={() => setPage(0)}>««</button>
              <button type="button" className="csv-page-btn" disabled={page === 0} onClick={() => setPage(page - 1)}>‹</button>
              <span className="csv-page-current">{page + 1} / {totalPages}</span>
              <button type="button" className="csv-page-btn" disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)}>›</button>
              <button type="button" className="csv-page-btn" disabled={page >= totalPages - 1} onClick={() => setPage(totalPages - 1)}>»»</button>
            </div>
          </div>
        )}
      </div>
    </FadeIn>
  );
}
