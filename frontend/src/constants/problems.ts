import type { Problem } from "../types";

export const PROBLEMS: Problem[] = [
  {
    tag: "ETL",
    question: "Why can't teams ingest CSV data into databases without writing custom scripts every time?",
    description:
      "Engineering teams waste hours writing one-off scripts for every data import, leading to inconsistent pipelines and repeated effort.",
    severity: 82,
    tam: 9,
    frequency: 8,
    whitespace: 7.5,
    itch: 72,
    highlight: false,
  },
  {
    tag: "Infrastructure",
    question: "Why is connecting to remote databases through SSH tunnels still so painful and error-prone?",
    description:
      "Developers struggle with SSH tunnel configuration, key management, and connection timeouts when accessing production databases.",
    severity: 75,
    tam: 7,
    frequency: 6,
    whitespace: 8,
    itch: 65,
    highlight: true,
  },
  {
    tag: "Data Quality",
    question: "Why do column type mismatches cause silent data corruption during bulk imports?",
    description:
      "Type coercion failures go undetected during ingestion, corrupting downstream analytics and reporting.",
    severity: 88,
    tam: 8,
    frequency: 7,
    whitespace: 9,
    itch: 78,
    highlight: false,
  },
  {
    tag: "Security",
    question: "Why can't organizations track who ingested what data and when with a full audit trail?",
    description:
      "Lack of audit logging makes compliance impossible and leaves teams blind to unauthorized data changes.",
    severity: 79,
    tam: 8,
    frequency: 5,
    whitespace: 8.5,
    itch: 68,
    highlight: true,
  },
  {
    tag: "Scalability",
    question: "Why is ingesting millions of rows still unreliable and crashes halfway through?",
    description:
      "Bulk insert operations fail silently or timeout on large datasets, requiring manual retry and data reconciliation.",
    severity: 85,
    tam: 9,
    frequency: 7,
    whitespace: 7,
    itch: 74,
    highlight: false,
  },
  {
    tag: "Multi-DB",
    question: "Why do teams need different tools for PostgreSQL, MySQL, ClickHouse and other databases?",
    description:
      "Each database engine requires its own tooling, forcing teams to maintain multiple ingestion workflows.",
    severity: 77,
    tam: 9,
    frequency: 8,
    whitespace: 8.5,
    itch: 71,
    highlight: false,
  },
  {
    tag: "Mapping",
    question: "Why is mapping CSV columns to database schemas still a manual, repetitive process?",
    description:
      "Column mapping is tedious and error-prone, especially when CSV headers don't match database column names.",
    severity: 73,
    tam: 8,
    frequency: 9,
    whitespace: 7,
    itch: 66,
    highlight: false,
  },
  {
    tag: "AI",
    question: "Why can't developers get instant AI-powered analysis of their data before ingesting it?",
    description:
      "Teams ingest data blindly without understanding quality issues, schema conflicts, or optimization opportunities.",
    severity: 70,
    tam: 7,
    frequency: 4,
    whitespace: 9.5,
    itch: 62,
    highlight: true,
  },
  {
    tag: "Validation",
    question: "Why is there no easy way to validate and preview data before committing it to production tables?",
    description:
      "Teams push data into production without previewing results, leading to rollbacks and downstream failures.",
    severity: 80,
    tam: 8,
    frequency: 7,
    whitespace: 8,
    itch: 70,
    highlight: true,
  },
  {
    tag: "Automation",
    question: "Why can't recurring data imports be scheduled and monitored without building custom pipelines?",
    description:
      "Every repeated import requires manual intervention, wasting engineering time on tasks that should be automated.",
    severity: 76,
    tam: 8,
    frequency: 8,
    whitespace: 7.5,
    itch: 67,
    highlight: false,
  },
];
