"""
Heatmap and trend analysis queries for Job SLA Analyzer.

All queries use a fixed 90-day rolling window (CURRENT_DATE - 89 days → CURRENT_DATE)
computed directly in SQL — no date parameters are passed from the application layer.

Tables used:
- job_live_state: Current runtime state per job/data_date/client

IMPORTANT: PERCENTILE_CONT is an ordered-set aggregate in PostgreSQL and does NOT
support the FILTER clause. NULLs must be excluded inside a CTE/subquery before
calling PERCENTILE_CONT — not via FILTER on the aggregate itself.
"""

# ── Day-of-Week × Hour Heatmap ────────────────────────────────────────────────

HEATMAP_DAY_HOUR = """
SELECT
    EXTRACT(DOW FROM jls.data_date)::int AS day_of_week,
    EXTRACT(HOUR FROM COALESCE(jls.end_time, jls.start_time))::int AS hour_of_day,
    COUNT(*) AS run_count,
    COUNT(*) FILTER (WHERE jls.delay_status IN ('client_delayed', 'internal_delayed')) AS delayed_count,
    COUNT(*) FILTER (
        WHERE jls.current_status = 'success'
          AND jls.end_time <= jls.job_expected_sla
    ) AS on_time_count,
    COUNT(*) FILTER (
        WHERE jls.current_status = 'success'
          AND jls.end_time > jls.job_expected_sla
    ) AS late_count,
    COUNT(*) FILTER (WHERE jls.current_status = 'failed') AS failed_count,
    ROUND((AVG(jls.observed_duration_seconds) / 60.0)::numeric, 2) AS avg_duration_minutes
FROM job_live_state jls
WHERE jls.job_id = :job_id
  AND jls.data_date >= CURRENT_DATE - INTERVAL '89 days'
  AND jls.data_date <= CURRENT_DATE
  AND jls.end_time IS NOT NULL
GROUP BY
    EXTRACT(DOW FROM jls.data_date),
    EXTRACT(HOUR FROM COALESCE(jls.end_time, jls.start_time))
ORDER BY day_of_week, hour_of_day
"""

# ── Weekly Trend Aggregation ──────────────────────────────────────────────────
# NOTE: PERCENTILE_CONT does not support FILTER in PostgreSQL.
# NULL observed_duration_seconds rows are excluded in the CTE before aggregation.

WEEKLY_TREND = """
WITH base AS (
    SELECT
        DATE_TRUNC('week', jls.data_date)::date AS week_start,
        jls.current_status,
        jls.end_time,
        jls.job_expected_sla,
        jls.delay_status,
        jls.delay_duration_minutes,
        jls.observed_duration_seconds,
        jls.expected_duration_minutes
    FROM job_live_state jls
    WHERE jls.job_id = :job_id
      AND jls.data_date >= CURRENT_DATE - INTERVAL '89 days'
      AND jls.data_date <= CURRENT_DATE
),
with_duration AS (
    SELECT week_start, observed_duration_seconds / 60.0 AS dur_min
    FROM base
    WHERE observed_duration_seconds IS NOT NULL
)
SELECT
    b.week_start,
    COUNT(*) AS total_runs,
    COUNT(*) FILTER (WHERE b.delay_status IN ('client_delayed', 'internal_delayed')) AS delayed_count,
    COUNT(*) FILTER (
        WHERE b.current_status = 'success' AND b.end_time <= b.job_expected_sla
    ) AS on_time_count,
    COUNT(*) FILTER (
        WHERE b.current_status = 'success' AND b.end_time > b.job_expected_sla
    ) AS late_count,
    COUNT(*) FILTER (WHERE b.current_status = 'failed') AS failed_count,
    ROUND(
        100.0 * COUNT(*) FILTER (
            WHERE b.current_status = 'success' AND b.end_time <= b.job_expected_sla
        ) / NULLIF(COUNT(*), 0),
        2
    ) AS on_time_percentage,
    ROUND(AVG(b.delay_duration_minutes) FILTER (WHERE b.delay_duration_minutes > 0), 2) AS avg_delay_minutes,
    ROUND((SELECT AVG(d.dur_min) FROM with_duration d
           WHERE d.week_start = b.week_start)::numeric, 2) AS avg_duration_minutes,
    ROUND((SELECT PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY d.dur_min)
           FROM with_duration d WHERE d.week_start = b.week_start)::numeric, 2) AS p95_duration_minutes,
    ROUND(AVG(b.expected_duration_minutes)::numeric, 2) AS expected_duration_minutes
FROM base b
GROUP BY b.week_start
ORDER BY b.week_start
"""

