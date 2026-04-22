# EV 費用追蹤 (EV Tracker)

輕量、行動優先的電動車費用追蹤 PWA。記錄日常/一次性花費、貸款試算,並以 Google Apps Script + Sheets 作為跨裝置同步後端。

![screenshot placeholder](docs/screenshot.png)

## ✨ 功能

- 💰 **費用記錄** — 日常(充電/保險/保養...) + 一次性(貼膜/避震...)
- 🏦 **貸款試算** — 月供、剩餘期數、還款進度條
- 📋 **搜尋 / 排序 / 月份篩選**
- 📊 **趨勢圖 + 類別佔比**
- ☁️ **Google Sheets 同步** — 多裝置共用
- 📱 **PWA** — 可安裝到主畫面、離線可用
- 🌙 **深色模式** — 自動跟隨系統

## 🚀 快速開始

### 1. 前端

```bash
git clone https://github.com/kmes6817/ev-tracker.git
cd ev-tracker
cp config.example.js config.local.js
# 編輯 config.local.js 填入你的 GAS_URL
```

直接以瀏覽器開啟 `index.html`,或用任一靜態 server:
```bash
python3 -m http.server 8000
# 瀏覽 http://localhost:8000
```

### 2. 後端(Google Apps Script)

1. 建立 Google 試算表,複製 Sheet ID
2. `擴充功能` → `Apps Script` → 貼上 `gas/Code.gs`(見 `gas/` 目錄)
3. 替換 `SHEET_ID` 和 `SHARED_TOKEN`(隨機字串,當作簡易認證)
4. `部署` → `新增部署` → 類型 = `網頁應用程式`,執行身份 = `我`,存取權限 = `任何人`
5. 複製部署 URL,填入 `config.local.js`

### 3. 資料 Schema

`records` sheet (欄位):
| id (string UUID) | cat | amt (number) | date (yyyy-mm-dd) | type ('r'\|'o') | brand | note |

`loan` sheet (single row):
| price | down | rate | months | start |

## 🧪 開發

```bash
npm install       # 安裝 lint / format 工具
npm run lint      # ESLint
npm run format    # Prettier
```

## 🔒 安全備註

**GAS_URL 本身不是 secret**(Apps Script web app 部署 URL),但它是 capability token — 知道 URL 就能寫入資料。因此:

- ✅ `config.local.js` 已 gitignore
- ✅ 後端應驗證 `token` 欄位(見 `gas/Code.gs`)
- ⚠️ 若要公開分享,請改用有 OAuth 的後端(Firebase、Supabase)

## 📁 專案結構

```
ev-tracker/
├── index.html           # 入口
├── css/app.css          # 樣式
├── js/
│   ├── app.js           # 主程式
│   ├── api.js           # GAS 同步層
│   └── util.js          # helpers (escape, uuid, ...)
├── config.example.js    # 設定範本
├── config.local.js      # 個人設定 (gitignored)
├── manifest.webmanifest # PWA manifest
├── sw.js                # Service Worker
└── gas/Code.gs          # Apps Script 後端
```

## 📄 License

MIT — 見 [LICENSE](LICENSE)
