from __future__ import annotations

from datetime import date, datetime, time


def current_month() -> str:
    return date.today().strftime("%Y-%m")


def parse_local_date(raw: str) -> int:
    """Store date-only form input as epoch seconds for backend consistency."""
    try:
        value = date.fromisoformat(raw.strip())
    except ValueError as exc:
        raise ValueError("Enter a valid date.") from exc

    local_midnight = datetime.combine(value, time.min).astimezone()
    return int(local_midnight.timestamp())


def month_bounds(raw_month: str) -> tuple[int, int]:
    try:
        year_text, month_text = raw_month.strip().split("-", 1)
        year = int(year_text)
        month = int(month_text)
        first = date(year, month, 1)
    except ValueError as exc:
        raise ValueError("Enter a valid month.") from exc

    if month == 12:
        next_month = date(year + 1, 1, 1)
    else:
        next_month = date(year, month + 1, 1)

    start = datetime.combine(first, time.min).astimezone()
    end = datetime.combine(next_month, time.min).astimezone()
    return int(start.timestamp()), int(end.timestamp())

