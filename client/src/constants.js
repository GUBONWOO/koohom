export const SORT_OPTIONS = [
  { label: '新着順',           value: 'default' },
  { label: '価格↑ 安い順',    value: 'price_asc' },
  { label: '価格↓ 高い順',    value: 'price_desc' },
  { label: '徒歩↑ 近い順',    value: 'walk_asc' },
  { label: '徒歩↓ 遠い順',    value: 'walk_desc' },
  { label: '築年数↑ 新しい順', value: 'year_desc' },
  { label: '築年数↓ 古い順',  value: 'year_asc' },
];

export const WALK_OPTIONS = [
  { label: 'すべて',   max: undefined },
  { label: '5分以内',  max: 5 },
  { label: '10分以内', max: 10 },
  { label: '15分以内', max: 15 },
  { label: '20分以内', max: 20 },
  { label: '30分以内', max: 30 },
];

export const PRICE_OPTIONS = [
  { label: 'すべて',      min: undefined, max: undefined },
  { label: '2000万以下',  min: undefined, max: 2000 },
  { label: '3000万以下',  min: undefined, max: 3000 },
  { label: '4000万以下',  min: undefined, max: 4000 },
  { label: '5000万以下',  min: undefined, max: 5000 },
  { label: '5000万以上',  min: 5000,      max: undefined },
];

export const YEAR_OPTIONS = [
  { label: 'すべて',   from: undefined },
  { label: '2020年〜', from: 2020 },
  { label: '2015年〜', from: 2015 },
  { label: '2010年〜', from: 2010 },
  { label: '2005年〜', from: 2005 },
  { label: '2000年〜', from: 2000 },
  { label: '1998年〜', from: 1998 },
];

export const AREA_OPTIONS = [
  { label: 'すべて',    value: undefined },
  { label: '東京都',    value: 'tokyo' },
  { label: '埼玉県',   value: 'saitama' },
  { label: '神奈川県', value: 'kanagawa' },
  { label: '千葉県',   value: 'chiba' },
];

export const PAGE_LIMIT = 20;
