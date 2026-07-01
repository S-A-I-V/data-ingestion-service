/**
 * ReportHealthFilters — Single-line filter panel.
 *
 * Layout (all in one row):
 * Report Name | Client | SEV1 # | Application | Where (Select) | From (DatePicker) | To (DatePicker) | Reset | Search
 */
import { useState } from "react";
import { format } from "date-fns";
import { ChevronDown } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Button, Popover, PopoverTrigger, PopoverContent, Calendar } from "../ui";
import SearchIcon from "@mui/icons-material/Search";
import Combobox from "./shared/Combobox";

export type DateFieldMode = "delivery_date" | "data_date" | "start_time";

interface FilterState {
  dateFilterMode: DateFieldMode;
  dateFrom: string;
  dateTo: string;
  reportFilter: string;
  clientFilter: string;
  sev1Filter: string;
  appFilter: string;
}

interface Props {
  filters: FilterState;
  onChange: (patch: Partial<FilterState>) => void;
  onSearch: () => void;
  onReset: () => void;
  loading: boolean;
  filtersLoading: boolean;
  appNames: string[];
  reportNames: string[];
  appFilterAllValue: string;
}

export default function ReportHealthFilters({
  filters,
  onChange,
  onSearch,
  onReset,
  loading,
  filtersLoading,
  appNames,
  reportNames,
  appFilterAllValue,
}: Props) {
  const { dateFilterMode, dateFrom, dateTo, reportFilter, clientFilter, sev1Filter, appFilter } = filters;

  const [fromOpen, setFromOpen] = useState(false);
  const [toOpen, setToOpen] = useState(false);

  const fromDate = dateFrom ? new Date(dateFrom + "T12:00:00") : undefined;
  const toDate = dateTo ? new Date(dateTo + "T12:00:00") : undefined;

  if (filtersLoading) {
    return (
      <div className="rh-filter-panel">
        <div className="rh-filter-loading">
          <div className="rh-spin" />
          <span>Loading filters…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="rh-filter-panel">
      {/* Report Name */}
      <div className="rh-filter-field">
        <span className="rh-filter-sublabel">Report Name</span>
        <Combobox
          value={reportFilter}
          onChange={(v) => onChange({ reportFilter: v })}
          options={reportNames}
          placeholder="Type to filter…"
          ariaLabel="Filter by report name"
        />
      </div>

      {/* Client */}
      <div className="rh-filter-field">
        <span className="rh-filter-sublabel">Client</span>
        <input
          type="text"
          className="rh-search"
          placeholder="Type to filter…"
          value={clientFilter}
          onChange={(e) => onChange({ clientFilter: e.target.value })}
          aria-label="Filter by client name"
        />
      </div>

      {/* SEV1 */}
      <div className="rh-filter-field">
        <span className="rh-filter-sublabel">SEV1 #</span>
        <input
          type="text"
          className="rh-search"
          placeholder="e.g. INC123456"
          value={sev1Filter}
          onChange={(e) => onChange({ sev1Filter: e.target.value })}
          aria-label="Filter by SEV1 number"
        />
      </div>

      {/* Application */}
      <div className="rh-filter-field">
        <span className="rh-filter-sublabel">Application</span>
        <Combobox
          value={appFilter === appFilterAllValue ? "" : appFilter}
          onChange={(v) => onChange({ appFilter: v || appFilterAllValue })}
          options={appNames}
          placeholder="All Apps"
          ariaLabel="Filter by application"
        />
      </div>

      {/* Divider */}
      <div className="rh-filter-divider" />

      {/* Where */}
      <div className="rh-filter-field">
        <span className="rh-filter-sublabel">Where</span>
        <Select value={dateFilterMode} onValueChange={(v) => onChange({ dateFilterMode: v as DateFieldMode })}>
          <SelectTrigger className="rh-select-trigger rh-select-trigger--sm" aria-label="Date field">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="delivery_date">Delivery Date</SelectItem>
            <SelectItem value="data_date">Data Date</SelectItem>
            <SelectItem value="start_time">Start Date</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* From */}
      <div className="rh-filter-field">
        <span className="rh-filter-sublabel">From</span>
        <Popover open={fromOpen} onOpenChange={setFromOpen}>
          <PopoverTrigger asChild>
            <button type="button" className="rh-datepicker-btn" aria-label="Select from date">
              {fromDate ? format(fromDate, "dd/MM/yyyy") : "Pick date"}
              <ChevronDown size={12} />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0 rh-cal-popover" align="start">
            <Calendar
              mode="single"
              selected={fromDate}
              onSelect={(d) => {
                if (d) onChange({ dateFrom: format(d, "yyyy-MM-dd") });
                setFromOpen(false);
              }}
              defaultMonth={fromDate}
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* To */}
      <div className="rh-filter-field">
        <span className="rh-filter-sublabel">To</span>
        <Popover open={toOpen} onOpenChange={setToOpen}>
          <PopoverTrigger asChild>
            <button type="button" className="rh-datepicker-btn" aria-label="Select to date">
              {toDate ? format(toDate, "dd/MM/yyyy") : "Pick date"}
              <ChevronDown size={12} />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0 rh-cal-popover" align="start">
            <Calendar
              mode="single"
              selected={toDate}
              onSelect={(d) => {
                if (d) onChange({ dateTo: format(d, "yyyy-MM-dd") });
                setToOpen(false);
              }}
              defaultMonth={toDate}
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* Actions */}
      <div className="rh-filter-field rh-filter-field--action">
        <Button variant="ghost" size="sm" onClick={onReset}>
          Reset
        </Button>
        <Button variant="primary" size="sm" onClick={onSearch} disabled={loading}>
          <SearchIcon sx={{ fontSize: 14 }} />
          {loading ? "Searching…" : "Search"}
        </Button>
      </div>
    </div>
  );
}
