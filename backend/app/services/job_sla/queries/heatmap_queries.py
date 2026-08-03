"""
Heatmap and trend analysis queries for Job SLA Analyzer.

All queries use a fixed 90-day rolling window (CURRENT_DATE - 89 days → CURRENT_DATE)
computed directly in SQL — no date parameters are passed from the application layer.

Tables used:
- job_live_state: Current runtime state per job/data_date/client
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
    ROUND(AVG(jls.observed_duration_seconds / 60.0), 2) AS avg_duration_minutes
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

WEEKLY_TREND = """
SELECT
    DATE_TRUNC('week', jls.data_date)::date AS week_start,
    COUNT(*) AS total_runs,
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
    ROUND(
        100.0 * COUNT(*) FILTER (
            WHERE jls.current_status = 'success'
              AND jls.end_time <= jls.job_expected_sla
        ) / NULLIF(COUNT(*), 0),
        2
    ) AS on_time_percentage,
    ROUND(
        AVG(jls.delay_duration_minutes) FILTER (WHERE jls.delay_duration_minutes > 0),
        2
    ) AS avg_delay_minutes,
    ROUND(
        AVG(jls.observed_duration_seconds / 60.0)
        FILTER (WHERE jls.observed_duration_seconds IS NOT NULL),
        2
    ) AS avg_duration_minutes,
    ROUND(
        PERCENTILE_CONT(0.95) WITHIN GROUP (
            ORDER BY jls.observed_duration_seconds / 60.0
        ) FILTER (WHERE jls.observed_duration_seconds IS NOT NULL),
        2
    ) AS p95_duration_minutes,
    ROUND(AVG(jls.expected_duration_minutes), 2) AS expected_duration_minutes
FROM job_live_state jls
WHERE jls.job_id = :job_id
  AND jls.data_date >= CURRENT_DATE - INTERVAL '89 days'
  AND jls.data_date <= CURRENT_DATE
GROUP BY DATE_TRUNC('week', jls.data_date)
ORDER BY week_start
"""

# ── Monthly Trend Aggregation ─────────────────────────────────────────────────

MONTHLY_TREND = """
SELECT
    DATE_TRUNC('month', jls.data_date)::date AS month_start,
    COUNT(*) AS total_runs,
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
    ROUND(
        100.0 * COUNT(*) FILTER (
            WHERE jls.current_status = 'success'
              AND jls.end_time <= jls.job_expected_sla
        ) / NULLIF(COUNT(*), 0),
        2
    ) AS on_time_percentage,
    ROUND(
        AVG(jls.delay_duration_minutes) FILTER (WHERE jls.delay_duration_minutes > 0),
        2
    ) AS avg_delay_minutes,
    ROUND(
        AVG(jls.observed_duration_seconds / 60.0)
        FILTER (WHERE jls.observed_duration_seconds IS NOT NULL),
        2
    ) AS avg_duration_minutes,
    ROUND(
        PERCENTILE_CONT(0.95) WITHIN GROUP (
            ORDER BY jls.observed_duration_seconds / 60.0
        ) FILTER (WHERE jls.observed_duration_seconds IS NOT NULL),
        2
    ) AS p95_duration_minutes,
    ROUND(AVG(jls.expected_duration_minutes), 2) AS expected_duration_minutes
FROM job_live_state jls
WHERE jls.job_id = :job_id
  AND jls.data_date >= CURRENT_DATE - INTERVAL '89 days'
  AND jls.data_date <= CURRENT_DATE
GROUP BY DATE_TRUNC('month', jls.data_date)
ORDER BY month_start
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

# ── Trend Insights ────────────────────────────────────────────────────────────
# Compares current 90-day window against the prior 90-day window.
# Uses CROSS JOIN LATERAL with explicit row-constructor so both CTEs always
# return exactly one row — prevents the empty cross-join that caused 500 errors.

