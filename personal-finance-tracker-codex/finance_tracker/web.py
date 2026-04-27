from __future__ import annotations

import html
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, quote, urlparse

from .dates import current_month, parse_local_date
from .money import format_money, parse_amount_cents
from .store import FinanceStore, Transaction


DEFAULT_CATEGORIES = ("Groceries", "Housing", "Transport", "Utilities", "Dining", "Health", "Income", "Other")


class FinanceHandler(BaseHTTPRequestHandler):
    store: FinanceStore

    def do_GET(self) -> None:
        path = urlparse(self.path)
        if path.path == "/":
            self._render_home(path.query)
            return
        if path.path == "/healthz":
            self._send_text("ok")
            return
        self._send_text("Not found", HTTPStatus.NOT_FOUND)

    def do_HEAD(self) -> None:
        path = urlparse(self.path)
        if path.path in {"/", "/healthz"}:
            self.send_response(HTTPStatus.OK)
            self.end_headers()
            return
        self.send_response(HTTPStatus.NOT_FOUND)
        self.end_headers()

    def do_POST(self) -> None:
        path = urlparse(self.path)
        if path.path == "/transactions":
            self._create_transaction()
            return
        if path.path.startswith("/transactions/") and path.path.endswith("/delete"):
            self._delete_transaction(path.path)
            return
        self._send_text("Not found", HTTPStatus.NOT_FOUND)

    def log_message(self, format: str, *args: object) -> None:
        return

    def _render_home(self, query: str) -> None:
        params = parse_qs(query)
        month = params.get("month", [current_month()])[0]
        message = params.get("message", [""])[0]
        error = params.get("error", [""])[0]
        try:
            summary = self.store.monthly_summary(month)
            transactions = self.store.list_transactions(month)
            body = render_page(month, summary, transactions, message, error)
            self._send_html(body)
        except ValueError as exc:
            body = render_page(current_month(), self.store.monthly_summary(), [], "", str(exc))
            self._send_html(body, HTTPStatus.BAD_REQUEST)

    def _create_transaction(self) -> None:
        form = self._read_form()
        month = form.get("month", current_month())
        try:
            self.store.add_transaction(
                kind=form.get("kind", ""),
                amount_cents=parse_amount_cents(form.get("amount", "")),
                category=form.get("category", ""),
                note=form.get("note", ""),
                occurred_at=parse_local_date(form.get("occurred_on", "")),
            )
            self._redirect(f"/?month={quote(month)}&message=Transaction+saved")
        except ValueError as exc:
            self._redirect(f"/?month={quote(month)}&error={quote(str(exc))}")

    def _delete_transaction(self, path: str) -> None:
        form = self._read_form()
        try:
            transaction_id = int(path.split("/")[2])
            self.store.delete_transaction(transaction_id)
            self._redirect(f"/?month={quote(form.get('month', current_month()))}&message=Transaction+deleted")
        except ValueError:
            self._redirect(f"/?month={quote(form.get('month', current_month()))}&error=Invalid+transaction")

    def _read_form(self) -> dict[str, str]:
        length = int(self.headers.get("Content-Length", "0"))
        raw = self.rfile.read(length).decode("utf-8")
        return {key: values[0] for key, values in parse_qs(raw, keep_blank_values=True).items()}

    def _redirect(self, location: str) -> None:
        self.send_response(HTTPStatus.SEE_OTHER)
        self.send_header("Location", location)
        self.end_headers()

    def _send_html(self, body: str, status: HTTPStatus = HTTPStatus.OK) -> None:
        payload = body.encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Content-Length", str(len(payload)))
        self.end_headers()
        self.wfile.write(payload)

    def _send_text(self, body: str, status: HTTPStatus = HTTPStatus.OK) -> None:
        payload = body.encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "text/plain; charset=utf-8")
        self.send_header("Content-Length", str(len(payload)))
        self.end_headers()
        self.wfile.write(payload)


def run_server(host: str, port: int, database_url: str | None = None) -> None:
    store = FinanceStore(database_url)
    store.init_schema()
    handler = type("ConfiguredFinanceHandler", (FinanceHandler,), {"store": store})
    server = ThreadingHTTPServer((host, port), handler)
    print(f"Serving Personal Finance Tracker at http://{host}:{port}")
    server.serve_forever()


