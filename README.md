# 記帳本 Cashbook

輕量、行動優先的個人記帳 PWA。記錄日常／一次性花費、多帳本切換、貸款試算，並以 Google Apps Script + Sheets 作為跨裝置同步後端。

> 本專案前身為 [ev-tracker](https://github.com/kmes6817/ev-tracker)（電動車記帳）— 已重構為通用記帳工具，EV 模組仍可作為 preset 啟用。

## ✨ 功能

- 💰 **費用記錄** — 日常／一次性，自訂分類
- 🗂️ **多帳本** — 主帳本、家用、出差…分開統計
- 🏦 **貸款／訂閱試算** — 月供、剩餘期數、訂閱費用追蹤
- 📋 **搜尋／排序／月份篩選**
- 📊 **趨勢圖、類別佔比、預算警示**
- ⚡ **EV preset** — 充電效率、kWh、kWh/100km（電動車車主可選用）
- ☁️ **Google Sheets 同步**
- 📱 **PWA** — 離線可用、可安裝至主畫面
- 🌙 **深色模式** — 自動跟隨系統

## 🚀 快速開始

### 1. 前端

```bash
git clone https://github.com/kmes6817/cashbook.git
cd cashbook
cp config.example.js config.local.js
# 編輯 config.local.js 填入 GAS_URL 與想用的 CATEGORY_PRESET
```

直接以瀏覽器開啟 `index.html`，或用任一靜態 server：

```bash
npm run serve
# http://localhost:8000
```

### 2. 後端（Google Apps Script）

1. 建立 Google 試算表，複製 Sheet ID
2. `擴充功能` → `Apps Script` → 貼上 `gas/Code.gs`
3. 在 Apps Script `專案設定` → `Script Properties` 設定 `SHEET_ID` 與 `SHARED_TOKEN`
4. `部署` → `新增部署` → 類型 = `網頁應用程式`，執行身份 = `我`，存取權限 = `任何人`
5. 複製部署 URL，填入 `config.local.js`

### 3. 資料 Schema

`records` sheet：
| id | ledger | cat | amt | date | type (r\|o) | desc | kwh | odo |

`recurring` sheet（取代舊的 `loan` sheet）：
| id | ledger | kind (loan\|subscription\|rent) | name | amount | category | start | end | every_n_months | principal | rate | months |

舊的 `loan` 表會在第一次啟動時自動遷移為 `recurring` 中的一筆 `loan` 紀錄。

## 🧪 開發

```bash
npm install
npm run lint
npm run format
npm test
```

## 🔒 安全備註

**GAS_URL 不是 secret 但是 capability token** — 知道 URL 就能寫入。因此：

- ✅ `config.local.js` 已 gitignore
- ✅ 後端會驗證 `token` 欄位（`SHARED_TOKEN`）
- ⚠️ 公開分享請改用 OAuth 後端（Firebase、Supabase）

## 📄 License

MIT — 見 [LICENSE](LICENSE)