TREND_INSIGHTS = """
WITH current_period AS (
    SELECT
        COUNT(*) AS total_runs,
        COUNT(*) FILTER (
            WHERE jls.current_status = 'success'
              AND jls.end_time <= jls.job_expected_sla
        ) AS on_time_count,
        COUNT(*) FILTER (
            WHERE jls.current_status = 'success'
              AND jls.end_time > jls.job_expected_sla
        ) AS late_count,
        COUNT(*) FILTER (WHERE jls.current_status = 'failed') AS failed_count,
        ROUND(
            AVG(jls.observed_duration_seconds / 60.0)
            FILTER (WHERE jls.observed_duration_seconds IS NOT NULL),
            2
        ) AS avg_duration_minutes,
        ROUND(
            PERCENTILE_CONT(0.95) WITHIN GROUP (
                ORDER BY jls.observed_duration_seconds / 60.0
            ) FILTER (WHERE jls.observed_duration_seconds IS NOT NULL),
            2
        ) AS p95_duration_minutes
    FROM job_live_state jls
    WHERE jls.job_id = :job_id
      AND jls.data_date >= CURRENT_DATE - INTERVAL '89 days'
      AND jls.data_date <= CURRENT_DATE
),
previous_period AS (
    SELECT
        COUNT(*) AS total_runs,
        COUNT(*) FILTER (
            WHERE jls.current_status = 'success'
              AND jls.end_time <= jls.job_expected_sla
        ) AS on_time_count,
        COUNT(*) FILTER (
            WHERE jls.current_status = 'success'
              AND jls.end_time > jls.job_expected_sla
        ) AS late_count,
        COUNT(*) FILTER (WHERE jls.current_status = 'failed') AS failed_count,
        ROUND(
            AVG(jls.observed_duration_seconds / 60.0)
            FILTER (WHERE jls.observed_duration_seconds IS NOT NULL),
            2
        ) AS avg_duration_minutes,
        ROUND(
            PERCENTILE_CONT(0.95) WITHIN GROUP (
                ORDER BY jls.observed_duration_seconds / 60.0
            ) FILTER (WHERE jls.observed_duration_seconds IS NOT NULL),
            2
        ) AS p95_duration_minutes
    FROM job_live_state jls
    WHERE jls.job_id = :job_id
      AND jls.data_date >= CURRENT_DATE - INTERVAL '179 days'
      AND jls.data_date < CURRENT_DATE - INTERVAL '89 days'
),
day_stats AS (
    SELECT
        EXTRACT(DOW FROM jls.data_date)::int AS day_of_week,
        COUNT(*) AS total,
        COUNT(*) FILTER (
            WHERE jls.current_status = 'success'
              AND jls.end_time > jls.job_expected_sla
        ) AS late_count
    FROM job_live_state jls
    WHERE jls.job_id = :job_id
      AND jls.data_date >= CURRENT_DATE - INTERVAL '89 days'
      AND jls.data_date <= CURRENT_DATE
    GROUP BY EXTRACT(DOW FROM jls.data_date)
)
SELECT
    c.total_runs                  AS current_total_runs,
    c.on_time_count               AS current_on_time_count,
    c.late_count                  AS current_late_count,
    c.failed_count                AS current_failed_count,
    c.avg_duration_minutes        AS current_avg_duration,
    c.p95_duration_minutes        AS current_p95_duration,
    CASE WHEN c.total_runs > 0
        THEN ROUND(100.0 * c.on_time_count / c.total_runs, 2)
    END                           AS current_on_time_pct,
    p.total_runs                  AS previous_total_runs,
    p.on_time_count               AS previous_on_time_count,
    p.late_count                  AS previous_late_count,
    p.failed_count                AS previous_failed_count,
    p.avg_duration_minutes        AS previous_avg_duration,
    p.p95_duration_minutes        AS previous_p95_duration,
    CASE WHEN p.total_runs > 0
        THEN ROUND(100.0 * p.on_time_count / p.total_runs, 2)
    END                           AS previous_on_time_pct,
    (
        SELECT day_of_week FROM day_stats
        ORDER BY (late_count::float / NULLIF(total, 0)) DESC NULLS LAST
        LIMIT 1
    ) AS worst_day,
    (
        SELECT ROUND(100.0 * late_count / NULLIF(total, 0), 2) FROM day_stats
        ORDER BY (late_count::float / NULLIF(total, 0)) DESC NULLS LAST
        LIMIT 1
    ) AS worst_day_late_pct
FROM current_period c
CROSS JOIN previous_period p
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
        WHERE jls.current_status = 'success'
          AND jls.end_time > jls.job_expected_sla
    ) AS late_count,
    COUNT(*) FILTER (WHERE jls.current_status = 'failed') AS failed_count,
    ROUND(
        100.0 * COUNT(*) FILTER (
            WHERE jls.current_status = 'success'
              AND jls.end_time > jls.job_expected_sla
        ) / NULLIF(COUNT(*), 0),
        2
    ) AS late_percentage,
    ROUND(
        AVG(jls.observed_duration_seconds / 60.0)
        FILTER (WHERE jls.observed_duration_seconds IS NOT NULL),
        2
    ) AS avg_duration_minutes
FROM job_live_state jls
WHERE jls.job_id = :job_id
  AND jls.data_date >= CURRENT_DATE - INTERVAL '89 days'
  AND jls.data_date <= CURRENT_DATE
GROUP BY EXTRACT(DOW FROM jls.data_date)
ORDER BY day_of_week
"""
