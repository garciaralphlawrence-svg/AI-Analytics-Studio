import { computeTotals, peso, nextReceiptNumber, quickParse, sampleReceipts, PAYMENT_METHODS } from './receipt-core.mjs';

const $ = (id) => document.getElementById(id);
// On GitHub Pages there are no functions, so call the AI backend (Vercel) directly.
const API = location.hostname.endsWith('github.io')
  ? 'https://ralph-ai-suite.vercel.app/api/receipt'
  : '/api/receipt';
const CATEGORIES = ['Food & Drinks', 'Groceries', 'Transport', 'Supplies', 'Utilities', 'Services', 'Other'];
const EXAMPLES = [
  '2 spanish latte tig-165, 1 ensaymada 85, gcash, si Juan',
  '3 americano 120 at 2 cheesecake 195, senior, bayad 1000',
  'Isang cold brew 175 tsaka dalawang croissant 135, card',
];
const DEFAULT_SETTINGS = {
  name: 'Kape Co.', address: 'G/F Sample Bldg., Boni Ave., Mandaluyong City', contact: '0917 000 0000',
  tin: '', prefix: 'KC', footer: 'Salamat po! Balik kayo! ☕', vatRegistered: true,
};

// ---------- storage (per browser; every access guarded) ----------
const store = {
  get(key, fallback) { try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch (e) { return fallback; } },
  set(key, val) { try { localStorage.setItem(key, JSON.stringify(val)); return true; } catch (e) { toast('Could not save — browser storage is full or blocked.'); return false; } },
};
let settings = { ...DEFAULT_SETTINGS, ...store.get('rc-settings', {}) };
let receipts = store.get('rc-receipts', []);
let expenses = store.get('rc-expenses', []);
let counter = store.get('rc-counter', 0);
let draft = blankSale();
let viewing = null; // an issued receipt being shown (read-only)

function blankSale() {
  return { customer_name: '', items: [], payment_method: 'Cash', amount_tendered: null, discount_type: 'none', discount_percent: 10, notes: '' };
}

// ---------- chrome ----------
$('btnTheme').addEventListener('click', () => {
  const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  document.documentElement.dataset.theme = next;
  try { localStorage.setItem('studio-theme', next); } catch (e) { /* private mode */ }
});
function toast(msg, ms = 3200) {
  const t = $('toast');
  t.textContent = msg;
  t.classList.add('on');
  clearTimeout(t._h);
  t._h = setTimeout(() => t.classList.remove('on'), ms);
}
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// ---------- compose ----------
$('examples').innerHTML = EXAMPLES.map((e) => `<button type="button" class="chip">${esc(e)}</button>`).join('');
$('examples').addEventListener('click', (e) => {
  const b = e.target.closest('.chip');
  if (!b) return;
  $('saleText').value = b.textContent;
  generate();
});
$('btnGenerate').addEventListener('click', generate);
$('saleText').addEventListener('keydown', (e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) generate(); });

async function post(body, timeoutMs = 28000) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: ctrl.signal });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw Object.assign(new Error(data.error || `HTTP ${res.status}`), { status: res.status });
    return data;
  } finally { clearTimeout(timer); }
}

function setStatus(html, kind = '') {
  $('aiStatus').className = `ai-status ${kind}`;
  $('aiStatus').innerHTML = html;
}

