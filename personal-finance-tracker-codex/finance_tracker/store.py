from __future__ import annotations

import os
import sqlite3
from contextlib import contextmanager
from dataclasses import dataclass
from typing import Any, Iterator
from urllib.parse import urlparse

from .dates import current_month, month_bounds


VALID_KINDS = {"income", "expense"}


@dataclass(frozen=True)
class Transaction:
    id: int
    kind: str
    amount_cents: int
    category: str
    note: str
    occurred_at: int
    created_at: int


@dataclass(frozen=True)
class CategoryTotal:
    category: str
    amount_cents: int


@dataclass(frozen=True)
class MonthlySummary:
    income_cents: int
    expense_cents: int
    net_cents: int
    transaction_count: int
    expense_categories: list[CategoryTotal]


class FinanceStore:
    def __init__(self, database_url: str | None = None) -> None:
        self.database_url = database_url or os.getenv("DATABASE_URL") or "sqlite:///finance.db"
        self.driver = _driver_for(self.database_url)
        self.placeholder = "%s" if self.driver == "postgres" else "?"

    def init_schema(self) -> None:
        identity = "BIGSERIAL PRIMARY KEY" if self.driver == "postgres" else "INTEGER PRIMARY KEY AUTOINCREMENT"
        sql = f"""
            CREATE TABLE IF NOT EXISTS transactions (
                id {identity},
                kind TEXT NOT NULL CHECK (kind IN ('income', 'expense')),
                amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
                category TEXT NOT NULL,
                note TEXT NOT NULL DEFAULT '',
                occurred_at BIGINT NOT NULL,
                created_at BIGINT NOT NULL DEFAULT {self._epoch_now_sql()}
            )
        """
        with self.connection() as conn:
            conn.execute(sql)
            conn.execute("CREATE INDEX IF NOT EXISTS idx_transactions_month ON transactions (occurred_at)")

    def add_transaction(self, kind: str, amount_cents: int, category: str, note: str, occurred_at: int) -> None:
        if kind not in VALID_KINDS:
            raise ValueError("Choose income or expense.")
        if amount_cents <= 0:
            raise ValueError("Amount must be greater than zero.")
        if not category.strip():
            raise ValueError("Category is required.")

        sql = """
            INSERT INTO transactions (kind, amount_cents, category, note, occurred_at)
            VALUES ({0}, {0}, {0}, {0}, {0})
        """.format(self.placeholder)
        values = (kind, amount_cents, category.strip()[:80], note.strip()[:240], occurred_at)
        with self.connection() as conn:
            conn.execute(sql, values)

    def delete_transaction(self, transaction_id: int) -> None:
        sql = f"DELETE FROM transactions WHERE id = {self.placeholder}"
        with self.connection() as conn:
            conn.execute(sql, (transaction_id,))

    def list_transactions(self, month: str | None = None) -> list[Transaction]:
        start, end = month_bounds(month or current_month())
        sql = f"""
            SELECT id, kind, amount_cents, category, note, occurred_at, created_at
            FROM transactions
            WHERE occurred_at >= {self.placeholder} AND occurred_at < {self.placeholder}
            ORDER BY occurred_at DESC, id DESC
        """
        with self.connection() as conn:
            rows = conn.execute(sql, (start, end)).fetchall()
        return [_transaction_from_row(row) for row in rows]

    def monthly_summary(self, month: str | None = None) -> MonthlySummary:
        transactions = self.list_transactions(month)
        income = sum(item.amount_cents for item in transactions if item.kind == "income")
        expenses = [item for item in transactions if item.kind == "expense"]
        expense_total = sum(item.amount_cents for item in expenses)
        categories = _expense_category_totals(expenses)
        return MonthlySummary(income, expense_total, income - expense_total, len(transactions), categories)

    @contextmanager
    def connection(self) -> Iterator[Any]:
        conn = self._connect()
        try:
            yield conn
            conn.commit()
        finally:
            conn.close()

    def _connect(self) -> Any:
        if self.driver == "postgres":
            import psycopg
            from psycopg.rows import dict_row

            return psycopg.connect(self.database_url, row_factory=dict_row)

        conn = sqlite3.connect(_sqlite_path(self.database_url))
        conn.row_factory = sqlite3.Row
        return conn

    def _epoch_now_sql(self) -> str:
        if self.driver == "postgres":
            return "(EXTRACT(EPOCH FROM NOW())::BIGINT)"
        return "(strftime('%s', 'now'))"


def _driver_for(database_url: str) -> str:
    scheme = urlparse(database_url).scheme
    if scheme in {"postgres", "postgresql"}:
        return "postgres"
    if scheme in {"sqlite", ""}:
        return "sqlite"
    raise ValueError("DATABASE_URL must be a sqlite or postgres URL.")


def _sqlite_path(database_url: str) -> str:
    if database_url == "sqlite:///:memory:":
        return ":memory:"
    parsed = urlparse(database_url)
    if parsed.scheme == "":
        return database_url
    if parsed.scheme != "sqlite":
        raise ValueError("Expected a sqlite URL.")
    return parsed.path.lstrip("/") or "finance.db"


def _transaction_from_row(row: Any) -> Transaction:
    return Transaction(
        id=row["id"],
        kind=row["kind"],
        amount_cents=row["amount_cents"],
        category=row["category"],
        note=row["note"],
        occurred_at=row["occurred_at"],
        created_at=row["created_at"],
    )


def _expense_category_totals(transactions: list[Transaction]) -> list[CategoryTotal]:
    totals: dict[str, int] = {}
    for item in transactions:
        totals[item.category] = totals.get(item.category, 0) + item.amount_cents
    ordered = sorted(totals.items(), key=lambda pair: (-pair[1], pair[0].lower()))
    return [CategoryTotal(category, amount) for category, amount in ordered]
