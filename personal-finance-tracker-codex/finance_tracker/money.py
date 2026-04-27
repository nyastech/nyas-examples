from __future__ import annotations

from decimal import Decimal, InvalidOperation, ROUND_HALF_UP


def parse_amount_cents(raw: str) -> int:
    """Parse user-entered money into cents without floating point drift."""
    try:
        amount = Decimal(raw.strip())
    except InvalidOperation as exc:
        raise ValueError("Enter a valid amount.") from exc

    if amount <= 0:
        raise ValueError("Amount must be greater than zero.")

    cents = (amount * 100).quantize(Decimal("1"), rounding=ROUND_HALF_UP)
    return int(cents)


def format_money(cents: int, currency_symbol: str = "$") -> str:
    sign = "-" if cents < 0 else ""
    absolute = abs(cents)
    dollars, remainder = divmod(absolute, 100)
    return f"{sign}{currency_symbol}{dollars:,}.{remainder:02d}"

