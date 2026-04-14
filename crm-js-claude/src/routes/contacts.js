const { Router } = require('express');
const pool = require('../db');

const router = Router();

router.get('/', async (req, res) => {
  try {
    const { company_id } = req.query;
    let query = 'SELECT * FROM contacts';
    const params = [];
    if (company_id) {
      query += ' WHERE company_id=$1';
      params.push(company_id);
    }
    query += ' ORDER BY id';
    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  const { first_name, last_name, email, phone, company_id } = req.body;
  if (!first_name || !last_name) return res.status(400).json({ error: 'first_name and last_name are required' });
  try {
    const { rows } = await pool.query(
      `INSERT INTO contacts (first_name, last_name, email, phone, company_id)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [first_name, last_name, email, phone, company_id]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM contacts WHERE id=$1', [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  const { first_name, last_name, email, phone, company_id } = req.body;
  try {
    const { rows } = await pool.query(
      `UPDATE contacts SET
         first_name=COALESCE($1,first_name), last_name=COALESCE($2,last_name),
         email=COALESCE($3,email), phone=COALESCE($4,phone),
         company_id=COALESCE($5,company_id), updated_at=NOW()
       WHERE id=$6 RETURNING *`,
      [first_name, last_name, email, phone, company_id, req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const { rowCount } = await pool.query('DELETE FROM contacts WHERE id=$1', [req.params.id]);
    if (!rowCount) return res.status(404).json({ error: 'Not found' });
    res.status(204).end();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
