import {
  $,
  escapeHtml,
  uuid,
  todayISO,
  currentYearMonth,
  monthsBetween,
  monthlyPayment,
  safeParseFloat,
  safeParseInt,
  toast,
} from './util.js';
import { CATEGORIES, categoriesOfType, categoryMeta } from './categories.js';
import { api } from './api.js';

const state = {
  tab: 'add',
  recs: [],
  loan: null,
  editId: null,
  swipedId: null,
  fType: 'r',
  fCat: '',
  mFilter: 'all',
  tFilter: 'all',
  sort: 'date_desc',
  cMonth: 'all',
  touch: null,
};

const app = {
  async load() {
    this.setSync('loading', '載入中…');
    try {
      const data = await api.load();
      state.recs = data.records;
      state.loan = data.loan;
      this.fillLoanForm();
      this.setSync('ok', '已同步 ' + this.nowHHMM());
      this.renderAll();
      // Retry any offline writes
      if (api.hasPending()) {
        try {
          await api.flushPending();
          this.setSync('ok', '已同步 ' + this.nowHHMM());
        } catch {
          this.setSync('error', '部分變更待同步');
        }
      }
    } catch (e) {
      this.setSync('error', '連線失敗：' + e.message);
      const local = api.loadLocal();
      state.recs = local.records;
      state.loan = local.loan;
      this.fillLoanForm();
      this.renderAll();
    }
  },

  async save() {
    this.setSync('loading', '同步中…');
    try {
      await api.save({ records: state.recs, loan: state.loan });
      this.setSync('ok', '已同步 ' + this.nowHHMM());
    } catch {
      this.setSync('error', '離線 — 已暫存,下次連線自動重送');
    }
  },

  fillLoanForm() {
    if (!state.loan) return;
    $('#l-price').value = state.loan.price ?? '';
    $('#l-down').value = state.loan.down ?? '';
    $('#l-rate').value = state.loan.rate ?? '';
    $('#l-months').value = state.loan.months ?? '';
    $('#l-start').value = state.loan.start || todayISO();
  },

  nowHHMM() {
    return new Date().toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' });
  },

  setSync(status, msg) {
    const colors = { idle: 'var(--text-ghost)', loading: 'var(--warn-text)', ok: 'var(--success)', error: 'var(--danger)' };
    const icons = { idle: '○', loading: '⟳', ok: '✓', error: '✕' };
    const el = $('#sync-msg');
    el.style.color = colors[status];
    el.textContent = `${icons[status]} ${msg}`;
  },

  setType(t) {
    state.fType = t;
    state.fCat = '';
    document.querySelectorAll('.type-btn').forEach((b) => b.classList.toggle('on', b.dataset.type === t));
    $('#brand-field').classList.toggle('hide', t !== 'o');
    this.renderCats();
  },

  selCat(c) {
    state.fCat = c;
    this.renderCats();
  },

  renderCats() {
    const cats = categoriesOfType(state.fType);
    $('#cat-grid').innerHTML = cats
      .map((c) => {
        const meta = categoryMeta(c);
        const on = state.fCat === c;
        const style = on ? `border-color:${meta.color};background:${meta.bg};color:${meta.color}` : '';
        return `<button type="button" class="cat-btn ${on ? 'sel' : ''}" data-action="selCat" data-cat="${escapeHtml(c)}" style="${style}" aria-pressed="${on}">
          <span class="ci" aria-hidden="true">${meta.icon}</span>${escapeHtml(c)}
        </button>`;
      })
      .join('');
  },

  copyLast() {
    if (!state.recs.length) return;
    const r = state.recs[0];
    this.setType(r.type);
    state.fCat = r.cat;
    $('#f-amt').value = r.amt;
    $('#f-date').value = r.date;
    $('#f-brand').value = r.brand || '';
    $('#f-note').value = r.note || '';
    this.renderCats();
  },

  renderCopyLast() {
    const btn = $('#copy-last');
    if (state.editId || !state.recs.length) {
      btn.classList.add('hide');
      return;
    }
    const r = state.recs[0];
    const meta = categoryMeta(r.cat);
    btn.classList.remove('hide');
    btn.innerHTML = `📋 複製上一筆 — <span aria-hidden="true">${meta.icon}</span> ${escapeHtml(r.cat)} · $${r.amt.toLocaleString()}`;
  },

  renderEditBar() {
    const el = $('#edit-bar');
    const btn = $('#btn-submit');
    if (state.editId) {
      el.classList.remove('hide');
      el.className = 'edit-bar';
      el.innerHTML = `<span>✏️ 編輯模式</span><button type="button" data-action="cancelEdit">取消</button>`;
      btn.className = 'btn-primary ok';
      btn.textContent = '✓ 儲存修改';
    } else {
      el.classList.add('hide');
      btn.className = 'btn-primary';
      btn.textContent = '＋ 新增';
    }
  },

  cancelEdit() {
    state.editId = null;
    this.clearForm();
    this.renderEditBar();
  },

  clearForm() {
    $('#f-amt').value = '';
    $('#f-note').value = '';
    $('#f-brand').value = '';
  },

  submitForm() {
    if (!state.fCat) return toast('請選擇類別', 'error');
    const amt = safeParseFloat($('#f-amt').value);
    const date = $('#f-date').value;
    if (amt <= 0) return toast('請填寫有效金額', 'error');
    if (!date) return toast('請填寫日期', 'error');
    const rec = {
      cat: state.fCat,
      amt,
      date,
      brand: $('#f-brand').value.trim(),
      note: $('#f-note').value.trim(),
      type: state.fType,
    };
    if (state.editId) {
      state.recs = state.recs.map((r) => (r.id === state.editId ? { ...r, ...rec } : r));
      state.editId = null;
      toast('已更新');
      this.switchTab('list');
    } else {
      rec.id = uuid();
      state.recs = [rec, ...state.recs];
      const btn = $('#btn-submit');
      btn.textContent = '✓ 已新增';
      btn.className = 'btn-primary ok';
      setTimeout(() => {
        btn.textContent = '＋ 新增';
        btn.className = 'btn-primary';
      }, 1200);
    }
    this.clearForm();
    this.save();
    this.renderAll();
  },

  openEdit(id) {
    const r = state.recs.find((x) => x.id === id);
    if (!r) return;
    state.editId = id;
    this.setType(r.type);
    state.fCat = r.cat;
    $('#f-amt').value = r.amt;
    $('#f-date').value = r.date;
    $('#f-brand').value = r.brand || '';
    $('#f-note').value = r.note || '';
    this.switchTab('add');
  },

  delRec(id) {
    if (!confirm('確定刪除這筆記錄?')) return;
    state.recs = state.recs.filter((r) => r.id !== id);
    state.swipedId = null;
    toast('已刪除');
    this.save();
    this.renderAll();
  },

  saveLoan() {
    const price = safeParseFloat($('#l-price').value);
    const months = safeParseInt($('#l-months').value);
    if (price <= 0) return toast('請填寫車價', 'error');
    if (months <= 0) return toast('請填寫期數', 'error');
    state.loan = {
      price,
      months,
      down: safeParseFloat($('#l-down').value),
      rate: safeParseFloat($('#l-rate').value),
      start: $('#l-start').value || todayISO(),
    };
    const btn = $('#btn-loan');
    btn.textContent = '✓ 已儲存';
    btn.classList.add('ok');
    setTimeout(() => {
      btn.textContent = '儲存貸款設定';
      btn.classList.remove('ok');
    }, 1200);
    this.save();
    this.renderAll();
  },

  // Touch swipe
  touchStart(e, id) {
    state.touch = { x: e.touches[0].clientX, y: e.touches[0].clientY, id };
    if (state.swipedId && state.swipedId !== id) {
      state.swipedId = null;
      this.renderList();
    }
  },
  touchEnd(e, id) {
    if (!state.touch) return;
    const dx = e.changedTouches[0].clientX - state.touch.x;
    const dy = e.changedTouches[0].clientY - state.touch.y;
    if (Math.abs(dx) > Math.abs(dy) * 1.2 && dx < -44) {
      state.swipedId = id;
      this.renderList();
    } else if (state.swipedId === id) {
      state.swipedId = null;
      this.renderList();
    }
    state.touch = null;
  },

  switchTab(t) {
    state.tab = t;
    ['add', 'loan', 'list', 'chart'].forEach((id) => $('#tab-' + id).classList.toggle('hide', id !== t));
    this.renderNav();
    if (t !== 'add') {
      state.editId = null;
      this.clearForm();
      this.renderEditBar();
    }
    this.renderAll();
  },

  renderNav() {
    const items = [
      ['add', state.editId ? '✏️' : '➕', state.editId ? '編輯中' : '新增'],
      ['loan', '🏦', '貸款'],
      ['list', '📋', '明細'],
      ['chart', '📊', '統計'],
    ];
    $('#nav').innerHTML = items
      .map(
        ([id, icon, label]) =>
          `<button type="button" class="nav-btn ${state.tab === id ? 'on' : ''}" data-action="switchTab" data-tab="${id}" aria-current="${state.tab === id ? 'page' : 'false'}">
            <span class="nav-icon" aria-hidden="true">${icon}</span>${label}
          </button>`
      )
      .join('');
  },

  renderStats() {
    const total = state.recs.reduce((s, r) => s + r.amt, 0);
    const curTm = currentYearMonth();
    const mAmt = state.recs.filter((r) => r.date.slice(0, 7) === curTm).reduce((s, r) => s + r.amt, 0);
    const oAmt = state.recs.filter((r) => r.type === 'o').reduce((s, r) => s + r.amt, 0);
    const mo = state.loan
      ? Math.round(monthlyPayment(state.loan.price - state.loan.down, state.loan.rate, state.loan.months))
      : 0;
    const data = [
      ['總花費', `$${total.toLocaleString()}`, `${state.recs.length} 筆`],
      ['本月日常', `$${mAmt.toLocaleString()}`, curTm],
      ['本月擁車成本', `$${(mAmt + mo).toLocaleString()}`, mo ? `含月供 $${mo.toLocaleString()}` : '未設貸款'],
      ['一次性改裝', `$${oAmt.toLocaleString()}`, ''],
    ];
    $('#stats').innerHTML = data
      .map(
        ([l, v, s]) =>
          `<div class="stat"><div class="stat-l">${escapeHtml(l)}</div><div class="stat-v">${escapeHtml(v)}</div>${s ? `<div class="stat-s">${escapeHtml(s)}</div>` : ''}</div>`
      )
      .join('');
  },

  renderLoan() {
    const el = $('#loan-display');
    if (!state.loan) {
      el.innerHTML = '<div class="empty">尚未設定貸款</div>';
      return;
    }
    const p = state.loan.price - state.loan.down;
    const moA = monthlyPayment(p, state.loan.rate, state.loan.months);
    const int = moA * state.loan.months - p;
    const paid = Math.min(monthsBetween(state.loan.start), state.loan.months);
    const rem = Math.max(0, state.loan.months - paid);
    const pct = Math.round(Math.min(paid / state.loan.months, 1) * 100);
    el.innerHTML = `<div class="loan-card">
      <div class="loan-row"><span class="loan-k">每月應繳</span><span class="loan-v" style="color:var(--primary);font-size:22px">$${Math.round(moA).toLocaleString()}</span></div>
      <div class="loan-row"><span class="loan-k">貸款金額</span><span class="loan-v">$${p.toLocaleString()}</span></div>
      <div class="loan-row"><span class="loan-k">總利息</span><span class="loan-v">$${Math.round(int).toLocaleString()}</span></div>
      <div class="loan-row"><span class="loan-k">剩餘 ${rem} 期</span><span class="loan-v">$${Math.round(rem * moA).toLocaleString()}</span></div>
      <div class="progress" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100"><div class="progress-fill" style="width:${pct}%"></div></div>
      <div style="display:flex;justify-content:space-between;font-size:11px;color:var(--text-ghost)"><span>已還 ${paid} 期</span><span>${pct}%</span></div>
    </div>`;
  },

  renderList() {
    const months = [...new Set(state.recs.map((r) => r.date.slice(0, 7)))].sort().reverse();
    const mSel = $('#m-filter');
    mSel.innerHTML =
      '<option value="all">全部月份</option>' +
      months.map((m) => `<option value="${escapeHtml(m)}">${escapeHtml(m)}</option>`).join('');
    mSel.value = state.mFilter;
    $('#t-filter').value = state.tFilter;

    const sorts = [
      ['date_desc', '日期↓'],
      ['date_asc', '日期↑'],
      ['amt_desc', '金額↓'],
      ['amt_asc', '金額↑'],
    ];
    $('#sort-row').innerHTML = sorts
      .map(
        ([v, l]) =>
          `<button type="button" class="sort-btn ${state.sort === v ? 'on' : ''}" data-action="sort" data-sort="${v}">${escapeHtml(l)}</button>`
      )
      .join('');

    const search = $('#search').value.trim();
    state.mFilter = mSel.value;
    state.tFilter = $('#t-filter').value;

    let d = state.recs.filter(
      (r) =>
        (state.mFilter === 'all' || r.date.slice(0, 7) === state.mFilter) &&
        (state.tFilter === 'all' || r.type === state.tFilter) &&
        (!search ||
          r.cat.includes(search) ||
          (r.note || '').includes(search) ||
          (r.brand || '').includes(search) ||
          r.date.includes(search))
    );
    if (state.sort === 'date_desc') d.sort((a, b) => b.date.localeCompare(a.date));
    else if (state.sort === 'date_asc') d.sort((a, b) => a.date.localeCompare(b.date));
    else if (state.sort === 'amt_desc') d.sort((a, b) => b.amt - a.amt);
    else d.sort((a, b) => a.amt - b.amt);

    $('#list-count').textContent = d.length + ' 筆';
    if (!d.length) {
      $('#list').innerHTML = '<div class="empty">沒有符合的記錄</div>';
      return;
    }
    $('#list').innerHTML = d
      .map((r) => {
        const sw = state.swipedId === r.id;
        const meta = categoryMeta(r.cat);
        const safeId = escapeHtml(r.id);
        return `<div class="item">
          <div class="item-actions">
            <button type="button" class="edit" data-action="edit" data-id="${safeId}" aria-label="編輯"><span style="font-size:16px" aria-hidden="true">✏️</span>編輯</button>
            <button type="button" class="del" data-action="del" data-id="${safeId}" aria-label="刪除"><span style="font-size:16px" aria-hidden="true">🗑️</span>刪除</button>
          </div>
          <div class="item-body ${sw ? 'swiped' : ''}" data-swipe-id="${safeId}">
            <div class="cat-dot" style="background:${meta.bg}" aria-hidden="true">${meta.icon}</div>
            <div class="item-info">
              <div class="item-name">${escapeHtml(r.cat)}${r.brand ? ` · ${escapeHtml(r.brand)}` : ''}</div>
              <div class="item-meta">${escapeHtml(r.date)}<span class="pill ${r.type === 'o' ? 'pill-o' : 'pill-r'}">${r.type === 'o' ? '一次性' : '日常'}</span>${r.note ? ` · ${escapeHtml(r.note)}` : ''}</div>
            </div>
            <div class="item-right">
              <div class="item-amt" style="color:${meta.color}">$${r.amt.toLocaleString()}</div>
              <div class="hint">← 滑動</div>
            </div>
          </div>
        </div>`;
      })
      .join('');
  },

  renderChart() {
    const months = [...new Set(state.recs.map((r) => r.date.slice(0, 7)))].sort().reverse();
    const cm = $('#c-month');
    cm.innerHTML =
      '<option value="all">全部月份</option>' +
      months.map((m) => `<option value="${escapeHtml(m)}">${escapeHtml(m)}</option>`).join('');
    cm.value = state.cMonth;
    state.cMonth = cm.value;

    // Trend
    const bm = {};
    state.recs.forEach((r) => {
      const m = r.date.slice(0, 7);
      bm[m] = (bm[m] || 0) + r.amt;
    });
    const trend = Object.entries(bm).sort(([a], [b]) => a.localeCompare(b)).slice(-6);
    const curTm = currentYearMonth();
    const trendEl = $('#trend-container');
    if (trend.length > 1) {
      const maxT = Math.max(...trend.map(([, v]) => v), 1);
      trendEl.innerHTML = `<div class="sect-title" style="margin-bottom:10px">近 ${trend.length} 個月趨勢</div>
        <div class="trend-row">${trend
          .map(
            ([m, v]) =>
              `<div class="trend-bar"><div class="trend-v">${v >= 10000 ? Math.round(v / 1000) + 'k' : v >= 1000 ? (v / 1000).toFixed(1) + 'k' : v}</div><div class="trend-fill" style="height:${Math.round((v / maxT) * 64) + 4}px;opacity:${m === curTm ? 1 : 0.45}"></div></div>`
          )
          .join('')}</div>
        <div class="trend-labels">${trend.map(([m]) => `<div class="trend-label ${m === curTm ? 'cur' : ''}">${escapeHtml(m.slice(5))}</div>`).join('')}</div>`;
    } else {
      trendEl.innerHTML = '';
    }

    // Bars
    const filtered = state.recs.filter((r) => state.cMonth === 'all' || r.date.slice(0, 7) === state.cMonth);
    const grand = filtered.reduce((s, r) => s + r.amt, 0);
    const daily = {},
      once = {};
    filtered.forEach((r) => {
      if (r.type === 'o') once[r.cat] = (once[r.cat] || 0) + r.amt;
      else daily[r.cat] = (daily[r.cat] || 0) + r.amt;
    });
    const maxV = Math.max(...Object.values({ ...daily, ...once }), 1);

    const mkSec = (title, obj) => {
      if (!Object.keys(obj).length) return '';
      const tot = Object.values(obj).reduce((a, b) => a + b, 0);
      const rows = Object.entries(obj)
        .sort((a, b) => b[1] - a[1])
        .map(([c, v]) => {
          const meta = categoryMeta(c);
          return `<div class="bar-row">
            <div class="bar-label">${meta.icon} ${escapeHtml(c)}</div>
            <div class="bar-track"><div class="bar-fill" style="width:${Math.round((v / maxV) * 100)}%;background:${meta.color}"></div></div>
            <div class="bar-val">$${v.toLocaleString()} <span style="color:var(--text-ghost)">${grand ? Math.round((v / grand) * 100) : 0}%</span></div>
          </div>`;
        })
        .join('');
      return `<div class="sect-title" style="margin:14px 0 8px">${escapeHtml(title)}・$${tot.toLocaleString()}</div>${rows}`;
    };

    $('#chart').innerHTML = !grand
      ? '<div class="empty">尚無資料</div>'
      : mkSec('日常費用', daily) +
        mkSec('一次性', once) +
        `<div style="text-align:right;font-size:13px;color:var(--text-soft);margin-top:12px;padding-top:10px;border-top:0.5px solid var(--border)">總計 $${grand.toLocaleString()}</div>`;
  },

  renderAll() {
    this.renderStats();
    this.renderNav();
    this.renderEditBar();
    this.renderCopyLast();
    this.renderCats();
    if (state.tab === 'loan') this.renderLoan();
    if (state.tab === 'list') this.renderList();
    if (state.tab === 'chart') this.renderChart();
  },
};