def render_page(month: str, summary: object, transactions: list[Transaction], message: str, error: str) -> str:
    rows = "\n".join(_transaction_row(item, month) for item in transactions)
    categories = "\n".join(_category_row(item.category, item.amount_cents) for item in summary.expense_categories)
    return PAGE_TEMPLATE.format(
        month=html.escape(month),
        today=current_month_date(),
        message=_notice(message, "success"),
        error=_notice(error, "error"),
        income=format_money(summary.income_cents),
        expenses=format_money(summary.expense_cents),
        net=format_money(summary.net_cents),
        count=summary.transaction_count,
        rows=rows or EMPTY_TRANSACTIONS,
        categories=categories or EMPTY_CATEGORIES,
        category_options=_category_options(),
        css=CSS,
        js=JS,
    )


def current_month_date() -> str:
    return current_month() + "-01"


def _notice(text: str, kind: str) -> str:
    if not text:
        return ""
    return f'<p class="notice notice-{kind}">{html.escape(text)}</p>'


def _category_options() -> str:
    return "\n".join(f'<option value="{html.escape(value)}">{html.escape(value)}</option>' for value in DEFAULT_CATEGORIES)


def _transaction_row(item: Transaction, month: str) -> str:
    signed = item.amount_cents if item.kind == "income" else -item.amount_cents
    return f"""
        <tr>
          <td><time class="js-local-date" data-epoch-ms="{item.occurred_at * 1000}"></time></td>
          <td><span class="pill pill-{html.escape(item.kind)}">{html.escape(item.kind.title())}</span></td>
          <td>{html.escape(item.category)}</td>
          <td>{html.escape(item.note) or '<span class="muted">No note</span>'}</td>
          <td class="amount">{format_money(signed)}</td>
          <td>
            <form method="post" action="/transactions/{item.id}/delete">
              <input type="hidden" name="month" value="{html.escape(month)}">
              <button class="icon-button" type="submit" title="Delete transaction">Delete</button>
            </form>
          </td>
        </tr>
    """


def _category_row(category: str, cents: int) -> str:
    return f"""
        <li>
          <span>{html.escape(category)}</span>
          <strong>{format_money(cents)}</strong>
        </li>
    """


EMPTY_TRANSACTIONS = '<tr><td colspan="6" class="empty">No transactions for this month.</td></tr>'
EMPTY_CATEGORIES = '<li class="empty-list">No expense categories yet.</li>'


PAGE_TEMPLATE = """<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Personal Finance Tracker</title>
  <style>{css}</style>
</head>
<body>
  <main class="shell">
    <header class="topbar">
      <div>
        <p class="eyebrow">Nyas-backed Python app</p>
        <h1>Personal Finance Tracker</h1>
      </div>
      <form class="month-filter" method="get" action="/">
        <label for="month">Month</label>
        <input id="month" type="month" name="month" value="{month}">
        <button type="submit">View</button>
      </form>
    </header>

    {message}
    {error}

    <section class="summary-grid" aria-label="Monthly summary">
      <article><span>Income</span><strong>{income}</strong></article>
      <article><span>Expenses</span><strong>{expenses}</strong></article>
      <article><span>Net</span><strong>{net}</strong></article>
      <article><span>Transactions</span><strong>{count}</strong></article>
    </section>

    <section class="workspace">
      <form class="entry-panel" method="post" action="/transactions">
        <h2>Log Transaction</h2>
        <input type="hidden" name="month" value="{month}">
        <label>Type
          <select name="kind">
            <option value="expense">Expense</option>
            <option value="income">Income</option>
          </select>
        </label>
        <label>Amount
          <input name="amount" inputmode="decimal" placeholder="125.50" required>
        </label>
        <label>Category
          <input name="category" list="categories" placeholder="Groceries" required>
          <datalist id="categories">{category_options}</datalist>
        </label>
        <label>Date
          <input type="date" name="occurred_on" value="{today}" required>
        </label>
        <label>Note
          <input name="note" maxlength="240" placeholder="Optional">
        </label>
        <button class="primary" type="submit">Add Transaction</button>
      </form>

      <aside class="category-panel">
        <h2>Expense Categories</h2>
        <ul>{categories}</ul>
      </aside>
    </section>

    <section class="table-panel">
      <h2>Transactions</h2>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Type</th>
              <th>Category</th>
              <th>Note</th>
              <th>Amount</th>
              <th></th>
            </tr>
          </thead>
          <tbody>{rows}</tbody>
        </table>
      </div>
    </section>
  </main>
  <script>{js}</script>
</body>
</html>"""