# ── Monthly Trend Aggregation ─────────────────────────────────────────────────

MONTHLY_TREND = """
WITH base AS (
    SELECT
        DATE_TRUNC('month', jls.data_date)::date AS month_start,
        jls.current_status,
        jls.end_time,
        jls.job_expected_sla,
        jls.delay_status,
        jls.delay_duration_minutes,
        jls.observed_duration_seconds,
        jls.expected_duration_minutes
    FROM job_live_state jls
    WHERE jls.job_id = :job_id
      AND jls.data_date >= CURRENT_DATE - INTERVAL '89 days'
      AND jls.data_date <= CURRENT_DATE
),
with_duration AS (
    SELECT month_start, observed_duration_seconds / 60.0 AS dur_min
    FROM base
    WHERE observed_duration_seconds IS NOT NULL
)
SELECT
    b.month_start,
    COUNT(*) AS total_runs,
    COUNT(*) FILTER (WHERE b.delay_status IN ('client_delayed', 'internal_delayed')) AS delayed_count,
    COUNT(*) FILTER (
        WHERE b.current_status = 'success' AND b.end_time <= b.job_expected_sla
    ) AS on_time_count,
    COUNT(*) FILTER (
        WHERE b.current_status = 'success' AND b.end_time > b.job_expected_sla
    ) AS late_count,
    COUNT(*) FILTER (WHERE b.current_status = 'failed') AS failed_count,
    ROUND(
        100.0 * COUNT(*) FILTER (
            WHERE b.current_status = 'success' AND b.end_time <= b.job_expected_sla
        ) / NULLIF(COUNT(*), 0),
        2
    ) AS on_time_percentage,
    ROUND(AVG(b.delay_duration_minutes) FILTER (WHERE b.delay_duration_minutes > 0), 2) AS avg_delay_minutes,
    ROUND((SELECT AVG(d.dur_min) FROM with_duration d
           WHERE d.month_start = b.month_start)::numeric, 2) AS avg_duration_minutes,
    ROUND((SELECT PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY d.dur_min)
           FROM with_duration d WHERE d.month_start = b.month_start)::numeric, 2) AS p95_duration_minutes,
    ROUND(AVG(b.expected_duration_minutes)::numeric, 2) AS expected_duration_minutes
FROM base b
GROUP BY b.month_start
ORDER BY b.month_start
"""

# ── Duration Distribution ─────────────────────────────────────────────────────

DURATION_DISTRIBUTION = """
WITH duration_data AS (
    SELECT jls.observed_duration_seconds / 60.0 AS duration_minutes
    FROM job_live_state jls
    WHERE jls.job_id = :job_id
      AND jls.data_date >= CURRENT_DATE - INTERVAL '89 days'
      AND jls.data_date <= CURRENT_DATE
      AND jls.observed_duration_seconds IS NOT NULL
      AND jls.observed_duration_seconds > 0
)
SELECT
    FLOOR(duration_minutes / :bucket_size_minutes) * :bucket_size_minutes AS bucket_start,
    COUNT(*) AS count
FROM duration_data
GROUP BY FLOOR(duration_minutes / :bucket_size_minutes)
ORDER BY bucket_start
"""

# ── Trend Insights (current vs prior 90-day window) ───────────────────────────
# PERCENTILE_CONT used inside scalar subqueries so NULLs are pre-filtered
# in the WHERE clause — avoids the unsupported FILTER syntax on ordered-set aggs.

