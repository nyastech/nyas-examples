# Nyas Todos

A small JavaScript todos app backed by PostgreSQL on [nyas.io](https://nyas.io/).

## What this app does

- Creates todos in a `todos` table on startup if the schema does not exist yet.
- Lists all, active, or completed todos from the database.
- Marks todos complete or incomplete without reloading the page.
- Deletes todos from the browser UI.

## Setup

1. Create a PostgreSQL database on Nyas and copy its connection string.
2. Install dependencies:

   ```sh
   npm install
   ```

3. Copy the sample environment file and add your Nyas connection string:

   ```sh
   cp .env.example .env
   ```

4. Start the app with your Nyas connection string:

   ```sh
   NYAS_DATABASE_URL="postgres://..." npm start
   ```

5. Open `http://localhost:3000`.

## Notes

- The app also accepts `DATABASE_URL`, which can be useful on hosts that inject that variable automatically.
- Set `NYAS_SSL=true` if your chosen PostgreSQL endpoint requires TLS. The Nyas pooled connection returned by `nyas start` worked here without SSL.
- Inline editing and bulk actions are intentionally omitted for now to keep the first version easy to understand and deploy.
