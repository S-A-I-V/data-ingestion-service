/**
 * DateRangePicker — Simple date range selector for job SLA analysis.
 * Provides preset ranges and custom date inputs.
 */

import { useMemo } from "react";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import { DEFAULT_DATE_RANGE_DAYS } from "../../constants/jobSla";
import type { DateRange } from "../../types/jobSla";

/** Preset range options */
const PRESET_RANGES = [
  { label: "7 days", days: 7 },
  { label: "14 days", days: 14 },
  { label: "30 days", days: 30 },
  { label: "60 days", days: 60 },
  { label: "90 days", days: 90 },
] as const;

/** Labels for UI text */
const LABELS = {
  FROM: "From",
  TO: "To",
} as const;

interface DateRangePickerProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
}

/** Format date for input value */
function formatDateForInput(date: Date): string {
  return date.toISOString().split("T")[0];
}

/** Get date N days ago */
function getDaysAgo(days: number): Date {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
}

export function DateRangePicker({ value, onChange }: DateRangePickerProps) {
  // Calculate which preset is currently active (if any)
  const activePreset = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const toDate = new Date(value.to);
    toDate.setHours(0, 0, 0, 0);
    const fromDate = new Date(value.from);
    fromDate.setHours(0, 0, 0, 0);

    // Check if 'to' is today (comparing dates without time)
    if (toDate.getTime() !== today.getTime()) return null;

    const diffDays = Math.round((today.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24));
    return PRESET_RANGES.find((p) => p.days === diffDays)?.days ?? null;
  }, [value.from, value.to]);

  const handlePresetClick = (days: number) => {
    onChange({
      from: getDaysAgo(days),
      to: new Date(),
    });
  };

  const handleFromChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newFrom = new Date(e.target.value);
    if (!isNaN(newFrom.getTime())) {
      onChange({ ...value, from: newFrom });
    }
  };

  const handleToChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTo = new Date(e.target.value);
    if (!isNaN(newTo.getTime())) {
      onChange({ ...value, to: newTo });
    }
  };

  return (
    <div className="js-date-range">
      {/* Preset buttons */}
      <div className="js-date-presets">
        {PRESET_RANGES.map((preset) => (
          <button
            key={preset.days}
            type="button"
            className={`js-date-preset ${activePreset === preset.days ? "js-date-preset--active" : ""}`}
            onClick={() => handlePresetClick(preset.days)}
          >
            {preset.label}
          </button>
        ))}
      </div>

      {/* Custom date inputs */}
      <div className="js-date-inputs">
        <div className="js-date-input-group">
          <CalendarTodayIcon sx={{ fontSize: 14, opacity: 0.5 }} />
          <label className="js-date-label">{LABELS.FROM}</label>
          <input
            type="date"
            className="js-date-input"
            value={formatDateForInput(value.from)}
            onChange={handleFromChange}
            max={formatDateForInput(value.to)}
          />
        </div>
        <span className="js-date-separator">–</span>
        <div className="js-date-input-group">
          <label className="js-date-label">{LABELS.TO}</label>
          <input
            type="date"
            className="js-date-input"
            value={formatDateForInput(value.to)}
            onChange={handleToChange}
            min={formatDateForInput(value.from)}
            max={formatDateForInput(new Date())}
          />
        </div>
      </div>
    </div>
  );
}

/** Hook to get default date range */
export function useDefaultDateRange(): DateRange {
  return useMemo(
    () => ({
      from: getDaysAgo(DEFAULT_DATE_RANGE_DAYS),
      to: new Date(),
    }),
    [],
  );
}