TREND_INSIGHTS = """
WITH current_base AS (
    SELECT
        jls.current_status,
        jls.end_time,
        jls.job_expected_sla,
        jls.failed_count_marker,
        jls.observed_duration_seconds
    FROM (
        SELECT
            current_status,
            end_time,
            job_expected_sla,
            NULL::int AS failed_count_marker,
            observed_duration_seconds
        FROM job_live_state
        WHERE job_id = :job_id
          AND data_date >= CURRENT_DATE - INTERVAL '89 days'
          AND data_date <= CURRENT_DATE
    ) jls
),
previous_base AS (
    SELECT
        current_status,
        end_time,
        job_expected_sla,
        observed_duration_seconds
    FROM job_live_state
    WHERE job_id = :job_id
      AND data_date >= CURRENT_DATE - INTERVAL '179 days'
      AND data_date <  CURRENT_DATE - INTERVAL '89 days'
),
current_dur AS (
    SELECT observed_duration_seconds / 60.0 AS dur_min
    FROM job_live_state
    WHERE job_id = :job_id
      AND data_date >= CURRENT_DATE - INTERVAL '89 days'
      AND data_date <= CURRENT_DATE
      AND observed_duration_seconds IS NOT NULL
),
previous_dur AS (
    SELECT observed_duration_seconds / 60.0 AS dur_min
    FROM job_live_state
    WHERE job_id = :job_id
      AND data_date >= CURRENT_DATE - INTERVAL '179 days'
      AND data_date <  CURRENT_DATE - INTERVAL '89 days'
      AND observed_duration_seconds IS NOT NULL
),
day_stats AS (
    SELECT
        EXTRACT(DOW FROM data_date)::int AS day_of_week,
        COUNT(*) AS total,
        COUNT(*) FILTER (
            WHERE current_status = 'success' AND end_time > job_expected_sla
        ) AS late_count
    FROM job_live_state
    WHERE job_id = :job_id
      AND data_date >= CURRENT_DATE - INTERVAL '89 days'
      AND data_date <= CURRENT_DATE
    GROUP BY EXTRACT(DOW FROM data_date)
)
SELECT
    -- current period aggregates
    COUNT(*)                                                                  AS current_total_runs,
    COUNT(*) FILTER (WHERE current_status = 'success' AND end_time <= job_expected_sla)
                                                                              AS current_on_time_count,
    COUNT(*) FILTER (WHERE current_status = 'success' AND end_time > job_expected_sla)
                                                                              AS current_late_count,
    COUNT(*) FILTER (WHERE current_status = 'failed')                        AS current_failed_count,
    ROUND((SELECT AVG(dur_min)                  FROM current_dur)::numeric, 2)        AS current_avg_duration,
    ROUND((SELECT PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY dur_min)
                                                FROM current_dur)::numeric, 2)        AS current_p95_duration,
    CASE WHEN COUNT(*) > 0
        THEN ROUND(100.0 * COUNT(*) FILTER (
                 WHERE current_status = 'success' AND end_time <= job_expected_sla
             ) / COUNT(*), 2)
    END                                                                       AS current_on_time_pct,

    -- previous period aggregates (joined via scalar subquery)
    (SELECT COUNT(*)               FROM previous_base)                        AS previous_total_runs,
    (SELECT COUNT(*) FILTER (WHERE current_status = 'success' AND end_time <= job_expected_sla)
                                   FROM previous_base)                        AS previous_on_time_count,
    (SELECT COUNT(*) FILTER (WHERE current_status = 'success' AND end_time > job_expected_sla)
                                   FROM previous_base)                        AS previous_late_count,
    (SELECT COUNT(*) FILTER (WHERE current_status = 'failed')
                                   FROM previous_base)                        AS previous_failed_count,
    ROUND((SELECT AVG(dur_min)     FROM previous_dur)::numeric, 2)                    AS previous_avg_duration,
    ROUND((SELECT PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY dur_min)
                                        FROM previous_dur)::numeric, 2)               AS previous_p95_duration,
    CASE WHEN (SELECT COUNT(*) FROM previous_base) > 0
        THEN ROUND(100.0 * (SELECT COUNT(*) FILTER (
                 WHERE current_status = 'success' AND end_time <= job_expected_sla
             ) FROM previous_base)
             / (SELECT COUNT(*) FROM previous_base), 2)
    END                                                                       AS previous_on_time_pct,

    -- worst day of week
    (SELECT day_of_week FROM day_stats
     ORDER BY (late_count::float / NULLIF(total, 0)) DESC NULLS LAST LIMIT 1) AS worst_day,
    (SELECT ROUND(100.0 * late_count / NULLIF(total, 0), 2) FROM day_stats
     ORDER BY (late_count::float / NULLIF(total, 0)) DESC NULLS LAST LIMIT 1) AS worst_day_late_pct

FROM current_base
"""