CSS = """
:root {
  color-scheme: light;
  --bg: #f6f7f9;
  --panel: #ffffff;
  --text: #1d252d;
  --muted: #667085;
  --line: #d9dee8;
  --income: #13795b;
  --expense: #b42318;
  --accent: #315c9c;
}
* { box-sizing: border-box; }
body {
  margin: 0;
  background: var(--bg);
  color: var(--text);
  font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}
.shell { width: min(1180px, calc(100% - 32px)); margin: 0 auto; padding: 28px 0 40px; }
.topbar { display: flex; align-items: end; justify-content: space-between; gap: 20px; margin-bottom: 18px; }
.eyebrow { margin: 0 0 4px; color: var(--muted); font-size: 0.78rem; text-transform: uppercase; letter-spacing: 0.12em; }
h1, h2 { margin: 0; letter-spacing: 0; }
h1 { font-size: clamp(2rem, 5vw, 3.2rem); line-height: 1; }
h2 { font-size: 1rem; margin-bottom: 16px; }
button, input, select { font: inherit; }
button { border: 1px solid var(--line); background: #fff; border-radius: 6px; padding: 10px 14px; cursor: pointer; }
label { display: grid; gap: 6px; color: var(--muted); font-size: 0.9rem; }
input, select { width: 100%; border: 1px solid var(--line); border-radius: 6px; padding: 10px 12px; color: var(--text); background: #fff; }
.primary { width: 100%; background: var(--accent); color: white; border-color: var(--accent); font-weight: 700; }
.month-filter { display: flex; align-items: end; gap: 10px; }
.summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin: 18px 0; }
.summary-grid article, .entry-panel, .category-panel, .table-panel {
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: 8px;
  padding: 18px;
}
.summary-grid span { color: var(--muted); font-size: 0.86rem; }
.summary-grid strong { display: block; margin-top: 6px; font-size: 1.55rem; }
.workspace { display: grid; grid-template-columns: 1.05fr 0.95fr; gap: 16px; align-items: start; }
.entry-panel { display: grid; gap: 14px; }
.category-panel ul { list-style: none; margin: 0; padding: 0; display: grid; gap: 10px; }
.category-panel li { display: flex; justify-content: space-between; gap: 16px; border-bottom: 1px solid var(--line); padding-bottom: 10px; }
.table-panel { margin-top: 16px; }
.table-wrap { overflow-x: auto; }
table { width: 100%; border-collapse: collapse; min-width: 760px; }
th, td { border-bottom: 1px solid var(--line); padding: 12px 10px; text-align: left; vertical-align: middle; }
th { color: var(--muted); font-size: 0.84rem; font-weight: 700; }
.amount { text-align: right; font-variant-numeric: tabular-nums; }
.pill { display: inline-block; min-width: 70px; border-radius: 999px; padding: 4px 10px; text-align: center; font-size: 0.8rem; font-weight: 700; }
.pill-income { color: var(--income); background: #e9f7f1; }
.pill-expense { color: var(--expense); background: #fff0ee; }
.icon-button { padding: 7px 10px; font-size: 0.82rem; color: var(--expense); }
.notice { border-radius: 6px; padding: 10px 12px; margin: 0 0 12px; }
.notice-success { color: var(--income); background: #e9f7f1; }
.notice-error { color: var(--expense); background: #fff0ee; }
.empty, .empty-list, .muted { color: var(--muted); }
@media (max-width: 820px) {
  .topbar, .month-filter { align-items: stretch; flex-direction: column; }
  .summary-grid, .workspace { grid-template-columns: 1fr; }
  .shell { width: min(100% - 20px, 1180px); padding-top: 18px; }
}
"""


JS = """
const formatter = new Intl.DateTimeFormat(undefined, { year: "numeric", month: "short", day: "numeric" });
document.querySelectorAll(".js-local-date").forEach((node) => {
  const epoch = Number(node.dataset.epochMs);
  if (Number.isFinite(epoch)) node.textContent = formatter.format(new Date(epoch));
});
"""
