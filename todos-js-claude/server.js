require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: false,
});

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Initialize todos table
async function initDB() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS todos (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      completed BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  console.log('Database ready');
}

// GET /api/todos — list all todos
app.get('/api/todos', async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM todos ORDER BY created_at DESC');
  res.json(rows);
});

// POST /api/todos — create a todo
app.post('/api/todos', async (req, res) => {
  const { title } = req.body;
  if (!title?.trim()) return res.status(400).json({ error: 'title is required' });
  const { rows } = await pool.query(
    'INSERT INTO todos (title) VALUES ($1) RETURNING *',
    [title.trim()]
  );
  res.status(201).json(rows[0]);
});

// PATCH /api/todos/:id — toggle completed or update title
app.patch('/api/todos/:id', async (req, res) => {
  const { id } = req.params;
  const { title, completed } = req.body;

  const fields = [];
  const values = [];
  let i = 1;

  if (title !== undefined) { fields.push(`title = $${i++}`); values.push(title.trim()); }
  if (completed !== undefined) { fields.push(`completed = $${i++}`); values.push(completed); }

  if (!fields.length) return res.status(400).json({ error: 'nothing to update' });

  values.push(id);
  const { rows } = await pool.query(
    `UPDATE todos SET ${fields.join(', ')} WHERE id = $${i} RETURNING *`,
    values
  );
  if (!rows.length) return res.status(404).json({ error: 'not found' });
  res.json(rows[0]);
});

// DELETE /api/todos/:id — delete a todo
app.delete('/api/todos/:id', async (req, res) => {
  const { id } = req.params;
  const { rowCount } = await pool.query('DELETE FROM todos WHERE id = $1', [id]);
  if (!rowCount) return res.status(404).json({ error: 'not found' });
  res.status(204).send();
});

// DELETE /api/todos — clear all completed
app.delete('/api/todos', async (req, res) => {
  await pool.query('DELETE FROM todos WHERE completed = TRUE');
  res.status(204).send();
});

initDB()
  .then(() => app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`)))
  .catch((err) => { console.error('DB init failed:', err.message); process.exit(1); });
