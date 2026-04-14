const { Router } = require('express');
const pool = require('../db');

const router = Router();

router.get('/', async (req, res) => {
  try {
    const { stage, company_id, contact_id } = req.query;
    const conditions = [];
    const params = [];
    if (stage) { conditions.push(`stage=$${params.length + 1}`); params.push(stage); }
    if (company_id) { conditions.push(`company_id=$${params.length + 1}`); params.push(company_id); }
    if (contact_id) { conditions.push(`contact_id=$${params.length + 1}`); params.push(contact_id); }
    const where = conditions.length ? ' WHERE ' + conditions.join(' AND ') : '';
    const { rows } = await pool.query('SELECT * FROM deals' + where + ' ORDER BY id', params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  const { name, value, stage, contact_id, company_id, expected_close_date } = req.body;
  if (!name) return res.status(400).json({ error: 'name is required' });
  try {
    const { rows } = await pool.query(
      `INSERT INTO deals (name, value, stage, contact_id, company_id, expected_close_date)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [name, value, stage || 'lead', contact_id, company_id, expected_close_date]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM deals WHERE id=$1', [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  const { name, value, stage, contact_id, company_id, expected_close_date } = req.body;
  try {
    const { rows } = await pool.query(
      `UPDATE deals SET
         name=COALESCE($1,name), value=COALESCE($2,value),
         stage=COALESCE($3,stage), contact_id=COALESCE($4,contact_id),
         company_id=COALESCE($5,company_id),
         expected_close_date=COALESCE($6,expected_close_date), updated_at=NOW()
       WHERE id=$7 RETURNING *`,
      [name, value, stage, contact_id, company_id, expected_close_date, req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const { rowCount } = await pool.query('DELETE FROM deals WHERE id=$1', [req.params.id]);
    if (!rowCount) return res.status(404).json({ error: 'Not found' });
    res.status(204).end();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