async function generate() {
  const text = $('saleText').value.trim();
  if (!text) { $('saleText').focus(); return toast('Describe the sale first.'); }
  const btn = $('btnGenerate');
  btn.disabled = true;
  setStatus('<span class="spin"></span> AI is reading your sale…');
  let sale, offline = false;
  try {
    ({ result: sale } = await post({ mode: 'parse', text }));
  } catch (err) {
    // AI unavailable (offline, no credits, rate limit): fall back to the built-in parser.
    sale = quickParse(text);
    offline = true;
  }
  btn.disabled = false;
  viewing = null;
  draft = {
    customer_name: sale.customer_name || '', items: sale.items || [], payment_method: PAYMENT_METHODS.includes(sale.payment_method) ? sale.payment_method : 'Cash',
    amount_tendered: sale.amount_tendered ?? null, discount_type: sale.discount_type || 'none', discount_percent: sale.discount_percent ?? 10, notes: sale.notes || '',
  };
  fillEditor();
  render();
  if (!draft.items.length) setStatus('Couldn\'t find any items. Try e.g. “2 latte 150, gcash”.', 'warn');
  else if (sale.clarification) setStatus(`⚠ ${esc(sale.clarification)}`, 'warn');
  else setStatus(offline ? '⚡ Filled in with the quick parser (AI offline). Check the details, then issue.' : '✓ Filled in by AI. Check the details, then issue.', 'ok');
  $('editor').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// ---------- voice ----------
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
if (SR) {
  $('btnMic').hidden = false;
  let rec = null;
  $('btnMic').addEventListener('click', () => {
    if (rec) { rec.stop(); return; }
    rec = new SR();
    rec.lang = 'en-PH';
    rec.interimResults = true;
    $('btnMic').classList.add('listening');
    rec.onresult = (e) => { $('saleText').value = [...e.results].map((r) => r[0].transcript).join(''); };
    rec.onend = rec.onerror = () => { $('btnMic').classList.remove('listening'); rec = null; if ($('saleText').value.trim()) generate(); };
    rec.start();
  });
}

// ---------- editor ----------
$('fPayment').innerHTML = PAYMENT_METHODS.map((p) => `<option>${p}</option>`).join('');

function fillEditor() {
  $('fCustomer').value = draft.customer_name || '';
  $('fPayment').value = draft.payment_method;
  $('fDiscount').value = draft.discount_type;
  $('fPercent').value = draft.discount_percent ?? 10;
  $('fTendered').value = draft.amount_tendered ?? '';
  $('fNotes').value = draft.notes || '';
  renderRows();
}

function renderRows() {
  $('itemRows').innerHTML = draft.items.map((it, i) => `
    <tr data-i="${i}">
      <td><input class="d" value="${esc(it.description)}" aria-label="Item ${i + 1} name" maxlength="60"></td>
      <td class="n"><input class="q" type="number" min="0" step="1" value="${it.quantity}" aria-label="Item ${i + 1} quantity"></td>
      <td class="n"><input class="p ${it.unit_price ? '' : 'missing'}" type="number" min="0" step="0.01" value="${it.unit_price || ''}" placeholder="0.00" aria-label="Item ${i + 1} price"></td>
      <td class="n amt">${peso((Number(it.quantity) || 0) * (Number(it.unit_price) || 0))}</td>
      <td><button class="x" type="button" aria-label="Remove item ${i + 1}">✕</button></td>
    </tr>`).join('') || '<tr class="empty"><td colspan="5">No items yet. Describe a sale above, or add one.</td></tr>';
}

$('itemRows').addEventListener('input', (e) => {
  const tr = e.target.closest('tr[data-i]');
  if (!tr) return;
  const it = draft.items[+tr.dataset.i];
  if (e.target.classList.contains('d')) it.description = e.target.value;
  if (e.target.classList.contains('q')) it.quantity = Number(e.target.value);
  if (e.target.classList.contains('p')) { it.unit_price = Number(e.target.value); e.target.classList.toggle('missing', !it.unit_price); }
  tr.querySelector('.amt').textContent = peso((Number(it.quantity) || 0) * (Number(it.unit_price) || 0));
  viewing = null;
  render();
});
$('itemRows').addEventListener('click', (e) => {
  const x = e.target.closest('.x');
  if (!x) return;
  draft.items.splice(+x.closest('tr').dataset.i, 1);
  viewing = null;
  renderRows();
  render();
});
$('btnAddItem').addEventListener('click', () => {
  draft.items.push({ description: '', quantity: 1, unit_price: 0 });
  viewing = null;
  renderRows();
  render();
  $('itemRows').querySelector('tr:last-child .d')?.focus();
});
for (const [id, key, num] of [['fCustomer', 'customer_name'], ['fPayment', 'payment_method'], ['fDiscount', 'discount_type'], ['fPercent', 'discount_percent', true], ['fTendered', 'amount_tendered', true], ['fNotes', 'notes']]) {
  $(id).addEventListener('input', () => {
    draft[key] = num ? ($(id).value === '' ? null : Number($(id).value)) : $(id).value;
    viewing = null;
    render();
  });
}
$('btnClear').addEventListener('click', () => {
  draft = blankSale();
  viewing = null;
  $('saleText').value = '';
  setStatus('');
  fillEditor();
  render();
});

// ---------- preview ----------
function render() {
  const sale = viewing || draft;
  $('pctWrap').hidden = sale.discount_type !== 'percent';
  $('tenderWrap').hidden = sale.payment_method !== 'Cash';
  const t = computeTotals(sale, settings);
  const when = viewing ? new Date(viewing.issuedAt) : new Date();
  const number = viewing ? viewing.number : nextReceiptNumber(settings.prefix, counter);
  const status = '';
  const line = (label, value, cls = '') => `<div class="tl ${cls}"><span>${label}</span><span>${value}</span></div>`;

  $('paper').innerHTML = `${status}
    <header class="p-head">
      <div class="p-logo" aria-hidden="true">${esc((settings.name || 'R')[0])}</div>
      <h3>${esc(settings.name)}</h3>
      <p>${esc(settings.address)}</p>
      ${settings.contact ? `<p>${esc(settings.contact)}</p>` : ''}
      ${settings.tin ? `<p>${settings.vatRegistered ? 'VAT Reg' : 'Non-VAT Reg'} TIN: ${esc(settings.tin)}</p>` : `<p>${settings.vatRegistered ? 'VAT-registered' : 'Non-VAT'}</p>`}
    </header>
    <div class="p-title">SALES RECEIPT</div>
    <div class="p-meta">
      ${line('Receipt #', esc(number))}
      ${line('Date', when.toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: '2-digit' }) + ' ' + when.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' }))}
      ${line('Customer', esc(sale.customer_name || 'Walk-in'))}
    </div>
    <div class="p-items">
      ${t.lines.length ? t.lines.map((l) => `
        <div class="pi"><span class="pi-d">${esc(l.description)}</span><span class="pi-a">${peso(l.amount)}</span></div>
        <div class="pi-sub">${l.quantity} × ${peso(l.unit_price)}</div>`).join('') : '<p class="p-empty">Items will appear here</p>'}
    </div>
    <div class="p-totals">
      ${line(`Subtotal (${t.lines.reduce((a, l) => a + l.quantity, 0)} item${t.lines.length === 1 && t.lines[0].quantity === 1 ? '' : 's'})`, peso(t.gross))}
      ${t.lessVat ? line('Less: VAT (12%)', '−' + peso(t.lessVat)) : ''}
      ${t.discount ? line(`Less: ${t.discountLabel}`, '−' + peso(t.discount)) : ''}
      ${line('TOTAL DUE', peso(t.total), 'grand')}
      ${t.tendered !== null ? line('Cash', peso(t.tendered)) + line(t.short ? 'Balance due' : 'Change', peso(t.short ? t.total - t.tendered : t.change), t.short ? 'warn' : '') : line('Paid via', esc(sale.payment_method))}
    </div>
    ${settings.vatRegistered ? `<div class="p-vat">
      ${t.vatExemptSales ? line('VAT-exempt sales', peso(t.vatExemptSales)) : line('VATable sales', peso(t.vatableSales)) + line('VAT (12%)', peso(t.vat))}
      ${line('Zero-rated sales', peso(0))}
    </div>` : ''}
    ${sale.discount_type === 'senior' || sale.discount_type === 'pwd' ? `<div class="p-sign">${sale.discount_type === 'senior' ? 'OSCA' : 'PWD'} ID no.: ____________<br>Signature: ____________</div>` : ''}
    ${sale.notes ? `<p class="p-notes">Note: ${esc(sale.notes)}</p>` : ''}
    <footer class="p-foot">
      <p>${esc(settings.footer)}</p>
      <p class="p-disclaimer">This is not an official receipt.</p>
      <div class="barcode" aria-hidden="true">${barcode(number)}</div>
      <p class="p-num">${esc(number)}</p>
    </footer>`;
}

function barcode(text) {
  // Decorative barcode derived from the receipt number (not a scannable symbology).
  let h = 0;
  return [...(text + text)].map((c) => { h = (h * 31 + c.charCodeAt(0)) >>> 0; return `<i style="width:${1 + (h % 3)}px;margin-right:${1 + ((h >> 3) % 2)}px"></i>`; }).join('');
}

// ---------- issue / print / image / share ----------
$('btnIssue').addEventListener('click', () => {
  if (viewing) return toast(`${viewing.number} is already issued. Start over for a new sale.`);
  const t = computeTotals(draft, settings);
  if (!t.lines.length) return toast('Add at least one item.');
  if (t.lines.some((l) => !l.unit_price)) return toast('Some items have no price yet.');
  if (t.short) return toast('Cash received is less than the total.');
  counter += 1;
  const rec = { ...structuredClone(draft), items: t.lines, number: nextReceiptNumber(settings.prefix, counter - 1), issuedAt: new Date().toISOString(), total: t.total };
  receipts.unshift(rec);
  store.set('rc-receipts', receipts);
  store.set('rc-counter', counter);
  viewing = rec;
  render();
  renderSales();
  toast(`✔ Receipt ${rec.number} issued — ${peso(t.total)}`);
});
$('btnPrint').addEventListener('click', () => window.print());
async function receiptPng() {
  if (!window.html2canvas) throw new Error('Image export is still loading — try again in a second.');
  const canvas = await window.html2canvas($('paper'), { scale: 2, backgroundColor: '#ffffff', useCORS: true });
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
}
const fileName = () => `${(viewing ? viewing.number : 'receipt')}.png`;
$('btnPng').addEventListener('click', async () => {
  try {
    const blob = await receiptPng();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = fileName();
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  } catch (e) { toast(e.message); }
});
if (navigator.canShare) {
  $('btnShare').hidden = false;
  $('btnShare').addEventListener('click', async () => {
    try {
      const file = new File([await receiptPng()], fileName(), { type: 'image/png' });
      if (navigator.canShare({ files: [file] })) await navigator.share({ files: [file], title: 'Receipt' });
      else toast('Sharing images isn\'t supported on this device.');
    } catch (e) { if (e.name !== 'AbortError') toast(e.message); }
  });
}

// ---------- scan ----------
$('scanInput').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  e.target.value = '';
  if (!file) return;
  if (!file.type.startsWith('image/')) return toast('Please choose a photo.');
  setStatus('<span class="spin"></span> AI is reading the receipt photo…');
  try {
    const { dataUrl, base64 } = await shrinkImage(file, 1568, 0.85);
    const { result } = await post({ mode: 'scan', image: { media_type: 'image/jpeg', data: base64 } }, 29000);
    if (!result.readable) { setStatus('⚠ That photo doesn\'t look like a readable receipt. Try a sharper, well-lit shot.', 'warn'); return; }
    setStatus('✓ Receipt read. Review it and save.', 'ok');
    openScanReview(result, dataUrl);
  } catch (err) {
    setStatus(`⚠ Couldn't read the photo: ${esc(err.status ? err.message : 'the AI is unavailable right now')}.`, 'warn');
  }
});

