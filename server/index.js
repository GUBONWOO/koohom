const express = require('express');
const cors = require('cors');
const cron = require('node-cron');
require('dotenv').config();

const { initDB, pool } = require('./db');
const { runCrawler, TARGET_LINES } = require('./crawler');

const app = express();
app.use(cors());
app.use(express.json());

// ─── 매물 목록 조회 ───────────────────────────────────────────────
// GET /api/properties?line=埼京線&page=1&limit=20
app.get('/api/properties', async (req, res) => {
  try {
    const { line, page = 1, limit = 20, priceMin, priceMax, yearFrom, yearTo, walkMax } = req.query;
    const offset = (page - 1) * limit;

    const conditions = [];
    const params = [];

    if (line)     { params.push(line);              conditions.push(`line_name = $${params.length}`); }
    if (priceMin) { params.push(parseInt(priceMin)); conditions.push(`price_num >= $${params.length}`); }
    if (priceMax) { params.push(parseInt(priceMax)); conditions.push(`price_num <= $${params.length}`); }
    if (yearFrom) { params.push(parseInt(yearFrom)); conditions.push(`CAST(year_built AS INTEGER) >= $${params.length}`); }
    if (yearTo)   { params.push(parseInt(yearTo));   conditions.push(`CAST(year_built AS INTEGER) <= $${params.length}`); }
    if (walkMax)  { params.push(parseInt(walkMax));  conditions.push(`walk_min <= $${params.length}`); }

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM properties ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].count, 10);

    params.push(limit, offset);
    const result = await pool.query(
      `SELECT * FROM properties ${whereClause}
       ORDER BY crawled_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    res.json({
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      data: result.rows,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── 매물 상세 조회 ───────────────────────────────────────────────
app.get('/api/properties/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'SELECT * FROM properties WHERE id = $1',
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: '매물을 찾을 수 없습니다' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── 통계 ─────────────────────────────────────────────────────────
app.get('/api/stats', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        line_name,
        COUNT(*) AS count,
        MIN(crawled_at) AS first_crawled,
        MAX(crawled_at) AS last_crawled
      FROM properties
      GROUP BY line_name
      ORDER BY line_name
    `);
    const total = await pool.query('SELECT COUNT(*) FROM properties');
    res.json({
      total: parseInt(total.rows[0].count, 10),
      byLine: result.rows,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── 크롤링 실행 ─────────────────────────────────────────────────
// POST /api/crawl         { line: "埼京線" } 또는 body 없으면 전체
app.post('/api/crawl', async (req, res) => {
  const { line } = req.body || {};
  console.log(`크롤링 요청: ${line || '전체 노선'}`);

  // 즉시 응답 후 백그라운드에서 실행
  res.json({ message: `크롤링 시작: ${line || '전체 노선'}` });

  try {
    const summary = await runCrawler(line || null);
    console.log('크롤링 완료:', summary);
  } catch (err) {
    console.error('크롤링 오류:', err.message);
  }
});

// ─── 노선 목록 ───────────────────────────────────────────────────
app.get('/api/lines', (req, res) => {
  res.json(TARGET_LINES.map((l) => l.name));
});

// ─── 서버 시작 ───────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;

(async () => {
  await initDB();
  app.listen(PORT, () => {
    console.log(`서버 실행 중: http://localhost:${PORT}`);
  });

  // 3시간마다 자동 크롤링 (0시, 3시, 6시, 9시... 정각)
  cron.schedule('0 */3 * * *', async () => {
    console.log(`[배치] 크롤링 시작: ${new Date().toISOString()}`);
    try {
      const summary = await runCrawler(null);
      console.log('[배치] 크롤링 완료:', summary);
    } catch (err) {
      console.error('[배치] 크롤링 오류:', err.message);
    }
  });
  console.log('[배치] 스케줄러 등록 완료 (3시간마다 실행)');
})();
