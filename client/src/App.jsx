import { useState, useEffect, useCallback } from 'react';
import { getProperties, getStats } from './api';
import './App.css';

// ─── SVG Icons ────────────────────────────────────────
const IconChart = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="20" x2="18" y2="10"/>
    <line x1="12" y1="20" x2="12" y2="4"/>
    <line x1="6" y1="20" x2="6" y2="14"/>
  </svg>
);

const IconPin = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
    <circle cx="12" cy="10" r="3"/>
  </svg>
);

const IconTrain = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="4" y="3" width="16" height="16" rx="2"/>
    <path d="M4 11h16"/>
    <path d="M12 3v8"/>
    <path d="M8 19l-2 3"/>
    <path d="M18 22l-2-3"/>
  </svg>
);

const IconHome = () => (
  <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
    <polyline points="9 22 9 12 15 12 15 22"/>
  </svg>
);

const IconMoon = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
  </svg>
);

const IconSun = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="5"/>
    <line x1="12" y1="1" x2="12" y2="3"/>
    <line x1="12" y1="21" x2="12" y2="23"/>
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
    <line x1="1" y1="12" x2="3" y2="12"/>
    <line x1="21" y1="12" x2="23" y2="12"/>
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
  </svg>
);

// ─── Constants ────────────────────────────────────────
const SORT_OPTIONS = [
  { label: '新着順',           value: 'default' },
  { label: '価格↑ 安い順',    value: 'price_asc' },
  { label: '価格↓ 高い順',    value: 'price_desc' },
  { label: '徒歩↑ 近い順',    value: 'walk_asc' },
  { label: '徒歩↓ 遠い順',    value: 'walk_desc' },
  { label: '築年数↑ 新しい順', value: 'year_desc' },
  { label: '築年数↓ 古い順',  value: 'year_asc' },
];

const WALK_OPTIONS = [
  { label: 'すべて', max: undefined },
  { label: '5分以内',  max: 5 },
  { label: '10分以内', max: 10 },
  { label: '15分以内', max: 15 },
  { label: '20分以内', max: 20 },
  { label: '30分以内', max: 30 },
];

const PRICE_OPTIONS = [
  { label: 'すべて', min: undefined, max: undefined },
  { label: '〜2000万', min: undefined, max: 2000 },
  { label: '2000〜3000万', min: 2000, max: 3000 },
  { label: '3000〜4000万', min: 3000, max: 4000 },
  { label: '4000〜5000万', min: 4000, max: 5000 },
  { label: '5000万〜', min: 5000, max: undefined },
];

const YEAR_OPTIONS = [
  { label: 'すべて', from: undefined },
  { label: '2020年〜', from: 2020 },
  { label: '2015年〜', from: 2015 },
  { label: '2010年〜', from: 2010 },
  { label: '2005年〜', from: 2005 },
  { label: '2000年〜', from: 2000 },
  { label: '1998年〜', from: 1998 },
];

