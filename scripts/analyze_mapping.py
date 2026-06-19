"""
analyze_mapping.py — Validates report_job_mapping CSV for edge consistency.

Usage:
  python3 scripts/analyze_mapping.py [path_to_csv]

If no path given, uses the embedded sample data.
CSV format: job_id, previous_job_ids, next_job_ids
"""

import csv
import io
import sys


def analyze(data_str: str):
    rows = list(csv.reader(io.StringIO(data_str)))

    next_map = {}
    prev_map = {}

    for row in rows:
        if len(row) < 3:
            continue
        job_id = row[0].strip()
        prev_ids = (
            [x.strip() for x in row[1].split(",") if x.strip()]
            if row[1].strip()
            else []
        )
        next_ids = (
            [x.strip() for x in row[2].split(",") if x.strip()]
            if row[2].strip()
            else []
        )
        next_map[job_id] = set(next_ids)
        prev_map[job_id] = set(prev_ids)

    print("=== MISSING BACKWARD REFS (A->B in next, but B does not list A in prev) ===")
    issues_fwd = []
    for job, nexts in sorted(next_map.items(), key=lambda x: int(x[0])):
        for n in sorted(nexts, key=lambda x: int(x)):
            if n not in prev_map:
                issues_fwd.append(f"  Job {job} -> {n}: job {n} NOT IN CSV")
            elif job not in prev_map[n]:
                issues_fwd.append(
                    f"  Job {job} -> {n}: job {n} prev={sorted(prev_map[n], key=int)} MISSING {job}"
                )

    if issues_fwd:
        for i in issues_fwd:
            print(i)
    else:
        print("  None")

    print()
    print(
        "=== MISSING FORWARD REFS (B lists A in prev, but A does not list B in next) ==="
    )
    issues_bwd = []
    for job, prevs in sorted(prev_map.items(), key=lambda x: int(x[0])):
        for p in sorted(prevs, key=lambda x: int(x)):
            if p not in next_map:
                issues_bwd.append(f"  Job {job} lists prev={p}: job {p} NOT IN CSV")
            elif job not in next_map[p]:
                issues_bwd.append(
                    f"  Job {job} lists prev={p}: job {p} next={sorted(next_map[p], key=int)} MISSING {job}"
                )

    if issues_bwd:
        for i in issues_bwd:
            print(i)
    else:
        print("  None")

    print()
    print("=== SELF-REFERENCES ===")
    found_self = False
    for job, nexts in sorted(next_map.items(), key=lambda x: int(x[0])):
        if job in nexts:
            print(f"  Job {job} points to ITSELF in next_job_ids")
            found_self = True
    if not found_self:
        print("  None")

    print()
    print("=== ORPHAN NODES (no prev AND no next) ===")
    found_orphan = False
    for job in sorted(set(next_map.keys()) | set(prev_map.keys()), key=int):
        has_next = bool(next_map.get(job))
        has_prev = bool(prev_map.get(job))
        if not has_next and not has_prev:
            print(f"  Job {job} is completely disconnected")
            found_orphan = True
    if not found_orphan:
        print("  None")

    print()
    total_issues = len(issues_fwd) + len(issues_bwd)
    print(f"=== SUMMARY: {total_issues} inconsistencies found ===")


if __name__ == "__main__":
    if len(sys.argv) > 1:
        with open(sys.argv[1]) as f:
            analyze(f.read())
    else:
        print("Usage: python3 scripts/analyze_mapping.py <path_to_csv>")
        print("CSV format: job_id, previous_job_ids, next_job_ids")
