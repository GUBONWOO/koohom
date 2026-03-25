import { useState, useEffect, useCallback } from 'react';
import { getProperties, getStats } from './api';
import './App.css';

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

  const LIMIT = 20;

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
                <span className="sidebar-title-icon">📊</span>
                路線別件数
              </div>
              <div className="stats-list">
                <div
                  className={`stats-item ${!selectedLine ? 'active' : ''}`}
                  onClick={() => handleFilter(setSelectedLine)('')}
                >
                  <span className="stats-line-name">全路線</span>
                  <span className="stats-count">{stats.total.toLocaleString()}件</span>
                </div>
                {stats.byLine.map((s) => (
                  <div
                    key={s.line_name}
                    className={`stats-item ${selectedLine === s.line_name ? 'active' : ''}`}
                    onClick={() => handleFilter(setSelectedLine)(s.line_name)}
                  >
                    <span className="stats-line-name">{s.line_name}</span>
                    <span className="stats-count">{parseInt(s.count).toLocaleString()}件</span>
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
                onChange={(e) => setSortBy(e.target.value)}
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
              <div className="empty-icon">🏚️</div>
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
          <span className="image-placeholder-icon">🏠</span>
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
            <span className="detail-icon">📍</span>
            <span className="detail-label">所在地</span>
            <span className="detail-value">{p.address || '-'}</span>
          </div>
          <div className="detail-row">
            <span className="detail-icon">🚃</span>
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