// ─── App ──────────────────────────────────────────────
export default function App() {
  const [properties, setProperties] = useState([]);
  const [stats, setStats]           = useState(null);
  const [selectedLine, setSelectedLine] = useState('');
  const [priceIdx, setPriceIdx]     = useState(0);
  const [yearIdx, setYearIdx]       = useState(0);
  const [walkIdx, setWalkIdx]       = useState(0);
  const [page, setPage]             = useState(1);
  const [total, setTotal]           = useState(0);
  const [loading, setLoading]       = useState(false);
  const [sortBy, setSortBy]         = useState('default');
  const [darkMode, setDarkMode]     = useState(
    () => window.matchMedia('(prefers-color-scheme: dark)').matches
  );

  const LIMIT = 20;

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  const fetchProperties = useCallback(async () => {
    setLoading(true);
    const price = PRICE_OPTIONS[priceIdx];
    const year  = YEAR_OPTIONS[yearIdx];
    const walk  = WALK_OPTIONS[walkIdx];
    try {
      const res = await getProperties({
        line:     selectedLine || undefined,
        priceMin: price.min,
        priceMax: price.max,
        yearFrom: year.from,
        walkMax:  walk.max,
        sortBy:   sortBy !== 'default' ? sortBy : undefined,
        page,
        limit: LIMIT,
      });
      setProperties(res.data.data);
      setTotal(res.data.total);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [selectedLine, priceIdx, yearIdx, walkIdx, sortBy, page]);

  useEffect(() => {
    getStats().then((r) => setStats(r.data)).catch(() => {});
  }, []);

  useEffect(() => {
    fetchProperties();
  }, [fetchProperties]);

  const handleFilter = (setter) => (val) => {
    setter(val);
    setPage(1);
  };

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div className="app">
      {/* 상단 네비게이션 */}
      <div className="top-nav">
        <div className="top-nav-inner">
          <span className="top-nav-text">スーモ独自調査ツール</span>
          <button
            className="theme-toggle"
            onClick={() => setDarkMode((v) => !v)}
            aria-label={darkMode ? 'ライトモードに切り替え' : 'ダークモードに切り替え'}
          >
            {darkMode ? <IconSun /> : <IconMoon />}
            {darkMode ? 'ライト' : 'ダーク'}
          </button>
        </div>
      </div>

      {/* 헤더 로고 */}
      <header className="header">
        <div className="header-inner">
          <div className="logo-area">
            <div className="logo">
              <span className="logo-s">K</span>
              <span className="logo-uumo">OOMO</span>
            </div>
            <div className="logo-sub">埼玉県 一戸建て</div>
          </div>
        </div>
      </header>

      <div className="main-wrap">
        {/* 사이드바 */}
        <aside className="sidebar">
          {stats && (
            <div className="sidebar-section">
              <div className="sidebar-title">
                <IconChart />
                路線別件数
              </div>
              <div className="stats-list">
                <div
                  className={`stats-item ${!selectedLine ? 'active' : ''}`}
                  onClick={() => handleFilter(setSelectedLine)('')}
                >
                  <span className="stats-line-name">全路線</span>
                  <span className="stats-count">{stats.total.toLocaleString()}</span>
                </div>
                {stats.byLine.map((s) => (
                  <div
                    key={s.line_name}
                    className={`stats-item ${selectedLine === s.line_name ? 'active' : ''}`}
                    onClick={() => handleFilter(setSelectedLine)(s.line_name)}
                  >
                    <span className="stats-line-name">{s.line_name}</span>
                    <span className="stats-count">{parseInt(s.count).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </aside>

        {/* 메인 컨텐츠 */}
        <main className="main-content">
          {/* 필터 바 */}
          <div className="filter-bar">
            <div className="filter-group">
              <span className="filter-group-label">価格</span>
              <div className="filter-chips">
                {PRICE_OPTIONS.map((opt, i) => (
                  <button
                    key={i}
                    className={`filter-chip ${priceIdx === i ? 'active' : ''}`}
                    onClick={() => handleFilter(setPriceIdx)(i)}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="filter-group">
              <span className="filter-group-label">徒歩</span>
              <div className="filter-chips">
                {WALK_OPTIONS.map((opt, i) => (
                  <button
                    key={i}
                    className={`filter-chip ${walkIdx === i ? 'active' : ''}`}
                    onClick={() => handleFilter(setWalkIdx)(i)}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="filter-group">
              <span className="filter-group-label">築年数</span>
              <div className="filter-chips">
                {YEAR_OPTIONS.map((opt, i) => (
                  <button
                    key={i}
                    className={`filter-chip ${yearIdx === i ? 'active' : ''}`}
                    onClick={() => handleFilter(setYearIdx)(i)}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 결과 헤더 */}
          <div className="result-header">
            <div className="result-count">
              <span className="result-label">検索結果</span>
              <span className="result-num">{total.toLocaleString()}</span>
              <span className="result-unit">件</span>
            </div>
            <div className="filter-area">
              <select
                className="line-select"
                value={sortBy}
                onChange={(e) => { setSortBy(e.target.value); setPage(1); }}
              >
                {SORT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* 매물 리스트 */}
          {loading ? (
            <div className="loading-state">
              <div className="loading-spinner" />
              <p>物件を読み込み中...</p>
            </div>
          ) : properties.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon"><IconHome /></div>
              <p className="empty-title">物件が見つかりません</p>
              <p className="empty-desc">条件を変更してください</p>
            </div>
          ) : (
            <div className="property-list">
              {properties.map((p) => (
                <PropertyCard key={p.id} property={p} />
              ))}
            </div>
          )}

          {/* 페이지네이션 */}
          {totalPages > 1 && (
            <div className="pagination">
              <button
                className="page-btn"
                onClick={() => setPage((v) => Math.max(1, v - 1))}
                disabled={page === 1}
              >
                ＜ 前へ
              </button>
              <div className="page-numbers">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const start = Math.max(1, Math.min(page - 2, totalPages - 4));
                  const num = start + i;
                  return (
                    <button
                      key={num}
                      className={`page-num ${num === page ? 'current' : ''}`}
                      onClick={() => setPage(num)}
                    >
                      {num}
                    </button>
                  );
                })}
              </div>
              <button
                className="page-btn"
                onClick={() => setPage((v) => Math.min(totalPages, v + 1))}
                disabled={page === totalPages}
              >
                次へ ＞
              </button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

// ─── PropertyCard ─────────────────────────────────────
function PropertyCard({ property: p }) {
  return (
    <div className="card">
      {/* 이미지 */}
      <div className="card-image">
        {p.image_url ? (
          <img
            className="card-img"
            src={p.image_url}
            alt={p.name || '物件写真'}
            loading="lazy"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
              e.currentTarget.nextSibling.style.display = 'flex';
            }}
          />
        ) : null}
        <div className="image-placeholder" style={p.image_url ? { display: 'none' } : {}}>
          <IconHome />
          <span className="image-placeholder-text">外観写真なし</span>
        </div>
        <div className="card-badges">
          <span className="badge badge-line">{p.line_name}</span>
        </div>
      </div>

      {/* 카드 정보 */}
      <div className="card-info">
        <div className="card-price-row">
          <span className="card-price">{p.price}</span>
          {p.layout && <span className="card-layout">{p.layout}</span>}
        </div>

        {p.name && <div className="card-name">{p.name}</div>}

        <div className="card-details">
          <div className="detail-row">
            <span className="detail-icon"><IconPin /></span>
            <span className="detail-label">所在地</span>
            <span className="detail-value">{p.address || '-'}</span>
          </div>
          <div className="detail-row">
            <span className="detail-icon"><IconTrain /></span>
            <span className="detail-label">交通</span>
            <span className="detail-value transport">{p.transport || '-'}</span>
          </div>
          <div className="detail-specs">
            <div className="spec-item">
              <span className="spec-label">土地面積</span>
              <span className="spec-value">{p.land_area || '-'}</span>
            </div>
            <div className="spec-sep" />
            <div className="spec-item">
              <span className="spec-label">建物面積</span>
              <span className="spec-value">{p.building_area || '-'}</span>
            </div>
            <div className="spec-sep" />
            <div className="spec-item">
              <span className="spec-label">築年月</span>
              <span className="spec-value">{p.year_built ? `${p.year_built}年` : '-'}</span>
            </div>
          </div>
        </div>

        {p.suumo_url && (
          <a className="card-cta" href={p.suumo_url} target="_blank" rel="noreferrer">
            SUUMOで詳細を見る
            <span className="cta-arrow">→</span>
          </a>
        )}
      </div>
    </div>
  );
}
