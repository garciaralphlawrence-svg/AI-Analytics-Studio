import { profileData, readFile } from './profile.mjs';
import { SAMPLES } from './samples.mjs';
import { autoDashboard, starterQuestions } from './autodash.mjs';
import { renderChart, disposeCharts, formatValue, prettyLabel } from './charts.mjs';

const $ = (id) => document.getElementById(id);
const API = '/api/analyze';
const MAX_ROWS = 20000;

const state = {
  dataset: null,       // { name, columns, rows }
  autoSpec: null,
  aiSpec: null,
  view: 'auto',
  aiAvailable: true,
  asking: false,
};

// ---------- boot ----------
waitForLibs().then(() => {
  renderSamples();
  bindLanding();
  bindDashboard();
  const sample = new URLSearchParams(location.search).get('sample');
  if (sample) loadSample(sample);
});

function waitForLibs() {
  return new Promise((resolve) => {
    const ok = () => window.echarts && window.XLSX;
    if (ok()) return resolve();
    const t = setInterval(() => { if (ok()) { clearInterval(t); resolve(); } }, 50);
    setTimeout(() => { clearInterval(t); resolve(); }, 8000);
  });
}

// ---------- theme / chrome ----------
$('btnTheme').addEventListener('click', () => {
  const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  document.documentElement.dataset.theme = next;
  try { localStorage.setItem('studio-theme', next); } catch (e) { /* private mode */ }
  if (state.dataset) renderBoard(); // charts read theme colours at render time
});
$('btnPresent').addEventListener('click', togglePresent);
$('btnExport').addEventListener('click', () => window.print());
$('btnNew').addEventListener('click', () => {
  history.replaceState(null, '', location.pathname);
  disposeCharts();
  state.dataset = null;
  show('landing');
});
document.addEventListener('keydown', (e) => {
  if (e.target.closest('input, textarea')) return;
  if (e.key.toLowerCase() === 'p' && state.dataset) togglePresent();
  if (e.key === 'Escape' && document.body.classList.contains('present')) togglePresent();
});
function togglePresent() {
  document.body.classList.toggle('present');
  if (document.body.classList.contains('present')) document.documentElement.requestFullscreen?.().catch(() => {});
  else if (document.fullscreenElement) document.exitFullscreen?.();
  setTimeout(() => window.dispatchEvent(new Event('resize')), 350);
}

function show(which) {
  $('landing').hidden = which !== 'landing';
  $('dashboard').hidden = which !== 'dashboard';
  $('loading').hidden = which !== 'loading';
  const inDash = which === 'dashboard';
  ['btnNew', 'btnPresent', 'btnExport'].forEach((id) => { $(id).hidden = !inDash; });
  $('datasetPill').hidden = !inDash;
}

function toast(msg, ms = 3200) {
  const t = $('toast');
  t.textContent = msg;
  t.classList.add('on');
  clearTimeout(t._h);
  t._h = setTimeout(() => t.classList.remove('on'), ms);
}

// ---------- landing ----------
function renderSamples() {
  $('samples').innerHTML = SAMPLES.map((s) => `
    <button class="sample" data-id="${s.id}">
      <span class="s-icon">${s.icon}</span><span class="s-title">${s.title}</span><span class="s-blurb">${s.blurb}</span>
    </button>`).join('');
  $('samples').addEventListener('click', (e) => {
    const b = e.target.closest('.sample');
    if (b) loadSample(b.dataset.id);
  });
}

function bindLanding() {
  const dz = $('dropzone');
  $('fileInput').addEventListener('change', (e) => { if (e.target.files[0]) loadFile(e.target.files[0]); e.target.value = ''; });
  dz.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); $('fileInput').click(); } });
  ['dragenter', 'dragover'].forEach((ev) => document.addEventListener(ev, (e) => { e.preventDefault(); dz.classList.add('over'); }));
  ['dragleave', 'drop'].forEach((ev) => document.addEventListener(ev, (e) => { e.preventDefault(); if (ev === 'drop' || !e.relatedTarget) dz.classList.remove('over'); }));
  document.addEventListener('drop', (e) => { const f = e.dataTransfer?.files?.[0]; if (f) loadFile(f); });
}

async function loadSample(id) {
  const s = SAMPLES.find((x) => x.id === id);
  if (!s) return;
  history.replaceState(null, '', `?sample=${id}`);
  show('loading');
  $('loadingText').textContent = `Loading ${s.title.toLowerCase()}…`;
  await tick();
  const { name, rows } = s.make();
  start(name, rows);
}

