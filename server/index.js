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
      SELECT line_name, COUNT(*) AS count
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

// GET /api/stations?line=xxx
app.get('/api/stations', async (req, res) => {
  try {
    const { line } = req.query;
    const where = line ? 'WHERE line_name = $1 AND station IS NOT NULL' : 'WHERE station IS NOT NULL';
    const params = line ? [line] : [];
    const { rows } = await pool.query(
      `SELECT station, COUNT(*) AS count
       FROM properties
       ${where}
       GROUP BY station
       ORDER BY count DESC`,
      params
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── 서버 시작 ───────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;

(async () => {
  await initDB();
  app.listen(PORT, () => console.log(`서버 실행 중: http://localhost:${PORT}`));

  // 지역별 로테이션 크롤링 (3시간 간격)
  const scheduleArea = (cronExpr, areas) => {
    cron.schedule(cronExpr, () => {
      console.log(`[배치] 크롤링 시작 (${areas.join(',')}): ${new Date().toISOString()}`);
      runCrawler(null, areas)
        .then((s) => console.log(`[배치] 완료 (${areas.join(',')})`, s))
        .catch((err) => console.error(`[배치] 오류 (${areas.join(',')})`, err.message));
    });
  };

  scheduleArea('0 0,9,18 * * *',  ['tokyo']);
  scheduleArea('0 3,12,21 * * *', ['saitama']);
  scheduleArea('0 6,15 * * *',    ['kanagawa', 'chiba']);

  console.log('[배치] 스케줄러 등록 완료 (tokyo: 0/9/18시, saitama: 3/12/21시, kanagawa+chiba: 6/15시)');
})();
