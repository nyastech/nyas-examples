const { Router } = require('express');
const pool = require('../db');

const router = Router();

router.get('/', async (req, res) => {
  try {
    const { contact_id, company_id, deal_id } = req.query;
    const conditions = [];
    const params = [];
    if (contact_id) { conditions.push(`contact_id=$${params.length + 1}`); params.push(contact_id); }
    if (company_id) { conditions.push(`company_id=$${params.length + 1}`); params.push(company_id); }
    if (deal_id) { conditions.push(`deal_id=$${params.length + 1}`); params.push(deal_id); }
    const where = conditions.length ? ' WHERE ' + conditions.join(' AND ') : '';
    const { rows } = await pool.query('SELECT * FROM notes' + where + ' ORDER BY created_at DESC', params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  const { content, contact_id, company_id, deal_id } = req.body;
  if (!content) return res.status(400).json({ error: 'content is required' });
  try {
    const { rows } = await pool.query(
      `INSERT INTO notes (content, contact_id, company_id, deal_id)
       VALUES ($1,$2,$3,$4) RETURNING *`,
      [content, contact_id, company_id, deal_id]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM notes WHERE id=$1', [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  const { content } = req.body;
  if (!content) return res.status(400).json({ error: 'content is required' });
  try {
    const { rows } = await pool.query(
      'UPDATE notes SET content=$1 WHERE id=$2 RETURNING *',
      [content, req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const { rowCount } = await pool.query('DELETE FROM notes WHERE id=$1', [req.params.id]);
    if (!rowCount) return res.status(404).json({ error: 'Not found' });
    res.status(204).end();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