async function loadFile(file) {
  if (file.size > 25 * 1024 * 1024) return toast('That file is larger than 25 MB — please upload a smaller extract.');
  show('loading');
  $('loadingText').textContent = `Reading ${file.name}…`;
  try {
    await tick();
    const { raw } = await readFile(file);
    if (raw.length > MAX_ROWS) toast(`Using the first ${MAX_ROWS.toLocaleString()} of ${raw.length.toLocaleString()} rows.`, 5000);
    history.replaceState(null, '', location.pathname);
    start(file.name.replace(/\.[^.]+$/, ''), raw.slice(0, MAX_ROWS));
  } catch (err) {
    console.error(err);
    show('landing');
    toast(`Couldn't read that file: ${err.message || 'unsupported format'}`, 5000);
  }
}

const tick = () => new Promise((r) => setTimeout(r, 30));

// ---------- dashboard ----------
function start(name, raw) {
  $('loadingText').textContent = 'Profiling columns…';
  const { columns, rows } = profileData(raw);
  state.dataset = { name, columns, rows };
  state.autoSpec = autoDashboard(state.dataset);
  state.aiSpec = null;
  state.view = 'auto';
  $('datasetName').textContent = name;
  $('datasetMeta').textContent = `${rows.length.toLocaleString()} rows · ${columns.length} columns`;
  $('thread').innerHTML = '';
  $('insights').innerHTML = '';
  $('viewToggle').hidden = true;
  show('dashboard');
  renderBoard();
  renderPreview();
  setSuggestions(starterQuestions(state.dataset));
  runAIDashboard();
}

function currentSpec() { return state.view === 'ai' && state.aiSpec ? state.aiSpec : state.autoSpec; }

function renderBoard() {
  const spec = currentSpec();
  disposeCharts($('dashboard'));
  $('boardTitle').textContent = spec.title || state.dataset.name;
  $('boardSummary').textContent = spec.summary || `${state.dataset.rows.length.toLocaleString()} rows analysed automatically. The AI analyst is reviewing the data for deeper insights.`;
  $('boardBadge').textContent = state.view === 'ai' ? '✨ AI-curated dashboard' : '⚡ Auto-dashboard';
  $('boardBadge').classList.toggle('ai', state.view === 'ai');

  const kpis = $('kpis');
  kpis.innerHTML = '';
  spec.kpis.forEach((k, i) => {
    const card = document.createElement('div');
    card.className = 'card kpi';
    card.style.animationDelay = `${i * 70}ms`;
    kpis.appendChild(card);
    safeRender(card, k);
  });

  const grid = $('grid');
  grid.innerHTML = '';
  spec.charts.forEach((c, i) => addChartCard(c, i));
}

function addChartCard(spec, i = 0, { pinned = false, prepend = false } = {}) {
  const card = document.createElement('div');
  card.className = `card chart ${spec.type === 'area' || spec.type === 'line' ? 'wide' : ''} ${pinned ? 'pinned' : ''}`;
  card.style.animationDelay = `${i * 90}ms`;
  prepend ? $('grid').prepend(card) : $('grid').appendChild(card);
  safeRender(card, spec);
  return card;
}

function safeRender(card, spec) {
  try { renderChart(card, spec, state.dataset); }
  catch (e) { console.error('chart failed', spec, e); card.innerHTML = `<div class="card-body muted">Couldn't draw “${spec.title}”.</div>`; }
}

function renderPreview() {
  const { columns, rows } = state.dataset;
  const typeIcon = { number: '#', date: '📅', category: '◆', text: 'Aa' };
  $('colChips').innerHTML = columns.map((c) => `<span class="col-chip t-${c.type}" title="${c.type}">${typeIcon[c.type]} ${escapeHtml(c.name)}</span>`).join('');
  const head = `<thead><tr>${columns.map((c) => `<th>${escapeHtml(c.name)}</th>`).join('')}</tr></thead>`;
  const body = rows.slice(0, 50).map((r) => `<tr>${columns.map((c) => {
    const v = r[c.name];
    return `<td class="${c.type === 'number' ? 'num' : ''}">${v === null ? '<span class="muted">—</span>' : escapeHtml(c.type === 'number' ? formatValue(v, c, false) : v)}</td>`;
  }).join('')}</tr>`).join('');
  $('previewTable').innerHTML = head + `<tbody>${body}</tbody>`;
}

