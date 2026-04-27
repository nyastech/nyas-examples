from __future__ import annotations

import unittest
from pathlib import Path

from finance_tracker.dates import month_bounds, parse_local_date
from finance_tracker.money import parse_amount_cents
from finance_tracker.store import FinanceStore


class FinanceStoreTests(unittest.TestCase):
    def setUp(self) -> None:
        self.db_path = Path("tmp/test-finance.db")
        self.db_path.parent.mkdir(exist_ok=True)
        self.db_path.unlink(missing_ok=True)
        self.store = FinanceStore(f"sqlite:///{self.db_path}")
        self.store.init_schema()

    def tearDown(self) -> None:
        self.db_path.unlink(missing_ok=True)

    def test_monthly_summary_separates_income_and_expenses(self) -> None:
        self.store.add_transaction("income", 250000, "Salary", "", parse_local_date("2026-04-05"))
        self.store.add_transaction("expense", 8500, "Groceries", "market", parse_local_date("2026-04-06"))
        self.store.add_transaction("expense", 1500, "Groceries", "", parse_local_date("2026-04-07"))
        self.store.add_transaction("expense", 12000, "Rent", "", parse_local_date("2026-04-08"))

        summary = self.store.monthly_summary("2026-04")

        self.assertEqual(summary.income_cents, 250000)
        self.assertEqual(summary.expense_cents, 22000)
        self.assertEqual(summary.net_cents, 228000)
        self.assertEqual(summary.transaction_count, 4)
        self.assertEqual([(item.category, item.amount_cents) for item in summary.expense_categories], [("Rent", 12000), ("Groceries", 10000)])

    def test_transactions_are_filtered_by_month_epoch_bounds(self) -> None:
        self.store.add_transaction("income", 10000, "Salary", "", parse_local_date("2026-03-31"))
        self.store.add_transaction("expense", 2500, "Dining", "", parse_local_date("2026-04-01"))

        transactions = self.store.list_transactions("2026-04")

        self.assertEqual(len(transactions), 1)
        self.assertEqual(transactions[0].category, "Dining")


class ParsingTests(unittest.TestCase):
    def test_amount_parsing_uses_cents(self) -> None:
        self.assertEqual(parse_amount_cents("12.345"), 1235)

    def test_month_bounds_are_ordered(self) -> None:
        start, end = month_bounds("2026-04")
        self.assertLess(start, end)


if __name__ == "__main__":
    unittest.main()

