from typing import Optional

from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel, field_validator

from app.config import settings
from app.models.user import User
from app.routers.auth import get_current_user, limiter
from app.services.validators import validate_identifier, validate_operation

router = APIRouter(prefix="/api/ai", tags=["ai"])


class AnalyzeRequest(BaseModel):
    operation: str
    table_name: str
    columns: list[str]
    row_count: int
    db_type: str
    sample_data: Optional[list[dict]] = None

    @field_validator("operation")
    @classmethod
    def check_op(cls, v: str) -> str:
        return validate_operation(v)

    @field_validator("table_name")
    @classmethod
    def check_table(cls, v: str) -> str:
        return validate_identifier(v, "table name")

    @field_validator("row_count")
    @classmethod
    def check_rows(cls, v: int) -> int:
        if v < 0 or v > 100_000_000:
            raise ValueError("Invalid row count")
        return v

    @field_validator("columns")
    @classmethod
    def check_cols(cls, v: list[str]) -> list[str]:
        if len(v) > 500:
            raise ValueError("Too many columns")
        for c in v:
            validate_identifier(c, "column")
        return v


@router.post("/analyze")
@limiter.limit("20/minute")
async def analyze_query(request: Request, body: AnalyzeRequest, user: User = Depends(get_current_user)):
    """AI-powered query analysis: optimization, risk, cost estimation."""
    if not settings.OPENAI_API_KEY:
        return _stub_analysis(body)

    try:
        import httpx

        prompt = _build_prompt(body)
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                "https://api.openai.com/v1/chat/completions",
                headers={"Authorization": f"Bearer {settings.OPENAI_API_KEY}"},
                json={
                    "model": "gpt-4o-mini",
                    "messages": [
                        {
                            "role": "system",
                            "content": (
                                "You are a database expert. Analyze the proposed query and provide: "
                                "1) Risk assessment 2) Optimization suggestions "
                                "3) Estimated cost/time 4) Potential issues. Be concise."
                            ),
                        },
                        {"role": "user", "content": prompt},
                    ],
                    "max_tokens": 500,
                },
                timeout=30,
            )
        data = resp.json()
        analysis = data["choices"][0]["message"]["content"]
        return {"analysis": analysis, "source": "ai"}
    except Exception as e:
        return {**_stub_analysis(body), "ai_error": str(e)}


def _build_prompt(body: AnalyzeRequest) -> str:
    sample = ""
    if body.sample_data:
        sample = f"\nSample data (first 3 rows): {body.sample_data[:3]}"
    return (
        f"I'm about to run a {body.operation} on table '{body.table_name}' "
        f"in a {body.db_type} database.\n"
        f"Columns: {', '.join(body.columns)}\n"
        f"Row count: {body.row_count}{sample}\n\n"
        f"Analyze this operation for risks, optimization, and estimated cost."
    )


def _stub_analysis(body: AnalyzeRequest) -> dict:
    """Basic rule-based analysis when no AI key is configured."""
    warnings = []
    tips = []

    if body.row_count > 100000:
        warnings.append("Large batch — consider chunking into batches of 10k-50k rows.")
    if body.row_count > 1000000:
        warnings.append("Very large dataset — this may take significant time and lock the table.")
    if body.operation == "UPDATE":
        warnings.append("UPDATE operations can be expensive. Ensure you have proper WHERE clauses.")
    if body.operation == "INSERT":
        tips.append("Consider using bulk insert / COPY for better performance.")
    if not warnings:
        warnings.append("No major risks detected.")
    if not tips:
        tips.append("Operation looks straightforward.")

    return {
        "analysis": f"**Warnings:** {'; '.join(warnings)}\n\n**Tips:** {'; '.join(tips)}",
        "source": "rule-based",
    }
