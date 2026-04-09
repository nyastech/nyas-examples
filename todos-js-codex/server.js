import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const { Pool } = pg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.join(__dirname, "public");
const port = Number(process.env.PORT || 3000);
loadEnvFile(path.join(__dirname, ".env"));
const connectionString = process.env.NYAS_DATABASE_URL || process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    "Expected `NYAS_DATABASE_URL` or `DATABASE_URL` to point at your Nyas Postgres instance.",
  );
}

const pool = new Pool({
  connectionString,
  ssl: resolveSslConfig(),
});

class HttpError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
  }
}

// We create the schema at startup so a fresh Nyas database can begin serving
// the UI immediately without requiring a separate migration tool.
async function ensureSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS todos (
      id BIGSERIAL PRIMARY KEY,
      title TEXT NOT NULL CHECK (char_length(trim(title)) > 0),
      completed BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
}

// A tiny JSON API keeps the frontend deployment simple while still letting the
// browser update state incrementally without page reloads.
async function handleApi(request, response) {
  const url = new URL(request.url, `http://${request.headers.host}`);

  if (request.method === "GET" && url.pathname === "/api/todos") {
    await sendTodos(response, url.searchParams.get("filter"));
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/todos") {
    const body = await readJson(request);
    await createTodo(response, body);
    return;
  }

  const match = url.pathname.match(/^\/api\/todos\/(\d+)$/);
  if (!match) {
    sendJson(response, 404, { error: "Not found" });
    return;
  }

  const todoId = Number(match[1]);
  if (request.method === "PATCH") {
    const body = await readJson(request);
    await updateTodo(response, todoId, body);
    return;
  }

  if (request.method === "DELETE") {
    await deleteTodo(response, todoId);
    return;
  }

  sendJson(response, 405, { error: "Method not allowed" });
}

async function sendTodos(response, filter = "all") {
  const allowedFilter = ["all", "active", "completed"].includes(filter) ? filter : "all";
  const values = [];
  let whereClause = "";

  if (allowedFilter === "active") {
    whereClause = "WHERE completed = $1";
    values.push(false);
  }

  if (allowedFilter === "completed") {
    whereClause = "WHERE completed = $1";
    values.push(true);
  }

  const { rows } = await pool.query(
    `
      SELECT id, title, completed, created_at, updated_at
      FROM todos
      ${whereClause}
      ORDER BY created_at DESC, id DESC;
    `,
    values,
  );

  sendJson(response, 200, { todos: rows });
}

async function createTodo(response, body) {
  const title = normalizeTitle(body?.title);
  if (!title) {
    sendJson(response, 400, { error: "A todo title is required." });
    return;
  }

  const { rows } = await pool.query(
    `
      INSERT INTO todos (title)
      VALUES ($1)
      RETURNING id, title, completed, created_at, updated_at;
    `,
    [title],
  );

  sendJson(response, 201, { todo: rows[0] });
}

async function updateTodo(response, todoId, body) {
  const updates = [];
  const values = [];

  if (Object.hasOwn(body ?? {}, "title")) {
    const title = normalizeTitle(body.title);
    if (!title) {
      sendJson(response, 400, { error: "A todo title is required." });
      return;
    }

    values.push(title);
    updates.push(`title = $${values.length}`);
  }

  if (Object.hasOwn(body ?? {}, "completed")) {
    if (typeof body.completed !== "boolean") {
      sendJson(response, 400, { error: "`completed` must be a boolean." });
      return;
    }

    values.push(body.completed);
    updates.push(`completed = $${values.length}`);
  }

  if (updates.length === 0) {
    sendJson(response, 400, { error: "No valid updates were provided." });
    return;
  }

  values.push(todoId);
  const { rows } = await pool.query(
    `
      UPDATE todos
      SET ${updates.join(", ")}, updated_at = NOW()
      WHERE id = $${values.length}
      RETURNING id, title, completed, created_at, updated_at;
    `,
    values,
  );

  if (rows.length === 0) {
    sendJson(response, 404, { error: "Todo not found." });
    return;
  }

  sendJson(response, 200, { todo: rows[0] });
}

async function deleteTodo(response, todoId) {
  const result = await pool.query("DELETE FROM todos WHERE id = $1", [todoId]);
  if (result.rowCount === 0) {
    sendJson(response, 404, { error: "Todo not found." });
    return;
  }

  response.writeHead(204);
  response.end();
}

// Static assets live in `public/` so the project stays deployment-friendly and
// does not depend on a bundler for a straightforward CRUD interface.
async function handleStatic(request, response) {
  const { pathname } = new URL(request.url, `http://${request.headers.host}`);
  const resolvedPath = pathname === "/" ? "/index.html" : pathname;
  const filePath = path.join(publicDir, resolvedPath);

  if (!filePath.startsWith(publicDir)) {
    sendText(response, 403, "Forbidden");
    return;
  }

  try {
    const file = await readFile(filePath);
    response.writeHead(200, { "Content-Type": contentTypeFor(filePath) });
    response.end(file);
  } catch (error) {
    if (error.code === "ENOENT") {
      sendText(response, 404, "Not found");
      return;
    }

    throw error;
  }
}

async function createApp() {
  await ensureSchema();

  const server = createServer(async (request, response) => {
    try {
      if (request.url.startsWith("/api/")) {
        await handleApi(request, response);
        return;
      }

      await handleStatic(request, response);
    } catch (error) {
      if (error instanceof HttpError) {
        sendJson(response, error.statusCode, { error: error.message });
        return;
      }

      console.error(error);
      sendJson(response, 500, { error: "Internal server error" });
    }
  });

  server.listen(port, () => {
    console.log(`Todos app listening on http://localhost:${port}`);
  });
}

// We keep `.env` loading intentionally tiny so the project stays dependency-light
// while still matching the local-development workflow most Node apps expect.
function loadEnvFile(filePath) {
  if (!existsSync(filePath)) {
    return;
  }

  const contents = readFileSync(filePath, "utf8");
  for (const line of contents.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim();
    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

// Managed Postgres providers vary here: some require TLS, while Nyas' pooled
// endpoint returned by `nyas start` currently rejects SSL. We default to plain
// TCP and let callers opt into TLS explicitly with `NYAS_SSL=true`.
function resolveSslConfig() {
  const sslMode = (process.env.NYAS_SSL || process.env.PGSSL || "").trim().toLowerCase();
  if (["1", "true", "require"].includes(sslMode)) {
    return { rejectUnauthorized: false };
  }

  return false;
}

function normalizeTitle(value) {
  return typeof value === "string" ? value.trim() : "";
}

function contentTypeFor(filePath) {
  if (filePath.endsWith(".css")) {
    return "text/css; charset=utf-8";
  }

  if (filePath.endsWith(".js")) {
    return "application/javascript; charset=utf-8";
  }

  return "text/html; charset=utf-8";
}

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, { "Content-Type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(payload));
}

function sendText(response, statusCode, payload) {
  response.writeHead(statusCode, { "Content-Type": "text/plain; charset=utf-8" });
  response.end(payload);
}

function readJson(request) {
  return new Promise((resolve, reject) => {
    let body = "";

    request.on("data", (chunk) => {
      body += chunk;
    });

    request.on("end", () => {
      if (!body) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(body));
      } catch {
        reject(new HttpError(400, "Request body must be valid JSON."));
      }
    });

    request.on("error", reject);
  });
}

createApp().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
