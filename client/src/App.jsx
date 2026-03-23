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
      setMessage(`크롤링 시작됨: ${line || '전체 노선'} (백그라운드 실행 중...)`);
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
      <header className="header">
        <h1>🏠 SUUMO 사이타마 단독주택</h1>
        <p>埼京線 / 京浜東北線 / 副都心線 / 有楽町線 &nbsp;|&nbsp; 5000万円以下</p>
      </header>

      {stats && (
        <div className="stats-bar">
          <span>전체: <strong>{stats.total.toLocaleString()}건</strong></span>
          {stats.byLine.map((s) => (
            <span key={s.line_name}>
              {s.line_name}: <strong>{parseInt(s.count).toLocaleString()}건</strong>
            </span>
          ))}
        </div>
      )}

      <div className="crawl-panel">
        <button className="btn btn-primary" onClick={() => handleCrawl(null)} disabled={crawling}>
          {crawling ? '크롤링 중...' : '전체 노선 크롤링'}
        </button>
        {lines.map((line) => (
          <button key={line} className="btn btn-secondary" onClick={() => handleCrawl(line)} disabled={crawling}>
            {line}
          </button>
        ))}
        {message && <span className="message">{message}</span>}
      </div>

      <div className="filter-bar">
        <select value={selectedLine} onChange={(e) => { setSelectedLine(e.target.value); setPage(1); }}>
          <option value="">전체 노선</option>
          {lines.map((line) => <option key={line} value={line}>{line}</option>)}
        </select>
        <span className="total-count">총 {total.toLocaleString()}건</span>
      </div>

      {loading ? (
        <div className="loading">불러오는 중...</div>
      ) : properties.length === 0 ? (
        <div className="empty">매물이 없습니다. 크롤링을 먼저 실행해 주세요.</div>
      ) : (
        <div className="property-grid">
          {properties.map((p) => <PropertyCard key={p.id} property={p} />)}
        </div>
      )}

      {totalPages > 1 && (
        <div className="pagination">
          <button onClick={() => setPage((v) => Math.max(1, v - 1))} disabled={page === 1}>이전</button>
          <span>{page} / {totalPages}</span>
          <button onClick={() => setPage((v) => Math.min(totalPages, v + 1))} disabled={page === totalPages}>다음</button>
        </div>
      )}
    </div>
  );
}

function PropertyCard({ property: p }) {
  return (
    <div className="card">
      <div className="card-header">
        <span className="price">{p.price}</span>
        <span className="line-badge">{p.line_name}</span>
      </div>
      <div className="card-body">
        {p.name && <div className="prop-name">{p.name}</div>}
        <div className="prop-row"><span>소재지</span><span>{p.address || '-'}</span></div>
        <div className="prop-row"><span>교통</span><span>{p.transport || '-'}</span></div>
        <div className="prop-row"><span>토지면적</span><span>{p.land_area || '-'}</span></div>
        <div className="prop-row"><span>건물면적</span><span>{p.building_area || '-'}</span></div>
        <div className="prop-row"><span>간取り</span><span>{p.layout || '-'}</span></div>
        <div className="prop-row"><span>築年月</span><span>{p.year_built || '-'}</span></div>
      </div>
      {p.suumo_url && (
        <a className="card-link" href={p.suumo_url} target="_blank" rel="noreferrer">
          SUUMO에서 보기 →
        </a>
      )}
    </div>
  );
}
