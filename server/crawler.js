const axios = require('axios');
const cheerio = require('cheerio');
const { pool } = require('./db');

const BASE_URL = 'https://suumo.jp';

// 사이타마현 + 4개 노선
const TARGET_LINES = [
  { name: '埼京線',     slug: 'en_saikyosen' },
  { name: '京浜東北線', slug: 'en_keihintohokusen' },
  { name: '副都心線',   slug: 'en_fukutoshinsen' },
  { name: '有楽町線',   slug: 'en_yurakuchosen' },
];

const axiosInstance = axios.create({
  headers: {
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
      '(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept-Language': 'ja-JP,ja;q=0.9',
  },
  timeout: 15000,
});

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// 만円 문자열 → 숫자 변환 (가격 필터용)
// "3980万円", "1億2880万円", "3980万円・4200万円" 등 처리
const parsePrice = (text) => {
  const results = [];

  // "X億Y万円" 또는 "X億円" 패턴
  const okuMatch = text.matchAll(/(\d+)\s*億\s*(\d*)\s*万?円/g);
  for (const m of okuMatch) {
    const oku = parseInt(m[1], 10) * 10000;
    const man = m[2] ? parseInt(m[2], 10) : 0;
    results.push(oku + man);
  }

  // 억 없는 "X万円" 패턴 (단, 억 표현이 없는 숫자만)
  const manMatches = text.replace(/\d+億\d*万?円/g, '').match(/(\d[\d,]*)\s*万円/g);
  if (manMatches) {
    manMatches.forEach((m) => results.push(parseInt(m.replace(/[^0-9]/g, ''), 10)));
  }

  return results.length ? Math.min(...results) : Infinity;
};

// 페이지 파싱
const parsePage = ($) => {
  const items = [];

  $('.property_unit').each((_, unit) => {
    const get = (label) => {
      let val = '';
      $(unit).find('dl').each((_, dl) => {
        if ($(dl).find('dt').text().trim() === label) {
          val = $(dl).find('dd').text().trim().replace(/\s+/g, ' ');
        }
      });
      return val;
    };

    const name     = get('物件名');
    const price    = get('販売価格');
    const address  = get('所在地');
    const transport= get('沿線・駅');
    const landArea = get('土地面積');
    const layout   = get('間取り');
    const bldArea  = get('建物面積');

    const href = $(unit).find(`a[href*="ikkodate"]`).first().attr('href') || '';
    const url  = href.startsWith('http') ? href : BASE_URL + href;

    // 이미지 URL 추출 (data-src 우선, 없으면 src)
    const imgEl = $(unit).find('img').first();
    const rawImg = imgEl.attr('data-src') || imgEl.attr('src') || '';
    const imageUrl = rawImg.startsWith('http') ? rawImg
                   : rawImg ? BASE_URL + rawImg
                   : null;

    // 5000만엔 이하 필터
    if (price && parsePrice(price) <= 5000) {
      items.push({
        name:          name || null,
        price,
        address:       address || null,
        transport:     transport || null,
        land_area:     landArea || null,
        building_area: bldArea || null,
        layout:        layout || null,
        year_built:    null,
        suumo_url:     url || null,
        image_url:     imageUrl,
      });
    }
  });

  return items;
};

// 총 페이지 수
const getTotalPages = ($) => {
  const hitText = $('.paginate_set-hit').text().trim(); // "1,377件"
  const total   = parseInt(hitText.replace(/[^0-9]/g, ''), 10) || 0;
  return Math.ceil(total / 30);
};

// 한 노선 전체 크롤링
const crawlLine = async (line) => {
  console.log(`\n[${line.name}] 크롤링 시작`);
  const allItems = [];

  const firstUrl = `${BASE_URL}/ikkodate/saitama/${line.slug}/?pc=30`;
  const { data: firstData } = await axiosInstance.get(firstUrl);
  const $first = cheerio.load(firstData);

  const totalPages = Math.min(getTotalPages($first), 50);
  const firstItems = parsePage($first);
  allItems.push(...firstItems);
  console.log(`  1/${totalPages}p → ${firstItems.length}건 (5000万以下)`);

  for (let page = 2; page <= totalPages; page++) {
    await sleep(1500);
    const url = `${BASE_URL}/ikkodate/saitama/${line.slug}/?page=${page}&pc=30`;
    const { data } = await axiosInstance.get(url);
    const $ = cheerio.load(data);
    const items = parsePage($);
    allItems.push(...items);
    console.log(`  ${page}/${totalPages}p → ${items.length}건`);

    // 해당 페이지에 5000만 이하 매물이 없으면 (가격 오름차순이므로) 중단
    if (items.length === 0) {
      console.log(`  5000万以下 매물 소진, 조기 종료`);
      break;
    }
  }

  console.log(`[${line.name}] 합계 ${allItems.length}건`);
  return allItems;
};

// DB 저장
const saveProperties = async (items, lineName) => {
  const client = await pool.connect();
  let saved = 0;
  let updated = 0;

  try {
    await client.query('BEGIN');
    for (const item of items) {
      if (!item.suumo_url) continue;

      const exists = await client.query(
        'SELECT id FROM properties WHERE suumo_url = $1',
        [item.suumo_url]
      );

      if (exists.rows.length === 0) {
        await client.query(
          `INSERT INTO properties
            (name, price, address, transport, land_area, building_area, layout, year_built, line_name, suumo_url, image_url)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
          [item.name, item.price, item.address, item.transport,
           item.land_area, item.building_area, item.layout,
           item.year_built, lineName, item.suumo_url, item.image_url || null]
        );
        saved++;
      } else {
        await client.query(
          `UPDATE properties SET price=$1, address=$2, transport=$3,
            land_area=$4, building_area=$5, layout=$6, image_url=$7, crawled_at=NOW()
           WHERE suumo_url=$8`,
          [item.price, item.address, item.transport,
           item.land_area, item.building_area, item.layout,
           item.image_url || null, item.suumo_url]
        );
        updated++;
      }
    }
    // 이번 크롤링에 없는 매물 삭제
    const crawledUrls = items.map((i) => i.suumo_url).filter(Boolean);
    let deleted = 0;
    if (crawledUrls.length > 0) {
      const placeholders = crawledUrls.map((_, i) => `$${i + 2}`).join(',');
      const result = await client.query(
        `DELETE FROM properties WHERE line_name = $1 AND suumo_url NOT IN (${placeholders})`,
        [lineName, ...crawledUrls]
      );
      deleted = result.rowCount;
    }

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }

  return { saved, updated, deleted };
};

// 전체 실행
const runCrawler = async (lineName = null) => {
  const lines = lineName
    ? TARGET_LINES.filter((l) => l.name === lineName)
    : TARGET_LINES;

  const summary = [];
  for (const line of lines) {
    try {
      const items = await crawlLine(line);
      const result = await saveProperties(items, line.name);
      summary.push({ line: line.name, ...result, total: items.length });
    } catch (err) {
      console.error(`[${line.name}] 오류:`, err.message);
      summary.push({ line: line.name, error: err.message });
    }
    await sleep(2000);
  }

  return summary;
};

module.exports = { runCrawler, TARGET_LINES };
