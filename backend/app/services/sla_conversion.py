"""
SLA Conversion Service — Converts report SLA policies to job SLA format.

The two SLA tables use opposite perspectives:
  - report_sla_policies: day_of_week = DELIVERY day, data_date_formula = negative offset back to data_date
  - sla_policies (job):  day_of_week = DATA day, days_addition_sla = positive offset forward to SLA deadline

Algorithm:
  1. For each report policy, compute: data_day = (delivery_day_index - abs(data_date_formula)) % 7
  2. Use abs(data_date_formula) as the job's days_addition_sla
  3. If multiple report policies map to the same data_day, keep the one with the largest offset
  4. Copy expected_sla_time, timezone from report
  5. Default expected_start_time = 1 hour before SLA
  6. Default expected_duration_minutes = 60
  7. schedule_frequency = always "daily"
  8. Fill missing weekdays from template; weekends only if include_weekends=True
"""

from typing import Any

ALL_DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]


def one_hour_before(time_str: str | None) -> str:
    """Subtract 1 hour from a time string (HH:MM:SS). Returns '09:00:00' if input is None."""
    if not time_str:
        return "09:00:00"
    parts = str(time_str).split(":")
    hour = int(parts[0])
    minute = parts[1] if len(parts) > 1 else "00"
    sec = parts[2] if len(parts) > 2 else "00"
    new_hour = max(0, hour - 1)
    return f"{new_hour:02d}:{minute}:{sec}"


def convert_report_sla_to_job_sla(
    report_policies: list[dict[str, Any]],
    include_weekends: bool = False,
) -> list[dict[str, Any]]:
    """
    Convert a list of report SLA policy dicts into job SLA policy dicts.

    Args:
        report_policies: List of dicts from report_sla_policies table.
            Each must have: day_of_week, data_date_formula, expected_sla_time, timezone.
        include_weekends: If True, generate Saturday/Sunday rows.

    Returns:
        Sorted list of job SLA policy dicts (keyed by data_day).
    """
    if not report_policies:
        return []

    freq = "daily"
    day_map: dict[str, dict[str, Any]] = {}

    for p in report_policies:
        delivery_day = p.get("day_of_week")
        ddf = p.get("data_date_formula") or 0
        sla_time = str(p.get("expected_sla_time") or "10:00:00")
        tz = p.get("timezone") or "EST"

        if not delivery_day or delivery_day not in ALL_DAYS:
            continue

        delivery_idx = ALL_DAYS.index(delivery_day)
        abs_offset = abs(ddf)

        # Compute the data_date's day of week by going back from delivery day
        data_day_idx = (delivery_idx - abs_offset) % 7
        data_day = ALL_DAYS[data_day_idx]

        # Keep the entry with the largest offset for each data_day
        if data_day not in day_map or abs_offset > day_map[data_day]["days_addition_sla"]:
            day_map[data_day] = {
                "day_of_week": data_day,
                "schedule_frequency": freq,
                "expected_sla_time": sla_time,
                "expected_time": sla_time,
                "timezone": tz,
                "expected_start_time": one_hour_before(sla_time),
                "days_addition_sla": abs_offset,
                "days_addition_start_time": abs_offset,
                "expected_duration_minutes": 60,
                "data_date_formula": None,
            }

    if not day_map:
        return []

    # Fill missing weekdays from a template (first available entry)
    template = list(day_map.values())[0]
    for day in WEEKDAYS:
        if day not in day_map:
            day_map[day] = {**template, "day_of_week": day}

    # Optionally fill weekends
    if include_weekends:
        if "Saturday" not in day_map:
            fri = day_map.get("Friday", template)
            day_map["Saturday"] = {**fri, "day_of_week": "Saturday"}
        if "Sunday" not in day_map:
            mon = day_map.get("Monday", template)
            day_map["Sunday"] = {
                **mon,
                "day_of_week": "Sunday",
                "days_addition_sla": mon["days_addition_sla"] + 1,
                "days_addition_start_time": mon["days_addition_sla"] + 1,
            }

    # Filter to target days and sort
    target_days = ALL_DAYS if include_weekends else WEEKDAYS
    day_order = {d: i for i, d in enumerate(ALL_DAYS)}

    return sorted(
        [v for v in day_map.values() if v["day_of_week"] in target_days],
        key=lambda p: day_order.get(p["day_of_week"], 99),
    )
