// Single source of truth for category metadata.
// Previously split across CC / CB / CI which was error-prone to keep in sync.
export const CATEGORIES = {
  // Recurring / daily
  充電:      { color: '#378ADD', bg: '#E6F1FB', icon: '⚡',  type: 'r' },
  停車:      { color: '#7F77DD', bg: '#EEEDFE', icon: '🅿️', type: 'r' },
  過路費:    { color: '#BA7517', bg: '#FAEEDA', icon: '🛣️', type: 'r' },
  保險:      { color: '#D4537E', bg: '#FBEAF0', icon: '🛡️', type: 'r' },
  保養:      { color: '#1D9E75', bg: '#E1F5EE', icon: '🔧', type: 'r' },
  洗車:      { color: '#639922', bg: '#EAF3DE', icon: '🚿', type: 'r' },
  罰單:      { color: '#E24B4A', bg: '#FCEBEB', icon: '📋', type: 'r' },
  其他:      { color: '#888780', bg: '#F1EFE8', icon: '📦', type: 'r' },
  // One-off modifications
  貼膜:      { color: '#533AB7', bg: '#EEEDFE', icon: '🎨', type: 'o' },
  改避震:    { color: '#5DCAA5', bg: '#E1F5EE', icon: '🔩', type: 'o' },
  充電樁:    { color: '#185FA5', bg: '#E6F1FB', icon: '🔌', type: 'o' },
  隔熱紙:    { color: '#EF9F27', bg: '#FAEEDA', icon: '🪟', type: 'o' },
  行車紀錄:  { color: '#3B6D11', bg: '#EAF3DE', icon: '📷', type: 'o' },
  底盤防鏽:  { color: '#888780', bg: '#F1EFE8', icon: '🛠️', type: 'o' },
  輪胎:      { color: '#555555', bg: '#F1EFE8', icon: '🏎️', type: 'o' },
  購車配件:  { color: '#993556', bg: '#FBEAF0', icon: '🎁', type: 'o' },
  其他改裝:  { color: '#634441', bg: '#F1EFE8', icon: '⚙️', type: 'o' },
};

export const categoriesOfType = (type) =>
  Object.keys(CATEGORIES).filter((k) => CATEGORIES[k].type === type);

export const categoryMeta = (name) =>
  CATEGORIES[name] || { color: '#888', bg: '#eee', icon: '📦', type: 'r' };
