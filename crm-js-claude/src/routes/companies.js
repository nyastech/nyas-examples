const { Router } = require('express');
const pool = require('../db');

const router = Router();

router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM companies ORDER BY id');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  const { name, industry, website, phone, address } = req.body;
  if (!name) return res.status(400).json({ error: 'name is required' });
  try {
    const { rows } = await pool.query(
      `INSERT INTO companies (name, industry, website, phone, address)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [name, industry, website, phone, address]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM companies WHERE id=$1', [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  const { name, industry, website, phone, address } = req.body;
  try {
    const { rows } = await pool.query(
      `UPDATE companies SET
         name=COALESCE($1,name), industry=COALESCE($2,industry),
         website=COALESCE($3,website), phone=COALESCE($4,phone),
         address=COALESCE($5,address), updated_at=NOW()
       WHERE id=$6 RETURNING *`,
      [name, industry, website, phone, address, req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const { rowCount } = await pool.query('DELETE FROM companies WHERE id=$1', [req.params.id]);
    if (!rowCount) return res.status(404).json({ error: 'Not found' });
    res.status(204).end();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
