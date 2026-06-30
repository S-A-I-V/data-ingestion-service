"use client";

import * as React from "react";
import { DayPicker } from "react-day-picker";
import "react-day-picker/style.css";

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

/**
 * Calendar — thin wrapper around react-day-picker v9.
 * Uses the library's own stylesheet (`react-day-picker/style.css`)
 * with dark-mode CSS variable overrides applied below.
 * No custom classNames — just the defaults.
 */
function Calendar({ ...props }: CalendarProps) {
  return <DayPicker {...props} />;
}
Calendar.displayName = "Calendar";

export { Calendar };
