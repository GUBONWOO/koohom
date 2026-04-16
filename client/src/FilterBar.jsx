import { PRICE_OPTIONS, WALK_OPTIONS, YEAR_OPTIONS, AREA_OPTIONS, TYPE_OPTIONS } from './constants';

export default function FilterBar({ typeIdx, onType, priceIdx, onPrice, walkIdx, onWalk, yearIdx, onYear, areaIdx, onArea }) {
  const isShinchiku = TYPE_OPTIONS[typeIdx]?.value === 'shinchiku';
  return (
    <div className="filter-bar">
      <FilterGroup label="種別"  options={TYPE_OPTIONS}  activeIdx={typeIdx}  onSelect={onType} />
      <FilterGroup label="エリア" options={AREA_OPTIONS}  activeIdx={areaIdx}  onSelect={onArea} />
      <FilterGroup label="価格"  options={PRICE_OPTIONS} activeIdx={priceIdx} onSelect={onPrice} />
      <FilterGroup label="徒歩"  options={WALK_OPTIONS}  activeIdx={walkIdx}  onSelect={onWalk} />
      <FilterGroup label="築年数" options={YEAR_OPTIONS}  activeIdx={yearIdx}  onSelect={onYear} disabled={isShinchiku} />
    </div>
  );
}

function FilterGroup({ label, options, activeIdx, onSelect, disabled }) {
  return (
    <div className={`filter-group ${disabled ? 'filter-group--disabled' : ''}`}>
      <span className="filter-group-label">{label}</span>
      <div className="filter-chips">
        {options.map((opt, i) => (
          <button
            key={i}
            className={`filter-chip ${activeIdx === i ? 'active' : ''}`}
            onClick={() => !disabled && onSelect(i)}
            disabled={disabled}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}
