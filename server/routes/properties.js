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
    const { line, area, station, propertyType, page = 1, limit = 20, priceMin, priceMax, yearFrom, yearTo, walkMax, sortBy, skipCount } = req.query;
    const offset = (page - 1) * limit;

    const conditions = [];
    const params = [];

    const push = (val, cond) => {
      params.push(val);
      conditions.push(cond.replace('?', `$${params.length}`));
    };

    if (line)     push(line,               'line_name = ?');
    if (area)     push(area,               'area = ?');
    if (station)      push(station,       'station = ?');
    if (propertyType) push(propertyType,  'property_type = ?');
    if (priceMin) push(parseInt(priceMin),  'price_num >= ?');
    if (priceMax) push(parseInt(priceMax),  'price_num <= ?');
    if (yearFrom) push(parseInt(yearFrom),  'CAST(year_built AS INTEGER) >= ?');
    if (yearTo)   push(parseInt(yearTo),    'CAST(year_built AS INTEGER) <= ?');
    if (walkMax)  push(parseInt(walkMax),   'walk_min <= ?');

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const order = SORT_MAP[sortBy] || 'created_at DESC';

    const dataParams = [...params, limit, offset];

    const dataQuery = pool.query(
      `SELECT * FROM properties ${where} ORDER BY ${order} LIMIT $${dataParams.length - 1} OFFSET $${dataParams.length}`,
      dataParams
    );

    let count;
    if (skipCount === 'true') {
      const { rows } = await dataQuery;
      return res.json({ total: null, page: parseInt(page), limit: parseInt(limit), data: rows });
    }

    const [countResult, dataResult] = await Promise.all([
      pool.query(`SELECT COUNT(*) FROM properties ${where}`, params),
      dataQuery,
    ]);

    count = countResult.rows[0].count;
    const { rows } = dataResult;

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