# ── Day-of-Week SLA Bars ───────────────────────────────────────────────────────
# NEW: For the grouped bar chart — one bar group per day of week.
# expected_sla_minutes = avg expected SLA time (minutes from midnight)
# actual_end_minutes   = avg actual end time (minutes from midnight)
# breach_count         = number of runs that ended after SLA
# total_runs           = total runs on that day in the window
# most_recent_date     = most recent data_date on that weekday (for display)
# occurrence_count     = number of distinct dates for that weekday in the window

DAY_OF_WEEK_SLA_BARS = """
SELECT
    EXTRACT(DOW FROM jls.data_date)::int AS day_of_week,
    COUNT(*) AS total_runs,
    COUNT(DISTINCT jls.data_date) AS occurrence_count,
    MAX(jls.data_date) AS most_recent_date,
    COUNT(*) FILTER (
        WHERE jls.current_status = 'success' AND jls.end_time > jls.job_expected_sla
    ) AS breach_count,
    COUNT(*) FILTER (
        WHERE jls.current_status = 'success' AND jls.end_time <= jls.job_expected_sla
    ) AS on_time_count,
    COUNT(*) FILTER (WHERE jls.current_status = 'failed') AS failed_count,
    -- Average expected start time as minutes from midnight
    ROUND(
        AVG(
            EXTRACT(HOUR FROM jls.expected_start_time) * 60
            + EXTRACT(MINUTE FROM jls.expected_start_time)
        ) FILTER (WHERE jls.expected_start_time IS NOT NULL),
        1
    ) AS expected_start_minutes,
    -- Average actual start time as minutes from midnight
    ROUND(
        AVG(
            EXTRACT(HOUR FROM jls.start_time) * 60
            + EXTRACT(MINUTE FROM jls.start_time)
        ) FILTER (WHERE jls.start_time IS NOT NULL),
        1
    ) AS actual_start_minutes,
    -- Average expected SLA time as minutes from midnight
    ROUND(
        AVG(
            EXTRACT(HOUR FROM jls.job_expected_sla) * 60
            + EXTRACT(MINUTE FROM jls.job_expected_sla)
        ) FILTER (WHERE jls.job_expected_sla IS NOT NULL),
        1
    ) AS expected_sla_minutes,
    -- Average actual end time as minutes from midnight
    ROUND(
        AVG(
            EXTRACT(HOUR FROM jls.end_time) * 60
            + EXTRACT(MINUTE FROM jls.end_time)
        ) FILTER (WHERE jls.end_time IS NOT NULL),
        1
    ) AS actual_end_minutes,
    -- Average delay in minutes (late runs only)
    ROUND(
        AVG(jls.delay_duration_minutes)
        FILTER (WHERE jls.delay_duration_minutes > 0),
        1
    ) AS avg_delay_minutes,
    -- On-time rate as percentage
    ROUND(
        100.0 * COUNT(*) FILTER (
            WHERE jls.current_status = 'success' AND jls.end_time <= jls.job_expected_sla
        ) / NULLIF(COUNT(*), 0),
        1
    ) AS on_time_percentage
FROM job_live_state jls
WHERE jls.job_id = :job_id
  AND jls.data_date >= CURRENT_DATE - INTERVAL '89 days'
  AND jls.data_date <= CURRENT_DATE
GROUP BY EXTRACT(DOW FROM jls.data_date)
ORDER BY
    CASE EXTRACT(DOW FROM jls.data_date)::int
        WHEN 1 THEN 1 WHEN 2 THEN 2 WHEN 3 THEN 3
        WHEN 4 THEN 4 WHEN 5 THEN 5 WHEN 6 THEN 6
        WHEN 0 THEN 7
    END
"""

# ── Daily SLA Bars ────────────────────────────────────────────────────────────
# "By Week" view — one bar per calendar day, no week grouping.
# Shows the full 90-day timeline so you can see each day's run window.

