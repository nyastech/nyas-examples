# Personal Finance Tracker

A dependency-light Python web app for logging income and expenses, categorizing spending, and reviewing monthly summaries.

The app uses a Nyas/Postgres database when `NYAS_DATABASE_URL` or `DATABASE_URL` points at a Postgres URI. Without that setting, it falls back to a local SQLite database at `finance.db`.

## Run locally

```sh
python3 app.py
```

Then open <http://127.0.0.1:8000>.

## Use Nyas

1. Create or open a Nyas project at <https://app.nyas.io/>.
2. Copy the project's Postgres connection URI.
3. Start the app with that URI:

```sh
NYAS_DATABASE_URL='postgresql://USER:PASSWORD@HOST:PORT/DBNAME' python3 app.py
```

For the Nyas/Postgres path, install the optional driver first:

```sh
python3 -m pip install -r requirements-nyas.txt
```

The local SQLite path does not need third-party packages.

## Test

```sh
python3 -m unittest
```

