const express = require('express');
const cors = require('cors');
const cron = require('node-cron');
require('dotenv').config();

const { initDB, pool } = require('./db');
const { runCrawler, TARGET_LINES } = require('./crawler');
const propertiesRouter = require('./routes/properties');

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/properties', propertiesRouter);

// GET /api/stats
app.get('/api/stats', async (_req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT line_name, COUNT(*) AS count,
             MIN(crawled_at) AS first_crawled,
             MAX(crawled_at) AS last_crawled
      FROM properties
      GROUP BY line_name
      ORDER BY line_name
    `);
    const { rows: [{ count }] } = await pool.query('SELECT COUNT(*) FROM properties');
    res.json({ total: parseInt(count, 10), byLine: rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/crawl
app.post('/api/crawl', (req, res) => {
  const { line } = req.body || {};
  console.log(`크롤링 요청: ${line || '전체 노선'}`);
  res.json({ message: `크롤링 시작: ${line || '전체 노선'}` });

  runCrawler(line || null)
    .then((summary) => console.log('크롤링 완료:', summary))
    .catch((err) => console.error('크롤링 오류:', err.message));
});

// GET /api/lines
app.get('/api/lines', (_req, res) => {
  res.json(TARGET_LINES.map((l) => l.name));
});

// ─── 서버 시작 ───────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;

(async () => {
  await initDB();
  app.listen(PORT, () => console.log(`서버 실행 중: http://localhost:${PORT}`));

  // 3시간마다 자동 크롤링
  cron.schedule('0 */3 * * *', async () => {
    console.log(`[배치] 크롤링 시작: ${new Date().toISOString()}`);
    runCrawler(null)
      .then((summary) => console.log('[배치] 크롤링 완료:', summary))
      .catch((err) => console.error('[배치] 크롤링 오류:', err.message));
  });
  console.log('[배치] 스케줄러 등록 완료 (3시간마다 실행)');
})();
