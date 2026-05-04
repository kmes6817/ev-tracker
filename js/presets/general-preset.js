// General preset — everyday personal-finance categories.
// Type 'r' = recurring/daily, 'o' = one-off / occasional larger spend.
export const PRESET_NAME = '一般記帳';

export const CATEGORIES = {
  // Recurring / daily
  餐飲: { color: '#E27B3A', bg: '#FAE7D7', icon: 'utensils', type: 'r' },
  交通: { color: '#378ADD', bg: '#E6F1FB', icon: 'road', type: 'r' },
  日用: { color: '#888780', bg: '#F1EFE8', icon: 'package', type: 'r' },
  娛樂: { color: '#7F77DD', bg: '#EEEDFE', icon: 'sparkles', type: 'r' },
  訂閱: { color: '#5DCAA5', bg: '#E1F5EE', icon: 'sliders', type: 'r' },
  醫療: { color: '#D4537E', bg: '#FBEAF0', icon: 'shield', type: 'r' },
  居家: { color: '#1D9E75', bg: '#E1F5EE', icon: 'landmark', type: 'r' },
  通訊: { color: '#185FA5', bg: '#E6F1FB', icon: 'plug', type: 'r' },
  其他: { color: '#888780', bg: '#F1EFE8', icon: 'package', type: 'r' },
  // One-off / larger spend
  旅遊: { color: '#EF9F27', bg: '#FAEEDA', icon: 'sun', type: 'o' },
  家電: { color: '#533AB7', bg: '#EEEDFE', icon: 'plug', type: 'o' },
  家具: { color: '#634441', bg: '#F1EFE8', icon: 'layers', type: 'o' },
  '3C 數位': { color: '#378ADD', bg: '#E6F1FB', icon: 'camera', type: 'o' },
  服飾: { color: '#993556', bg: '#FBEAF0', icon: 'gift', type: 'o' },
  禮物: { color: '#BA7517', bg: '#FAEEDA', icon: 'gift', type: 'o' },
  教育: { color: '#3B6D11', bg: '#EAF3DE', icon: 'list-check', type: 'o' },
  其他大筆: { color: '#555555', bg: '#F1EFE8', icon: 'sliders', type: 'o' },
};