function bindDashboard() {
  $('viewToggle').addEventListener('click', (e) => {
    const b = e.target.closest('button[data-view]');
    if (!b || b.dataset.view === state.view) return;
    state.view = b.dataset.view;
    $('viewToggle').querySelectorAll('button').forEach((x) => x.classList.toggle('on', x === b));
    renderBoard();
  });
  $('askForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const q = $('askInput').value.trim();
    if (q) ask(q);
  });
  $('suggest').addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (b) ask(b.textContent);
  });
}

function setSuggestions(list) {
  $('suggest').innerHTML = '';
  (list || []).slice(0, 4).forEach((q) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = q;
    $('suggest').appendChild(b);
  });
}

// ---------- AI ----------
function payload(extra) {
  const { name, columns, rows } = state.dataset;
  return JSON.stringify({ ...extra, dataset: { name, columns, rows } });
}

// The analyst works in steps (each request must finish within Netlify's ~30s
// limit). Every step streams newline-delimited JSON — ping / progress / query
// events, then a result, an error, or "continue" with signed state that we
// send back for the next step.
async function callAI(extra, onEvent = () => {}, totalMs = 120000) {
  const deadline = Date.now() + totalMs;
  let state = null, sig = null;
  for (let step = 0; step < 10; step++) {
    const ev = await callStep(payload({ ...extra, state, sig }), onEvent, Math.max(5000, deadline - Date.now()));
    if (ev.type === 'result') return ev;
    ({ state, sig } = ev);
    if (Date.now() > deadline) break;
  }
  throw Object.assign(new Error('The analysis took too long. Please try again.'), { status: 504 });
}

async function callStep(body, onEvent, timeoutMs) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), Math.min(timeoutMs, 45000));
  try {
    const res = await fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, signal: ctrl.signal });
    if (!res.ok || !res.body) {
      const data = await res.json().catch(() => ({}));
      const err = new Error(data.error || `HTTP ${res.status}`);
      err.status = res.status;
      err.code = data.error;
      throw err;
    }
    const reader = res.body.getReader();
    const dec = new TextDecoder();
    let buf = '';
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      let nl;
      while ((nl = buf.indexOf('\n')) !== -1) {
        const line = buf.slice(0, nl).trim();
        buf = buf.slice(nl + 1);
        if (!line) continue;
        const ev = JSON.parse(line);
        if (ev.type === 'result' || ev.type === 'continue') return ev;
        if (ev.type === 'error') throw Object.assign(new Error(ev.error), { status: 502 });
        onEvent(ev);
      }
    }
    throw Object.assign(new Error('The analysis ended unexpectedly.'), { status: 502 });
  } finally { clearTimeout(timer); }
}

async function runAIDashboard() {
  const ds = state.dataset;
  const insights = $('insights');
  insights.innerHTML = `<div class="thinking"><div class="think-orb"></div><div><strong>AI analyst is exploring your data</strong>
    <p class="think-sub muted">Reading the column profile…</p><ol class="steps"></ol></div></div>`;
  $('analystStatus').textContent = 'Analysing…';
  const steps = insights.querySelector('.steps');
  const sub = insights.querySelector('.think-sub');
  const onEvent = (ev) => {
    if (ev.type === 'progress') sub.textContent = ev.round === 0 ? 'Planning the analysis…' : 'Comparing results, looking for the story…';
    if (ev.type === 'query') {
      steps.querySelectorAll('li.active').forEach((li) => li.classList.replace('active', 'done'));
      const li = document.createElement('li');
      li.className = 'active';
      li.textContent = ev.label;
      steps.appendChild(li);
      sub.textContent = `${ev.queries} ${ev.queries === 1 ? 'query' : 'queries'} run on ${ds.rows.length.toLocaleString()} rows`;
      $('analystStatus').textContent = `Running query ${ev.queries}…`;
      scrollAnalyst();
    }
  };

  try {
    const t0 = Date.now();
    const { result, queries } = await callAI({ mode: 'dashboard' }, onEvent);
    if (state.dataset !== ds) return; // user moved on
    state.aiSpec = sanitizeSpec(result);
    state.view = 'ai';
    $('viewToggle').hidden = false;
    $('viewToggle').querySelectorAll('button').forEach((x) => x.classList.toggle('on', x.dataset.view === 'ai'));
    renderBoard();
    renderInsights(result.insights || [], queries);
    setSuggestions(result.questions?.length ? result.questions : starterQuestions(ds));
    $('analystStatus').textContent = `Ran ${queries} queries on ${ds.rows.length.toLocaleString()} rows in ${Math.round((Date.now() - t0) / 1000)}s`;
    toast('✨ AI-curated dashboard ready');
  } catch (err) {
    if (state.dataset !== ds) return;
    console.warn('AI dashboard unavailable', err);
    state.aiAvailable = !(err.code === 'not_configured' || err.status === 403);
    insights.innerHTML = `<div class="notice">${state.aiAvailable
      ? 'The AI analyst is taking a break right now. The auto-dashboard is fully live, so try a question below in a moment.'
      : 'AI analysis isn\'t switched on for this site yet. The auto-dashboard is fully live. Explore it, filter it, export it.'}</div>`;
    $('analystStatus').textContent = state.aiAvailable ? 'Temporarily unavailable' : 'Auto mode';
  }
}