function shrinkImage(file, maxSide, quality) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * scale);
      c.height = Math.round(img.height * scale);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      const dataUrl = c.toDataURL('image/jpeg', quality);
      URL.revokeObjectURL(img.src);
      resolve({ dataUrl, base64: dataUrl.split(',')[1] });
    };
    img.onerror = () => reject(new Error('That image could not be opened.'));
    img.src = URL.createObjectURL(file);
  });
}

$('xCategory').innerHTML = CATEGORIES.map((c) => `<option>${c}</option>`).join('');
let scanned = null;
function openScanReview(r, dataUrl) {
  scanned = { ...r, thumb: dataUrl };
  $('scanImg').src = dataUrl;
  $('scanNote').textContent = r.notes || 'Check the fields below. You can edit anything before saving.';
  $('xMerchant').value = r.merchant_name || '';
  $('xDate').value = /^\d{4}-\d{2}-\d{2}$/.test(r.date || '') ? r.date : new Date().toISOString().slice(0, 10);
  $('xNumber').value = r.receipt_number || '';
  $('xTotal').value = r.total ?? '';
  $('xVat').value = r.vat ?? '';
  $('xCategory').value = CATEGORIES.includes(r.category) ? r.category : 'Other';
  $('xPayment').value = r.payment_method || '';
  $('xItems').innerHTML = (r.items || []).map((i) => `<li><span>${esc(i.quantity)} × ${esc(i.description)}</span><span>${peso(i.amount)}</span></li>`).join('');
  $('scanDialog').showModal();
}
$('scanForm').addEventListener('submit', (e) => {
  if (e.submitter?.value !== 'save' || !scanned) return;
  const total = Number($('xTotal').value);
  if (!total) { e.preventDefault(); return toast('Enter the total before saving.'); }
  expenses.unshift({
    id: Date.now(), merchant: $('xMerchant').value.trim() || 'Unknown merchant', date: $('xDate').value, receipt_number: $('xNumber').value.trim(),
    total, vat: $('xVat').value === '' ? null : Number($('xVat').value), category: $('xCategory').value, payment: $('xPayment').value.trim(), items: scanned.items || [],
  });
  store.set('rc-expenses', expenses);
  renderExpenses();
  switchTab('expenses');
  toast('✔ Expense saved');
});

