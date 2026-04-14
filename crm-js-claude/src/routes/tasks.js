const { Router } = require('express');
const pool = require('../db');

const router = Router();

router.get('/', async (req, res) => {
  try {
    const { status, contact_id, company_id, deal_id } = req.query;
    const conditions = [];
    const params = [];
    if (status) { conditions.push(`status=$${params.length + 1}`); params.push(status); }
    if (contact_id) { conditions.push(`contact_id=$${params.length + 1}`); params.push(contact_id); }
    if (company_id) { conditions.push(`company_id=$${params.length + 1}`); params.push(company_id); }
    if (deal_id) { conditions.push(`deal_id=$${params.length + 1}`); params.push(deal_id); }
    const where = conditions.length ? ' WHERE ' + conditions.join(' AND ') : '';
    const { rows } = await pool.query('SELECT * FROM tasks' + where + ' ORDER BY due_date ASC NULLS LAST, id', params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  const { title, type, description, due_date, status, contact_id, company_id, deal_id } = req.body;
  if (!title) return res.status(400).json({ error: 'title is required' });
  try {
    const { rows } = await pool.query(
      `INSERT INTO tasks (title, type, description, due_date, status, contact_id, company_id, deal_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [title, type || 'todo', description, due_date, status || 'open', contact_id, company_id, deal_id]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM tasks WHERE id=$1', [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  const { title, type, description, due_date, status, contact_id, company_id, deal_id } = req.body;
  try {
    const { rows } = await pool.query(
      `UPDATE tasks SET
         title=COALESCE($1,title), type=COALESCE($2,type),
         description=COALESCE($3,description), due_date=COALESCE($4,due_date),
         status=COALESCE($5,status), contact_id=COALESCE($6,contact_id),
         company_id=COALESCE($7,company_id), deal_id=COALESCE($8,deal_id),
         updated_at=NOW()
       WHERE id=$9 RETURNING *`,
      [title, type, description, due_date, status, contact_id, company_id, deal_id, req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const { rowCount } = await pool.query('DELETE FROM tasks WHERE id=$1', [req.params.id]);
    if (!rowCount) return res.status(404).json({ error: 'Not found' });
    res.status(204).end();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