function sanitizeSpec(r) {
  const ok = (c) => c && c.query && typeof c.title === 'string';
  return {
    title: r.title || state.dataset.name,
    summary: r.summary || '',
    kpis: (r.kpis || []).filter(ok).slice(0, 4).map((c) => ({ ...c, type: 'kpi' })),
    charts: (r.charts || []).filter(ok).slice(0, 6),
  };
}

function renderInsights(list, queries) {
  const tone = { positive: '▲', negative: '▼', neutral: '●' };
  $('insights').innerHTML = `<h4 class="ins-title">Key insights <span class="muted">· verified with ${queries} queries</span></h4>` +
    list.map((x, i) => `<article class="insight ${x.tone}" style="animation-delay:${i * 120}ms">
      <span class="tone">${tone[x.tone] || '●'}</span><div><strong></strong><p></p></div></article>`).join('');
  $('insights').querySelectorAll('.insight').forEach((el, i) => {
    el.querySelector('strong').textContent = list[i].headline;
    el.querySelector('p').textContent = list[i].detail;
  });
}

async function ask(question) {
  if (state.asking || !state.dataset) return;
  state.asking = true;
  $('askInput').value = '';
  setSuggestions([]);
  const thread = $('thread');
  const qEl = document.createElement('div');
  qEl.className = 'q';
  qEl.textContent = question;
  thread.appendChild(qEl);
  const aEl = document.createElement('div');
  aEl.className = 'a';
  aEl.innerHTML = '<span class="typing"><i></i><i></i><i></i></span> <span class="muted">querying all rows…</span>';
  thread.appendChild(aEl);
  scrollAnalyst();
  const ds = state.dataset;
  try {
    const { result, queries } = await callAI({ mode: 'ask', question }, (ev) => {
      if (ev.type === 'query') aEl.querySelector('.muted').textContent = `ran ${ev.queries} ${ev.queries === 1 ? 'query' : 'queries'}: ${ev.label}…`;
    });
    if (state.dataset !== ds) return;
    aEl.innerHTML = `<div class="md">${md(result.answer || '')}</div><div class="a-meta muted">✓ ${queries} ${queries === 1 ? 'query' : 'queries'} on ${ds.rows.length.toLocaleString()} rows</div>`;
    if (result.chart && result.chart.query) {
      const card = document.createElement('div');
      card.className = 'card chart mini';
      aEl.appendChild(card);
      try { renderChart(card, result.chart, ds); } catch (e) { card.remove(); }
      const pin = document.createElement('button');
      pin.className = 'pin';
      pin.textContent = '📌 Pin to dashboard';
      pin.addEventListener('click', () => {
        const spec = result.chart;
        currentSpec().charts.unshift(spec);
        const newCard = addChartCard(spec, 0, { pinned: true, prepend: true });
        newCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
        pin.disabled = true;
        pin.textContent = '✓ Pinned';
      });
      aEl.appendChild(pin);
    }
    setSuggestions(result.followups || []);
  } catch (err) {
    aEl.innerHTML = `<div class="notice">${escapeHtml(err.code === 'not_configured'
      ? 'AI questions aren\'t switched on for this site yet.'
      : err.name === 'AbortError' ? 'That took too long — try a simpler question.' : (err.message || 'Something went wrong.'))}</div>`;
    setSuggestions(starterQuestions(ds));
  } finally {
    state.asking = false;
    scrollAnalyst();
  }
}

function scrollAnalyst() { const b = $('analystBody'); b.scrollTop = b.scrollHeight; }

// ---------- utils ----------
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function md(text) {
  return escapeHtml(text)
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|\n)\s*[-•]\s+(.*)/g, '$1<li>$2</li>')
    .replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>')
    .replace(/\n{2,}/g, '<br><br>').replace(/\n/g, ' ');
}
// Expose for debugging in the console.
window.studio = { state, prettyLabel };