// ========== Event delegation ==========
const handleClick = (e) => {
  const t = e.target.closest('[data-action]');
  if (!t) {
    if (state.swipedId && !e.target.closest('.item')) {
      state.swipedId = null;
      app.renderList();
    }
    return;
  }
  const action = t.dataset.action;
  switch (action) {
    case 'reload':
      return app.load();
    case 'setType':
      return app.setType(t.dataset.type);
    case 'selCat':
      return app.selCat(t.dataset.cat);
    case 'copyLast':
      return app.copyLast();
    case 'submit':
      return app.submitForm();
    case 'cancelEdit':
      return app.cancelEdit();
    case 'saveLoan':
      return app.saveLoan();
    case 'switchTab':
      return app.switchTab(t.dataset.tab);
    case 'sort':
      state.sort = t.dataset.sort;
      return app.renderList();
    case 'edit':
      return app.openEdit(t.dataset.id);
    case 'del':
      return app.delRec(t.dataset.id);
  }
};

const handleTouchStart = (e) => {
  const body = e.target.closest('[data-swipe-id]');
  if (body) app.touchStart(e, body.dataset.swipeId);
};
const handleTouchEnd = (e) => {
  const body = e.target.closest('[data-swipe-id]');
  if (body) app.touchEnd(e, body.dataset.swipeId);
};
const handleInput = (e) => {
  if (e.target.id === 'search') app.renderList();
};
const handleChange = (e) => {
  if (e.target.id === 'm-filter' || e.target.id === 't-filter') app.renderList();
  if (e.target.id === 'c-month') app.renderChart();
};

// ========== Init ==========
document.addEventListener('click', handleClick);
document.addEventListener('touchstart', handleTouchStart, { passive: true });
document.addEventListener('touchend', handleTouchEnd, { passive: true });
document.addEventListener('input', handleInput);
document.addEventListener('change', handleChange);

if (!window.EV_CONFIG || !window.EV_CONFIG.GAS_URL) {
  const warn = document.createElement('div');
  warn.style.cssText = 'background:var(--warn-bg);padding:12px 16px;border-bottom:1px solid var(--warn-border);font-size:13px;color:var(--warn-text)';
  warn.textContent = '⚠️ 尚未設定 config.local.js — 僅本機儲存,請參考 README 建立設定檔以啟用雲端同步。';
  document.body.insertBefore(warn, document.body.firstChild);
}

$('#f-date').value = todayISO();
$('#l-start').value = todayISO();
app.renderCats();
app.renderNav();

// Retry flush when connection returns
window.addEventListener('online', () => {
  if (api.hasPending()) app.load();
});

app.load();

export { app, state };
