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
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(suumo_url)
    );
  `);
  // 기존 테이블에 컬럼이 없으면 추가
  await pool.query(`ALTER TABLE properties ADD COLUMN IF NOT EXISTS image_url TEXT;`);
  await pool.query(`ALTER TABLE properties ADD COLUMN IF NOT EXISTS price_num INTEGER;`);
  await pool.query(`ALTER TABLE properties ADD COLUMN IF NOT EXISTS walk_min INTEGER;`);
  await pool.query(`ALTER TABLE properties ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();`);
  await pool.query(`ALTER TABLE properties ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();`);
  await pool.query(`ALTER TABLE properties ADD COLUMN IF NOT EXISTS area VARCHAR(50);`);
  await pool.query(`ALTER TABLE properties ADD COLUMN IF NOT EXISTS station VARCHAR(100);`);
  await pool.query(`ALTER TABLE properties ADD COLUMN IF NOT EXISTS property_type VARCHAR(20);`);

  // 인덱스 생성
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_properties_line_name  ON properties(line_name);`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_properties_price_num  ON properties(price_num);`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_properties_walk_min   ON properties(walk_min);`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_properties_year_built ON properties(year_built);`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_properties_created_at ON properties(created_at DESC);`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_properties_area       ON properties(area);`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_properties_station       ON properties(station);`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_properties_property_type ON properties(property_type);`);

  console.log('DB 초기화 완료');
};

module.exports = { pool, initDB };