// ---------- lists ----------
function renderSales() {
  const q = $('search').value.trim().toLowerCase();
  const rows = receipts.filter((r) => !q || [r.number, r.customer_name, r.payment_method, ...r.items.map((i) => i.description)].join(' ').toLowerCase().includes(q));
  $('cntSales').textContent = receipts.length;
  $('salesTable').innerHTML = rows.length ? `<thead><tr><th>Receipt</th><th>Date</th><th>Customer</th><th>Items</th><th>Paid via</th><th class="n">Total</th><th></th></tr></thead><tbody>${
    rows.slice(0, 200).map((r) => `<tr data-n="${esc(r.number)}"><td><button class="link-btn open">${esc(r.number)}</button></td>
      <td>${new Date(r.issuedAt).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })}</td><td>${esc(r.customer_name || 'Walk-in')}</td>
      <td class="items-cell">${esc(r.items.map((i) => `${i.quantity}× ${i.description}`).join(', '))}</td><td>${esc(r.payment_method)}</td>
      <td class="n">${peso(r.total ?? computeTotals(r, settings).total)}</td><td><button class="x del" aria-label="Delete ${esc(r.number)}">✕</button></td></tr>`).join('')}</tbody>`
    : `<tbody><tr class="empty"><td>${q ? 'No receipts match your search.' : 'No receipts yet. Issue one above, or load sample receipts to try the AI analysis.'}</td></tr></tbody>`;
}
$('search').addEventListener('input', renderSales);
$('salesTable').addEventListener('click', (e) => {
  const tr = e.target.closest('tr[data-n]');
  if (!tr) return;
  const rec = receipts.find((r) => r.number === tr.dataset.n);
  if (e.target.closest('.del')) {
    if (!confirm(`Delete receipt ${rec.number}?`)) return;
    receipts = receipts.filter((r) => r !== rec);
    store.set('rc-receipts', receipts);
    if (viewing === rec) viewing = null;
    renderSales();
    render();
  } else if (e.target.closest('.open')) {
    viewing = rec;
    render();
    $('paper').scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
});

function renderExpenses() {
  $('cntExp').textContent = expenses.length;
  $('expTable').innerHTML = expenses.length ? `<thead><tr><th>Date</th><th>Merchant</th><th>Category</th><th>Paid with</th><th class="n">VAT</th><th class="n">Total</th><th></th></tr></thead><tbody>${
    expenses.map((x) => `<tr data-id="${x.id}"><td>${esc(x.date)}</td><td>${esc(x.merchant)}</td><td>${esc(x.category)}</td><td>${esc(x.payment || '—')}</td>
      <td class="n">${x.vat === null ? '—' : peso(x.vat)}</td><td class="n">${peso(x.total)}</td><td><button class="x del" aria-label="Delete expense">✕</button></td></tr>`).join('')}</tbody>`
    : '<tbody><tr class="empty"><td>No scanned receipts yet. Tap “Scan a receipt” and take a photo of any paper receipt.</td></tr></tbody>';
}
$('expTable').addEventListener('click', (e) => {
  const tr = e.target.closest('tr[data-id]');
  if (!tr || !e.target.closest('.del')) return;
  expenses = expenses.filter((x) => String(x.id) !== tr.dataset.id);
  store.set('rc-expenses', expenses);
  renderExpenses();
});

$('btnSamples').addEventListener('click', () => {
  if (receipts.some((r) => r.sample)) return toast('Sample receipts are already loaded.');
  // Samples get their own series (e.g. KCS-000001) so they never clash with real receipt numbers.
  const samples = sampleReceipts(`${settings.prefix}S`, 160).map((r) => ({ ...r, total: computeTotals(r, settings).total }));
  receipts = [...receipts, ...samples.reverse()];
  store.set('rc-receipts', receipts);
  renderSales();
  render();
  toast('Loaded 160 sample receipts from the last 90 days');
});

// ---------- hand-off to AI Analytics Studio ----------
function timeOfDay(h) { return h < 11 ? 'Morning (before 11)' : h < 14 ? 'Lunch (11–2)' : h < 17 ? 'Afternoon (2–5)' : 'Evening (after 5)'; }
function openInStudio(name, rows) {
  if (!rows.length) return toast('Nothing to analyze yet.');
  if (!store.set('ralph-suite-import', { name, rows })) return;
  location.href = '../?import=suite';
}
$('btnAnalyzeSales').addEventListener('click', () => {
  const rows = [];
  for (const r of receipts) {
    const d = new Date(r.issuedAt);
    const t = computeTotals(r, settings);
    // Spread receipt-level discounts across lines so line totals add up to what was paid.
    const factor = t.gross ? t.total / t.gross : 1;
    for (const l of t.lines) {
      const src = r.items.find((i) => i.description === l.description) || {};
      rows.push({
        date: d.toISOString().slice(0, 10), receipt_no: r.number, customer: r.customer_name || 'Walk-in', item: l.description,
        category: src.category || 'Other', quantity: l.quantity, unit_price: l.unit_price, net_sales: Math.round(l.amount * factor * 100) / 100,
        payment_method: r.payment_method, discount: r.discount_type === 'none' ? 'None' : r.discount_type === 'percent' ? 'Promo' : r.discount_type === 'senior' ? 'Senior' : 'PWD',
        weekday: d.toLocaleDateString('en-US', { weekday: 'long' }), time_of_day: timeOfDay(d.getHours()),
      });
    }
  }
  openInStudio(`${settings.name} Sales (from Resibo Maker)`, rows);
});
$('btnAnalyzeExp').addEventListener('click', () => {
  openInStudio('Scanned Expenses', expenses.map((x) => ({ date: x.date, merchant: x.merchant, category: x.category, payment: x.payment || 'Unknown', vat_amount: x.vat ?? 0, total_amount: x.total })));
});

// ---------- tabs ----------
function switchTab(name) {
  document.querySelectorAll('.tabs button').forEach((b) => { b.classList.toggle('on', b.dataset.tab === name); b.setAttribute('aria-selected', b.dataset.tab === name); });
  document.querySelectorAll('.tab').forEach((t) => { t.hidden = t.dataset.tab !== name; });
}
document.querySelector('.tabs').addEventListener('click', (e) => { const b = e.target.closest('button[data-tab]'); if (b) switchTab(b.dataset.tab); });

// ---------- settings ----------
const S_FIELDS = { sName: 'name', sPrefix: 'prefix', sAddress: 'address', sContact: 'contact', sTin: 'tin', sFooter: 'footer' };
function fillSettings() {
  for (const [id, key] of Object.entries(S_FIELDS)) $(id).value = settings[key] || '';
  $('sVat').checked = settings.vatRegistered !== false;
}
for (const [id, key] of Object.entries(S_FIELDS)) {
  $(id).addEventListener('input', () => {
    settings[key] = key === 'prefix' ? $(id).value.replace(/[^\w]/g, '').toUpperCase() : $(id).value;
    store.set('rc-settings', settings);
    render();
  });
}
$('sVat').addEventListener('change', () => { settings.vatRegistered = $('sVat').checked; store.set('rc-settings', settings); render(); });
$('btnResetAll').addEventListener('click', () => {
  if (!confirm('Delete all receipts, expenses and settings saved in this browser?')) return;
  ['rc-settings', 'rc-receipts', 'rc-expenses', 'rc-counter'].forEach((k) => { try { localStorage.removeItem(k); } catch (e) { /* ignore */ } });
  settings = { ...DEFAULT_SETTINGS };
  receipts = []; expenses = []; counter = 0; draft = blankSale(); viewing = null;
  fillSettings(); fillEditor(); renderSales(); renderExpenses(); render();
  toast('Everything was reset.');
});

// ---------- boot ----------
fillSettings();
fillEditor();
renderSales();
renderExpenses();
render();
