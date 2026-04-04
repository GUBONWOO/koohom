const { Router } = require('express');
const { pool } = require('../db');

const router = Router();

const SORT_MAP = {
  price_asc:  'price_num ASC NULLS LAST',
  price_desc: 'price_num DESC NULLS LAST',
  walk_asc:   'walk_min ASC NULLS LAST',
  walk_desc:  'walk_min DESC NULLS LAST',
  year_asc:   'CAST(year_built AS INTEGER) ASC NULLS LAST',
  year_desc:  'CAST(year_built AS INTEGER) DESC NULLS LAST',
};

// GET /api/properties
router.get('/', async (req, res) => {
  try {
    const { line, page = 1, limit = 20, priceMin, priceMax, yearFrom, yearTo, walkMax, sortBy } = req.query;
    const offset = (page - 1) * limit;

    const conditions = [];
    const params = [];

    const push = (val, cond) => {
      params.push(val);
      conditions.push(cond.replace('?', `$${params.length}`));
    };

    if (line)     push(line,               'line_name = ?');
    if (priceMin) push(parseInt(priceMin),  'price_num >= ?');
    if (priceMax) push(parseInt(priceMax),  'price_num <= ?');
    if (yearFrom) push(parseInt(yearFrom),  'CAST(year_built AS INTEGER) >= ?');
    if (yearTo)   push(parseInt(yearTo),    'CAST(year_built AS INTEGER) <= ?');
    if (walkMax)  push(parseInt(walkMax),   'walk_min <= ?');

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const order = SORT_MAP[sortBy] || 'crawled_at DESC';

    const { rows: [{ count }] } = await pool.query(`SELECT COUNT(*) FROM properties ${where}`, params);

    params.push(limit, offset);
    const { rows } = await pool.query(
      `SELECT * FROM properties ${where} ORDER BY ${order} LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    res.json({ total: parseInt(count, 10), page: parseInt(page), limit: parseInt(limit), data: rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/properties/:id
router.get('/:id', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM properties WHERE id = $1', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: '매물을 찾을 수 없습니다' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
