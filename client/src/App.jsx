import { useState, useEffect, useCallback, useRef } from 'react';
import { getProperties, getStats } from './api';
import PropertyCard from './PropertyCard';
import FilterBar from './FilterBar';
import Pagination from './Pagination';
import { IconChart, IconMoon, IconSun, IconHome } from './icons';
import { SORT_OPTIONS, PRICE_OPTIONS, YEAR_OPTIONS, WALK_OPTIONS, AREA_OPTIONS, PAGE_LIMIT } from './constants';
import './App.css';

export default function App() {
  const [properties, setProperties] = useState([]);
  const [stats, setStats]           = useState(null);
  const [selectedLine, setSelectedLine] = useState('');
  const [areaIdx, setAreaIdx]       = useState(0);
  const [priceIdx, setPriceIdx]     = useState(0);
  const [yearIdx, setYearIdx]       = useState(0);
  const [walkIdx, setWalkIdx]       = useState(0);
  const [page, setPage]             = useState(1);
  const [total, setTotal]           = useState(0);
  const isPageChange                = useRef(false);
  const abortRef                    = useRef(null);
  const [loading, setLoading]       = useState(false);
  const [sortBy, setSortBy]         = useState('default');
  const [darkMode, setDarkMode]     = useState(
    () => window.matchMedia('(prefers-color-scheme: dark)').matches
  );

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  const fetchProperties = useCallback(async () => {
    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();
    const signal = abortRef.current.signal;

    setLoading(true);
    const area  = AREA_OPTIONS[areaIdx];
    const price = PRICE_OPTIONS[priceIdx];
    const year  = YEAR_OPTIONS[yearIdx];
    const walk  = WALK_OPTIONS[walkIdx];
    try {
      const skipCount = isPageChange.current;
      const res = await getProperties({
        line:      selectedLine || undefined,
        area:      area.value,
        priceMin:  price.min,
        priceMax:  price.max,
        yearFrom:  year.from,
        walkMax:   walk.max,
        sortBy:    sortBy !== 'default' ? sortBy : undefined,
        page,
        limit:     PAGE_LIMIT,
        skipCount: skipCount ? 'true' : undefined,
      }, signal);
      isPageChange.current = false;
      setProperties(res.data.data);
      if (res.data.total !== null) setTotal(res.data.total);
    } catch (e) {
      if (e.name !== 'CanceledError') console.error(e);
    } finally {
      setLoading(false);
    }
  }, [selectedLine, areaIdx, priceIdx, yearIdx, walkIdx, sortBy, page]);

  useEffect(() => {
    getStats().then((r) => setStats(r.data)).catch(() => {});
  }, []);

  useEffect(() => {
    fetchProperties();
  }, [fetchProperties]);

  const handlePageChange = (p) => {
    isPageChange.current = true;
    setPage(p);
  };

  const handleFilter = (setter) => (val) => {
    isPageChange.current = false;
    setter(val);
    setPage(1);
  };

  const totalPages = Math.ceil(total / PAGE_LIMIT);

  return (
    <div className="app">
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

        <main className="main-content">
          <FilterBar
            areaIdx={areaIdx}    onArea={handleFilter(setAreaIdx)}
            priceIdx={priceIdx}  onPrice={handleFilter(setPriceIdx)}
            walkIdx={walkIdx}    onWalk={handleFilter(setWalkIdx)}
            yearIdx={yearIdx}    onYear={handleFilter(setYearIdx)}
          />

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

          {totalPages > 1 && (
            <Pagination page={page} totalPages={totalPages} onPage={handlePageChange} />
          )}
        </main>
      </div>
    </div>
  );
}
