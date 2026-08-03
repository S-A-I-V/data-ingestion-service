"""
Job SLA Analyzer service.

Provides comprehensive SLA analysis for jobs including:
- Standard job SLA compliance
- Artifact-based job tracking
- Proxy job inference rules
- SEV1 incident correlation
- Heatmap and trend analysis
"""

from app.services.job_sla.service import JobSlaService

__all__ = ["JobSlaService"]