WEEKLY_SLA_BARS = """
SELECT
    jls.data_date,
    jls.current_status,
    CASE
        WHEN jls.current_status = 'success'
             AND jls.end_time > jls.job_expected_sla THEN 1
        ELSE 0
    END AS breach_count,
    CASE
        WHEN jls.current_status = 'success'
             AND jls.end_time <= jls.job_expected_sla THEN 1
        ELSE 0
    END AS on_time_count,
    CASE WHEN jls.current_status = 'failed' THEN 1 ELSE 0 END AS failed_count,
    CASE WHEN jls.expected_start_time IS NOT NULL
        THEN ROUND((
            EXTRACT(HOUR FROM jls.expected_start_time) * 60
            + EXTRACT(MINUTE FROM jls.expected_start_time)
        )::numeric, 1)
    END AS expected_start_minutes,
    CASE WHEN jls.start_time IS NOT NULL
        THEN ROUND((
            EXTRACT(HOUR FROM jls.start_time) * 60
            + EXTRACT(MINUTE FROM jls.start_time)
        )::numeric, 1)
    END AS actual_start_minutes,
    CASE WHEN jls.job_expected_sla IS NOT NULL
        THEN ROUND((
            EXTRACT(HOUR FROM jls.job_expected_sla) * 60
            + EXTRACT(MINUTE FROM jls.job_expected_sla)
        )::numeric, 1)
    END AS expected_sla_minutes,
    CASE WHEN jls.end_time IS NOT NULL
        THEN ROUND((
            EXTRACT(HOUR FROM jls.end_time) * 60
            + EXTRACT(MINUTE FROM jls.end_time)
        )::numeric, 1)
    END AS actual_end_minutes,
    jls.delay_duration_minutes AS avg_delay_minutes,
    CASE
        WHEN jls.current_status = 'success'
             AND jls.end_time <= jls.job_expected_sla THEN 100.0
        WHEN jls.current_status = 'success'
             AND jls.end_time > jls.job_expected_sla  THEN 0.0
        ELSE NULL
    END AS on_time_percentage
FROM job_live_state jls
WHERE jls.job_id = :job_id
  AND jls.data_date >= CURRENT_DATE - INTERVAL '89 days'
  AND jls.data_date <= CURRENT_DATE
ORDER BY jls.data_date, jls.client_name
"""

# ── Daily SLA Deviation Timeline ──────────────────────────────────────────────

DAILY_SLA_TIMELINE = """
SELECT
    jls.data_date,
    EXTRACT(HOUR FROM jls.job_expected_sla) * 60
        + EXTRACT(MINUTE FROM jls.job_expected_sla) AS expected_sla_minutes,
    EXTRACT(HOUR FROM jls.end_time) * 60
        + EXTRACT(MINUTE FROM jls.end_time)         AS actual_end_minutes,
    EXTRACT(EPOCH FROM (jls.end_time - jls.job_expected_sla)) / 60.0 AS deviation_minutes,
    jls.current_status,
    jls.delay_status,
    jls.delay_duration_minutes
FROM job_live_state jls
WHERE jls.job_id = :job_id
  AND jls.data_date >= CURRENT_DATE - INTERVAL '89 days'
  AND jls.data_date <= CURRENT_DATE
  AND jls.job_expected_sla IS NOT NULL
  AND jls.end_time IS NOT NULL
ORDER BY jls.data_date
"""

# ── Day-of-Week Delay Analysis ────────────────────────────────────────────────

DAY_OF_WEEK_DELAY_STATS = """
SELECT
    EXTRACT(DOW FROM jls.data_date)::int AS day_of_week,
    COUNT(*) AS total_runs,
    COUNT(*) FILTER (
        WHERE jls.current_status = 'success' AND jls.end_time > jls.job_expected_sla
    ) AS late_count,
    COUNT(*) FILTER (WHERE jls.current_status = 'failed') AS failed_count,
    ROUND(
        100.0 * COUNT(*) FILTER (
            WHERE jls.current_status = 'success' AND jls.end_time > jls.job_expected_sla
        ) / NULLIF(COUNT(*), 0),
        2
    ) AS late_percentage,
    ROUND(
        (AVG(jls.observed_duration_seconds) / 60.0)::numeric,
        2
    ) AS avg_duration_minutes
FROM job_live_state jls
WHERE jls.job_id = :job_id
  AND jls.data_date >= CURRENT_DATE - INTERVAL '89 days'
  AND jls.data_date <= CURRENT_DATE
GROUP BY EXTRACT(DOW FROM jls.data_date)
ORDER BY
    CASE EXTRACT(DOW FROM jls.data_date)::int
        WHEN 1 THEN 1 WHEN 2 THEN 2 WHEN 3 THEN 3
        WHEN 4 THEN 4 WHEN 5 THEN 5 WHEN 6 THEN 6
        WHEN 0 THEN 7
    END
"""
