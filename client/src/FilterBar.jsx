import { PRICE_OPTIONS, WALK_OPTIONS, YEAR_OPTIONS, AREA_OPTIONS } from './constants';

export default function FilterBar({ priceIdx, onPrice, walkIdx, onWalk, yearIdx, onYear, areaIdx, onArea }) {
  return (
    <div className="filter-bar">
      <FilterGroup label="エリア" options={AREA_OPTIONS}  activeIdx={areaIdx}  onSelect={onArea} />
      <FilterGroup label="価格"  options={PRICE_OPTIONS} activeIdx={priceIdx} onSelect={onPrice} />
      <FilterGroup label="徒歩"  options={WALK_OPTIONS}  activeIdx={walkIdx}  onSelect={onWalk} />
      <FilterGroup label="築年数" options={YEAR_OPTIONS}  activeIdx={yearIdx}  onSelect={onYear} />
    </div>
  );
}

function FilterGroup({ label, options, activeIdx, onSelect }) {
  return (
    <div className="filter-group">
      <span className="filter-group-label">{label}</span>
      <div className="filter-chips">
        {options.map((opt, i) => (
          <button
            key={i}
            className={`filter-chip ${activeIdx === i ? 'active' : ''}`}
            onClick={() => onSelect(i)}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}
