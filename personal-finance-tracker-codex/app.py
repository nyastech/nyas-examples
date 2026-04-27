from __future__ import annotations

import argparse
import os
from pathlib import Path

from finance_tracker.web import run_server


def load_project_env(path: Path = Path(".env")) -> None:
    if not path.exists():
        return

    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip().strip("'\""))


def main() -> None:
    load_project_env()
    parser = argparse.ArgumentParser(description="Run the Personal Finance Tracker.")
    parser.add_argument("--host", default=os.getenv("HOST", "127.0.0.1"))
    parser.add_argument("--port", default=int(os.getenv("PORT", "8000")), type=int)
    parser.add_argument("--database-url", default=os.getenv("NYAS_DATABASE_URL") or os.getenv("DATABASE_URL"))
    args = parser.parse_args()

    run_server(args.host, args.port, args.database_url)


if __name__ == "__main__":
    main()
