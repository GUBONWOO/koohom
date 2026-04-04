import { IconPin, IconTrain, IconHome } from './icons';

export default function PropertyCard({ property: p }) {
  return (
    <div className="card">
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
