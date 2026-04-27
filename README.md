# nyas-examples

Sample applications demonstrating how to build full-stack apps with [Nyas](https://nyas.io/) managed PostgreSQL — provisioned instantly, no infrastructure setup required.

Each example was generated using an AI coding agent (Claude, Codex, or Antigravity) with a short prompt and a Nyas database as the only backend dependency.

## What is Nyas?

[Nyas](https://nyas.io/) gives you a managed PostgreSQL database in seconds via a single CLI command:

```bash
curl -LsSf https://app.nyas.io/install.sh | sh
nyas start
```

Your connection string is ready immediately — no account setup, no config files, no waiting.

## Examples

| Directory | App | Language / Stack | Agent |
|-----------|-----|-----------------|-------|
| [`todos-js-claude/`](./todos-js-claude/) | Todo list | Node.js, Express | Claude |
| [`todos-js-codex/`](./todos-js-codex/) | Todo list | Node.js, Express | Codex |
| [`todos-js-antigravity/`](./todos-js-antigravity/) | Todo list | Node.js, Express | Antigravity |
| [`crm-js-claude/`](./crm-js-claude/) | CRM | Node.js, Express | Claude |
| [`crm-py-antigravity/`](./crm-py-antigravity/) | CRM | Python, FastAPI, uv | Antigravity |
| [`crm-go-codex/`](./crm-go-codex/) | CRM | Go, server-rendered HTML | Codex |
| [`crm-ts-antigravity/`](./crm-ts-antigravity/) | CRM | TypeScript, Next.js, Prisma | Antigravity |
| [`event_analytics-claude/`](./event_analytics-claude/) | Event analytics | Node.js, Fastify, React | Claude |
| [`personal-finance-tracker-codex/`](./personal-finance-tracker-codex/) | Personal finance tracker | Python | Codex |

### Todo Apps

Simple full-stack to-do lists — create, complete, and delete tasks stored in Postgres. Good starting point if you want to see the minimal wiring between a Node.js server and a Nyas database.

### CRM Apps

Customer Relationship Management apps with a customer directory and a Kanban deal pipeline. Available in four stacks so you can compare how the same product requirement looks across Python/FastAPI, Go, Node.js/Express, and Next.js/Prisma.

### Event Analytics (`event_analytics-claude`)

High-throughput event tracking system. A lightweight `tracker.js` snippet batches browser events and ships them to a Fastify backend, which buffers writes in-memory and bulk-inserts them into Postgres every 2 seconds. A React dashboard shows live sessions, time-series charts, funnel analysis, and referrer breakdowns.

### Personal Finance Tracker (`personal-finance-tracker-codex`)

Dependency-light Python web app for logging income and expenses, categorizing spending, and reviewing monthly summaries. Runs against Nyas/Postgres when `NYAS_DATABASE_URL` or `DATABASE_URL` is set, and falls back to a local SQLite database otherwise.

## Getting started

1. **Install the Nyas CLI**

   ```bash
   curl -LsSf https://app.nyas.io/install.sh | sh
   ```

2. **Start a database**

   ```bash
   nyas start --json
   ```

   Copy the `session` connection string from the output (usually on port `5452`).

3. **Pick an example** and follow its `README.md`:

   ```bash
   cd todos-js-claude
   cp .env.example .env
   # paste your connection string into .env as DATABASE_URL
   npm install && npm start
   ```

Each example's README covers its specific setup, seed scripts, and how to run the dev server.

## License

[Apache 2.0](./LICENSE)
