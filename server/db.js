const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

const initDB = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS properties (
      id SERIAL PRIMARY KEY,
      name VARCHAR(500),
      price VARCHAR(100),
      address VARCHAR(500),
      transport VARCHAR(500),
      land_area VARCHAR(100),
      building_area VARCHAR(100),
      layout VARCHAR(100),
      year_built VARCHAR(100),
      line_name VARCHAR(100),
      suumo_url TEXT,
      image_url TEXT,
      crawled_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(suumo_url)
    );
  `);
  // 기존 테이블에 컬럼이 없으면 추가
  await pool.query(`
    ALTER TABLE properties ADD COLUMN IF NOT EXISTS image_url TEXT;
  `);
  console.log('DB 초기화 완료');
};

module.exports = { pool, initDB };
