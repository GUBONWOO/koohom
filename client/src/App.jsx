import { useState, useEffect, useCallback } from 'react';
import { getProperties, getStats, getLines, startCrawl } from './api';
import './App.css';

export default function App() {
  const [properties, setProperties] = useState([]);
  const [stats, setStats]           = useState(null);
  const [lines, setLines]           = useState([]);
  const [selectedLine, setSelectedLine] = useState('');
  const [page, setPage]             = useState(1);
  const [total, setTotal]           = useState(0);
  const [loading, setLoading]       = useState(false);
  const [crawling, setCrawling]     = useState(false);
  const [message, setMessage]       = useState('');

  const LIMIT = 20;

  const fetchProperties = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getProperties({ line: selectedLine || undefined, page, limit: LIMIT });
      setProperties(res.data.data);
      setTotal(res.data.total);
    } catch {
      setMessage('매물 조회 실패');
    } finally {
      setLoading(false);
    }
  }, [selectedLine, page]);

  const fetchStats = async () => {
    try {
      const res = await getStats();
      setStats(res.data);
    } catch {}
  };

  useEffect(() => {
    getLines().then((r) => setLines(r.data));
    fetchStats();
  }, []);

  useEffect(() => {
    fetchProperties();
  }, [fetchProperties]);

  const handleCrawl = async (line) => {
    setCrawling(true);
    setMessage('');
    try {
      await startCrawl(line);
      setMessage(`クロール開始: ${line || '全路線'} (バックグラウンドで実行中...)`);
      setTimeout(() => { fetchStats(); fetchProperties(); }, 5000);
    } catch {
      setMessage('크롤링 요청 실패');
    } finally {
      setCrawling(false);
    }
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
              <span className="logo-s">S</span>
              <span className="logo-uumo">UUMO</span>
            </div>
            <div className="logo-sub">埼玉県 一戸建て・土地</div>
          </div>
          <div className="header-desc">
            <span className="line-tag">埼京線</span>
            <span className="line-tag">京浜東北線</span>
            <span className="line-tag">副都心線</span>
            <span className="line-tag">有楽町線</span>
            <span className="price-tag">5,000万円以下</span>
          </div>
        </div>
      </header>

      <div className="main-wrap">
        {/* 사이드바 */}
        <aside className="sidebar">
          <div className="sidebar-section">
            <div className="sidebar-title">
              <span className="sidebar-title-icon">🔄</span>
              データ更新
            </div>
            <button
              className="btn btn-crawl-all"
              onClick={() => handleCrawl(null)}
              disabled={crawling}
            >
              {crawling ? (
                <span className="loading-dots">クロール中<span>...</span></span>
              ) : (
                '全路線クロール'
              )}
            </button>
            <div className="line-crawl-list">
              {lines.map((line) => (
                <button
                  key={line}
                  className="btn btn-crawl-line"
                  onClick={() => handleCrawl(line)}
                  disabled={crawling}
                >
                  {line}
                </button>
              ))}
            </div>
            {message && (
              <div className="crawl-message">
                <span className="message-icon">ℹ️</span>
                {message}
              </div>
            )}
          </div>

          {stats && (
            <div className="sidebar-section">
              <div className="sidebar-title">
                <span className="sidebar-title-icon">📊</span>
                路線別件数
              </div>
              <div className="stats-list">
                <div
                  className={`stats-item ${!selectedLine ? 'active' : ''}`}
                  onClick={() => { setSelectedLine(''); setPage(1); }}
                >
                  <span className="stats-line-name">全路線</span>
                  <span className="stats-count">{stats.total.toLocaleString()}件</span>
                </div>
                {stats.byLine.map((s) => (
                  <div
                    key={s.line_name}
                    className={`stats-item ${selectedLine === s.line_name ? 'active' : ''}`}
                    onClick={() => { setSelectedLine(s.line_name); setPage(1); }}
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
                value={selectedLine}
                onChange={(e) => { setSelectedLine(e.target.value); setPage(1); }}
              >
                <option value="">全路線</option>
                {lines.map((line) => (
                  <option key={line} value={line}>{line}</option>
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
              <p className="empty-desc">クロールを実行してデータを取得してください</p>
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
      {/* 이미지 플레이스홀더 */}
      <div className="card-image">
        <div className="image-placeholder">
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
              <span className="spec-value">{p.year_built || '-'}</span>
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
