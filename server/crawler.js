const axios = require('axios');
const cheerio = require('cheerio');
const { pool } = require('./db');

const BASE_URL = 'https://suumo.jp';
const ITEMS_PER_PAGE = 30;
const MAX_PAGES = 50;
const CRAWL_DELAY_MS = 1500;
const LINE_DELAY_MS = 2000;
const MAX_WALK_MIN = 30;

// 사이타마현 + 4개 노선
const TARGET_LINES = [
  { name: '埼京線',     slug: 'en_saikyosen' },
  { name: '京浜東北線', slug: 'en_keihintohokusen' },
  { name: '副都心線',   slug: 'en_fukutoshinsen' },
  { name: '有楽町線',   slug: 'en_yurakuchosen' },
];

// 중고만
const URL_TYPES = [
  { type: 'chuko', path: 'chukoikkodate' },  // 中古一戸建て (cn=30: 築30年以内)
];

const axiosInstance = axios.create({
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept-Language': 'ja-JP,ja;q=0.9',
  },
  timeout: 15000,
});

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// 가격 문자열 → 만엔 숫자 (최솟값)
const parsePrice = (text) => {
  const results = [];
  for (const m of text.matchAll(/(\d+)\s*億\s*(\d*)\s*万?円/g)) {
    results.push(parseInt(m[1], 10) * 10000 + (m[2] ? parseInt(m[2], 10) : 0));
  }
  const manMatches = text.replace(/\d+億\d*万?円/g, '').match(/(\d[\d,]*)\s*万円/g);
  if (manMatches) manMatches.forEach((m) => results.push(parseInt(m.replace(/[^0-9]/g, ''), 10)));
  return results.length ? Math.min(...results) : null;
};

// "徒歩15分" 등에서 최솟값 추출
const parseWalkMin = (text) => {
  const matches = [...text.matchAll(/徒歩\s*(\d+)\s*分/g)];
  if (!matches.length) return Infinity;
  return Math.min(...matches.map((m) => parseInt(m[1], 10)));
};

// "2013年4月" → 연도 숫자 추출
const parseYearBuilt = (text) => {
  const m = text.match(/(\d{4})\s*年/);
  return m ? parseInt(m[1], 10) : null;
};

// 페이지 파싱
const parsePage = ($, urlType) => {
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

    const name      = get('物件名');
    const price     = get('販売価格');
    const address   = get('所在地');
    const transport = get('沿線・駅');
    const landArea  = get('土地面積');
    const layout    = get('間取り');
    const bldArea   = get('建物面積');
    const yearText  = get('築年月'); // 중고만 존재

    // 가격미정 제외
    const priceNum = parsePrice(price || '');
    if (!priceNum) return;

    // 도보 MAX_WALK_MIN분 이내 필터
    if (parseWalkMin(transport) > MAX_WALK_MIN) return;

    const href = $(unit).find('a[href*="ikkodate"], a[href*="chukoikkodate"]').first().attr('href') || '';
    const url  = href.startsWith('http') ? href : BASE_URL + href;

    const imgEl  = $(unit).find('img').first();
    const rawImg = imgEl.attr('rel') || imgEl.attr('data-src') || imgEl.attr('src') || '';
    const cleanImg = rawImg.replace(/&amp;/g, '&');
    const imageUrl = cleanImg.startsWith('http') ? cleanImg
                   : cleanImg ? BASE_URL + cleanImg
                   : null;

    items.push({
      name:          name || null,
      price,
      price_num:     priceNum,
      walk_min:      parseWalkMin(transport),
      address:       address || null,
      transport:     transport || null,
      land_area:     landArea || null,
      building_area: bldArea || null,
      layout:        layout || null,
      year_built:    parseYearBuilt(yearText) || null,
      property_type: urlType,
      suumo_url:     url || null,
      image_url:     imageUrl,
    });
  });

  return items;
};

// 총 페이지 수
const getTotalPages = ($) => {
  const hitText = $('.pagination_set-hit').first().text().trim(); // "540件"
  const total   = parseInt(hitText.replace(/[^0-9]/g, ''), 10) || 0;
  return Math.ceil(total / ITEMS_PER_PAGE);
};

// 한 노선 + 타입 크롤링
const crawlLineType = async (line, urlType) => {
  const { path, type } = urlType;
  console.log(`\n[${line.name}/${type}] 크롤링 시작`);
  const allItems = [];

  const buildUrl = (page) => {
    const base = `${BASE_URL}/${path}/saitama/${line.slug}/`;
    const params = new URLSearchParams({ pc: String(ITEMS_PER_PAGE) });
    if (page > 1) params.set('page', String(page));
    return `${base}?${params.toString()}`;
  };

  const { data: firstData } = await axiosInstance.get(buildUrl(1));
  const $first = cheerio.load(firstData);

  const totalPages = Math.min(getTotalPages($first), MAX_PAGES);
  const firstItems = parsePage($first, type);
  allItems.push(...firstItems);
  console.log(`  1/${totalPages}p → ${firstItems.length}건`);

  for (let page = 2; page <= totalPages; page++) {
    await sleep(CRAWL_DELAY_MS);
    const { data } = await axiosInstance.get(buildUrl(page));
    const $ = cheerio.load(data);
    const items = parsePage($, type);
    allItems.push(...items);
    console.log(`  ${page}/${totalPages}p → ${items.length}건`);
  }

  console.log(`[${line.name}/${type}] 합계 ${allItems.length}건`);
  return allItems;
};

// DB 저장
const saveProperties = async (items, lineName) => {
  const client = await pool.connect();
  let saved = 0;
  let updated = 0;
  let deleted = 0;

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
            (name, price, price_num, walk_min, address, transport, land_area, building_area, layout, year_built, line_name, suumo_url, image_url)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
          [item.name, item.price, item.price_num, item.walk_min, item.address, item.transport,
           item.land_area, item.building_area, item.layout,
           item.year_built, lineName, item.suumo_url, item.image_url || null]
        );
        saved++;
      } else {
        await client.query(
          `UPDATE properties SET price=$1, price_num=$2, walk_min=$3, address=$4, transport=$5,
            land_area=$6, building_area=$7, layout=$8, year_built=$9, image_url=$10, updated_at=NOW()
           WHERE suumo_url=$11`,
          [item.price, item.price_num, item.walk_min, item.address, item.transport,
           item.land_area, item.building_area, item.layout,
           item.year_built, item.image_url || null, item.suumo_url]
        );
        updated++;
      }
    }
    // 이번 크롤링에 없는 매물 삭제
    const crawledUrls = items.map((i) => i.suumo_url).filter(Boolean);
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
    const allItems = [];
    for (const urlType of URL_TYPES) {
      try {
        const items = await crawlLineType(line, urlType);
        allItems.push(...items);
      } catch (err) {
        console.error(`[${line.name}/${urlType.type}] 오류:`, err.message);
      }
      await sleep(LINE_DELAY_MS);
    }

    try {
      const result = await saveProperties(allItems, line.name);
      summary.push({ line: line.name, ...result, total: allItems.length });
    } catch (err) {
      console.error(`[${line.name}] DB 저장 오류:`, err.message);
      summary.push({ line: line.name, error: err.message });
    }
  }

  return summary;
};

module.exports = { runCrawler, TARGET_LINES };
