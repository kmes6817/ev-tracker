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
import { categoriesOfType, categoryMeta } from './categories.js';
import { computeEvStats } from './evStats.js';
import { recordsToCsv, csvToRecords, mergeImported, downloadBlob } from './csv.js';
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
  lastSyncAt: null,
};

const app = {
  /**
   * Cache-first load:
   *   1. Paint localStorage data immediately (feels instant)
   *   2. Kick off GAS fetch in background
   *   3. When it returns, update state + re-render only if data changed
   */
  async load() {
    // Step 1 — paint local cache
    const local = api.loadLocal();
    if (local.records.length || local.loan) {
      state.recs = local.records;
      state.loan = local.loan;
      this.fillLoanForm();
      this.renderAll();
    }

    this.setSync('loading', local.records.length ? '同步中…' : '載入中…');

    // Step 2 — network fetch (non-blocking for first paint)
    try {
      const data = await api.load();
      const changed =
        JSON.stringify(data.records) !== JSON.stringify(state.recs) ||
        JSON.stringify(data.loan) !== JSON.stringify(state.loan);
      state.recs = data.records;
      state.loan = data.loan;
      state.lastSyncAt = Date.now();
      this.fillLoanForm();
      this.setSyncFresh();
      if (changed) this.renderAll();

      // Step 3 — retry any offline writes
      if (api.hasPending()) {
        try {
          await api.flushPending();
          this.setSyncFresh();
        } catch {
          this.setSync('error', '部分變更待同步');
        }
      }
    } catch (e) {
      if (!state.recs.length && !state.loan) {
        // no cache and no network — show the real error
        this.setSync('error', '連線失敗:' + e.message);
      } else {
        this.setSync('error', '離線 — 顯示本機資料');
      }
    }
  },

  async save() {
    this.setSync('loading', '同步中…');
    try {
      await api.save({ records: state.recs, loan: state.loan });
      state.lastSyncAt = Date.now();
      this.setSyncFresh();
    } catch {
      this.setSync('error', '離線 — 已暫存,下次連線自動重送');
    }
  },

  /** Human-friendly relative time — '剛剛', '2 分鐘前', '1 小時前'. */
  setSyncFresh() {
    if (!state.lastSyncAt) return this.setSync('ok', '已同步');
    const diff = Math.round((Date.now() - state.lastSyncAt) / 1000);
    let label;
    if (diff < 10) label = '剛剛同步';
    else if (diff < 60) label = `${diff} 秒前同步`;
    else if (diff < 3600) label = `${Math.floor(diff / 60)} 分鐘前同步`;
    else if (diff < 86400) label = `${Math.floor(diff / 3600)} 小時前同步`;
    else label = `${Math.floor(diff / 86400)} 天前同步`;
    this.setSync('ok', label);
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
    const colors = {
      idle: 'var(--text-ghost)',
      loading: 'var(--warn-text)',
      ok: 'var(--success)',
      error: 'var(--danger)',
    };
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
    $('#ev-fields').classList.add('hide'); // kwh/odo only relevant when cat === '充電'
    this.renderCats();
  },

  selCat(c) {
    state.fCat = c;
    $('#ev-fields').classList.toggle('hide', c !== '充電');
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
    $('#f-kwh').value = r.kwh || '';
    $('#f-odo').value = r.odo || '';
    $('#ev-fields').classList.toggle('hide', r.cat !== '充電');
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
    $('#f-kwh').value = '';
    $('#f-odo').value = '';
  },

  submitForm() {
    if (!state.fCat) return toast('請選擇類別', 'error');
    const amt = safeParseFloat($('#f-amt').value);
    const date = $('#f-date').value;
    if (amt <= 0) return toast('請填寫有效金額', 'error');
    if (!date) return toast('請填寫日期', 'error');
    const kwh = safeParseFloat($('#f-kwh').value);
    const odo = safeParseInt($('#f-odo').value);
    const rec = {
      cat: state.fCat,
      amt,
      date,
      brand: $('#f-brand').value.trim(),
      note: $('#f-note').value.trim(),
      type: state.fType,
      ...(state.fCat === '充電' && kwh > 0 ? { kwh } : {}),
      ...(state.fCat === '充電' && odo > 0 ? { odo } : {}),
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
    $('#f-kwh').value = r.kwh || '';
    $('#f-odo').value = r.odo || '';
    $('#ev-fields').classList.toggle('hide', r.cat !== '充電');
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

  exportCsv() {
    if (!state.recs.length) return toast('沒有記錄可匯出', 'error');
    const stamp = todayISO().replace(/-/g, '');
    downloadBlob(recordsToCsv(state.recs), `ev-tracker-${stamp}.csv`);
    toast(`已匯出 ${state.recs.length} 筆`);
  },

  triggerImport() {
    $('#csv-file').click();
  },

  async importCsvFile(file) {
    try {
      const text = await file.text();
      const parsed = csvToRecords(text);
      if (!parsed.length) return toast('CSV 沒有有效資料', 'error');
      const before = state.recs.length;
      state.recs = mergeImported(state.recs, parsed, uuid);
      const added = state.recs.length - before;
      toast(`匯入完成:新增 ${added},更新 ${parsed.length - added}`);
      this.save();
      this.renderAll();
    } catch (e) {
      toast('匯入失敗:' + e.message, 'error');
    }
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
    if (!state.recs.length && !state.loan) {
      $('#stats').innerHTML = `<div class="onboarding">
        <div style="font-size:32px;margin-bottom:8px">👋</div>
        <div style="font-weight:500;margin-bottom:4px">歡迎使用 EV 費用追蹤</div>
        <div style="font-size:12px;color:var(--text-soft)">從下方選一個類別,填入金額就能開始記錄。先設貸款可看到每月總擁車成本。</div>
      </div>`;
      return;
    }
    const total = state.recs.reduce((s, r) => s + r.amt, 0);
    const curTm = currentYearMonth();
    const mAmt = state.recs.filter((r) => r.date.slice(0, 7) === curTm).reduce((s, r) => s + r.amt, 0);
    const oAmt = state.recs.filter((r) => r.type === 'o').reduce((s, r) => s + r.amt, 0);

    const today = todayISO();
    const loanActive = !!state.loan && state.loan.start <= today;
    const moFull = state.loan
      ? Math.round(monthlyPayment(state.loan.price - state.loan.down, state.loan.rate, state.loan.months))
      : 0;
    const moEffective = loanActive ? moFull : 0;

    let costSub;
    if (!state.loan) costSub = '未設貸款';
    else if (!loanActive) costSub = `貸款 ${state.loan.start} 起算(月供 $${moFull.toLocaleString()})`;
    else costSub = `含月供 $${moFull.toLocaleString()}`;

    // Hero comes first — the one number that matters
    const data = [
      {
        label: '本月擁車成本',
        value: `$${(mAmt + moEffective).toLocaleString()}`,
        sub: costSub,
        hero: true,
      },
      { label: '本月日常', value: `$${mAmt.toLocaleString()}`, sub: curTm },
      { label: '總花費', value: `$${total.toLocaleString()}`, sub: `${state.recs.length} 筆` },
      { label: '一次性改裝', value: `$${oAmt.toLocaleString()}`, sub: '' },
    ];
    $('#stats').innerHTML = data
      .map(
        (d) =>
          `<div class="stat${d.hero ? ' hero' : ''}"><div class="stat-l">${escapeHtml(d.label)}</div><div class="stat-v">${escapeHtml(d.value)}</div>${d.sub ? `<div class="stat-s">${escapeHtml(d.sub)}</div>` : ''}</div>`
      )
      .join('');
  },

  renderEvStats() {
    const el = $('#ev-stats');
    if (!el) return;
    const ym = state.cMonth === 'all' ? null : state.cMonth;
    const s = computeEvStats(state.recs, ym);
    if (s.sessions === 0) {
      el.innerHTML = '';
      return;
    }
    const fmt = (n, digits = 0) =>
      n > 0
        ? n.toLocaleString('zh-TW', { maximumFractionDigits: digits, minimumFractionDigits: digits })
        : '—';
    const scope = ym ? ym : '累計';
    el.innerHTML = `<div class="ev-stats">
      <div class="sect-title" style="margin-bottom:8px">⚡ EV 指標 · ${escapeHtml(scope)}</div>
      <div class="ev-grid">
        <div class="ev-cell"><div class="ev-l">充電次數</div><div class="ev-v">${s.sessions}</div></div>
        <div class="ev-cell"><div class="ev-l">總度數</div><div class="ev-v">${fmt(s.totalKwh, 1)} <span class="ev-u">kWh</span></div></div>
        <div class="ev-cell"><div class="ev-l">里程</div><div class="ev-v">${fmt(s.km)} <span class="ev-u">km</span></div></div>
        <div class="ev-cell"><div class="ev-l">元/kWh</div><div class="ev-v">$${fmt(s.pricePerKwh, 2)}</div></div>
        <div class="ev-cell"><div class="ev-l">元/km</div><div class="ev-v">$${fmt(s.costPerKm, 2)}</div></div>
        <div class="ev-cell"><div class="ev-l">kWh/100km</div><div class="ev-v">${fmt(s.kwhPer100km, 1)}</div></div>
      </div>
    </div>`;
  },

  renderLoan() {
    const el = $('#loan-display');
    if (!state.loan) {
      el.innerHTML = `<div class="empty-state">
        <div class="empty-icon">🏦</div>
        <div class="empty-title">尚未設定貸款</div>
        <div class="empty-sub">填入車價、期數就能算每月應繳與總擁車成本</div>
      </div>`;
      return;
    }
    const p = state.loan.price - state.loan.down;
    const moA = monthlyPayment(p, state.loan.rate, state.loan.months);
    const int = moA * state.loan.months - p;
    const today = todayISO();
    const notStarted = state.loan.start > today;
    const paid = notStarted ? 0 : Math.min(monthsBetween(state.loan.start), state.loan.months);
    const rem = Math.max(0, state.loan.months - paid);
    const pct = Math.round(Math.min(paid / state.loan.months, 1) * 100);

    let banner = '';
    let footer = `<span>已還 ${paid} 期</span><span>${pct}%</span>`;
    if (notStarted) {
      const daysUntil = Math.ceil((new Date(state.loan.start) - new Date(today)) / 86400000);
      banner = `<div class="loan-status pending" role="status">🕒 尚未開始 · 首期 ${state.loan.start}${daysUntil > 0 ? ` (還有 ${daysUntil} 天)` : ''}</div>`;
      footer = `<span>尚未起算</span><span>${state.loan.months} 期 / ${moA > 0 ? Math.round(moA * state.loan.months).toLocaleString() : 0} 元</span>`;
    } else if (rem === 0) {
      banner = `<div class="loan-status done" role="status">✓ 已清償</div>`;
    }

    const moLabel = notStarted ? '每月將繳' : '每月應繳';
    el.innerHTML = `<div class="loan-card">
      ${banner}
      <div class="loan-row"><span class="loan-k">${moLabel}</span><span class="loan-v loan-hero">$${Math.round(moA).toLocaleString()}</span></div>
      <div class="loan-row"><span class="loan-k">貸款金額</span><span class="loan-v">$${p.toLocaleString()}</span></div>
      <div class="loan-row"><span class="loan-k">總利息</span><span class="loan-v">$${Math.round(int).toLocaleString()}</span></div>
      <div class="loan-row"><span class="loan-k">${notStarted ? '總期數' : `剩餘 ${rem} 期`}</span><span class="loan-v">$${Math.round((notStarted ? state.loan.months : rem) * moA).toLocaleString()}</span></div>
      <div class="progress" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100"><div class="progress-fill" style="width:${pct}%"></div></div>
      <div style="display:flex;justify-content:space-between;font-size:11px;color:var(--text-ghost)">${footer}</div>
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

    const d = state.recs.filter(
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
      const hasFilter = search || state.mFilter !== 'all' || state.tFilter !== 'all';
      $('#list').innerHTML = hasFilter
        ? `<div class="empty-state">
            <div class="empty-icon">🔎</div>
            <div class="empty-title">沒有符合的記錄</div>
            <div class="empty-sub">試試清掉搜尋、切到「全部月份」或「全部類型」</div>
          </div>`
        : `<div class="empty-state">
            <div class="empty-icon">📝</div>
            <div class="empty-title">還沒有任何記錄</div>
            <div class="empty-sub">從「新增」頁開始記錄第一筆花費</div>
          </div>`;
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
              <div class="item-meta">${escapeHtml(r.date)}<span class="pill ${r.type === 'o' ? 'pill-o' : 'pill-r'}">${r.type === 'o' ? '一次性' : '日常'}</span>${r.kwh ? `<span class="pill pill-kwh">${r.kwh} kWh</span>` : ''}${r.odo ? `<span class="pill pill-odo">${r.odo.toLocaleString()} km</span>` : ''}${r.note ? ` · ${escapeHtml(r.note)}` : ''}</div>
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

    // EV metrics (charging only) — respects month filter
    this.renderEvStats();

    // Trend
    const bm = {};
    state.recs.forEach((r) => {
      const m = r.date.slice(0, 7);
      bm[m] = (bm[m] || 0) + r.amt;
    });
    const trend = Object.entries(bm)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6);
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
      ? `<div class="empty-state">
          <div class="empty-icon">📊</div>
          <div class="empty-title">尚無資料</div>
          <div class="empty-sub">這個月份還沒有花費記錄,新增後會看到類別佔比</div>
        </div>`
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
  if (['submit', 'saveLoan', 'del', 'switchTab'].includes(action)) haptic(10);
  switch (action) {
    case 'reload':
      haptic(15);
      return app.load();
    case 'setType':
      return app.setType(t.dataset.type);
    case 'selCat':
      haptic(5);
      return app.selCat(t.dataset.cat);
    case 'copyLast':
      haptic(8);
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
    case 'exportCsv':
      return app.exportCsv();
    case 'importCsv':
      return app.triggerImport();
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
  if (e.target.id === 'csv-file' && e.target.files[0]) {
    app.importCsvFile(e.target.files[0]);
    e.target.value = '';
  }
};

// ========== Init ==========
document.addEventListener('click', handleClick);
document.addEventListener('touchstart', handleTouchStart, { passive: true });
document.addEventListener('touchend', handleTouchEnd, { passive: true });
document.addEventListener('input', handleInput);
document.addEventListener('change', handleChange);

if (!window.EV_CONFIG || !window.EV_CONFIG.GAS_URL) {
  const warn = document.createElement('div');
  warn.style.cssText =
    'background:var(--warn-bg);padding:12px 16px;border-bottom:1px solid var(--warn-border);font-size:13px;color:var(--warn-text)';
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

// When the tab becomes visible again (user came back after a while),
// refresh both the relative-time label and fetch fresh data.
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    if (state.lastSyncAt) app.setSyncFresh();
    // Re-sync if it's been > 2 minutes
    if (!state.lastSyncAt || Date.now() - state.lastSyncAt > 120000) app.load();
  }
});

// Keep relative sync time label up to date without re-fetching
setInterval(() => {
  if (state.lastSyncAt && document.visibilityState === 'visible') app.setSyncFresh();
}, 30000);

// Haptic feedback — short vibrate on tactile actions (no-op if unsupported)
const haptic = (ms = 10) => {
  if (navigator.vibrate) navigator.vibrate(ms);
};

// ========== Pull-to-refresh ==========
(function setupPtr() {
  const THRESHOLD = 72;
  const el = document.getElementById('ptr');
  if (!el) return;
  let startY = null;
  let tracking = false;

  document.addEventListener(
    'touchstart',
    (e) => {
      if (window.scrollY > 0) return;
      startY = e.touches[0].clientY;
      tracking = true;
    },
    { passive: true }
  );

  document.addEventListener(
    'touchmove',
    (e) => {
      if (!tracking || startY == null) return;
      const dy = e.touches[0].clientY - startY;
      if (dy <= 0) {
        el.classList.remove('show');
        return;
      }
      if (dy > 20) {
        const pct = Math.min(dy / THRESHOLD, 1);
        el.textContent = pct >= 1 ? '↓ 放開同步' : '⟳ 下拉同步';
        el.classList.add('show');
        el.style.transform = `translate(-50%, ${Math.min(dy - 40, 40)}px)`;
      }
    },
    { passive: true }
  );

  document.addEventListener(
    'touchend',
    (e) => {
      if (!tracking || startY == null) return;
      const dy = e.changedTouches[0].clientY - startY;
      tracking = false;
      startY = null;
      el.style.transform = '';
      if (dy >= THRESHOLD) {
        el.classList.add('show');
        el.textContent = '⟳ 同步中…';
        haptic(12);
        app.load().finally(() => setTimeout(() => el.classList.remove('show'), 400));
      } else {
        el.classList.remove('show');
      }
    },
    { passive: true }
  );
})();

// Register service worker for offline support
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch((e) => console.warn('SW register failed', e));
  });
}

app.load();

export { app, state };
