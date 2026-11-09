// Ralph AI Chat — a ChatGPT-style client for /api/assistant.
// Conversations live in this browser's localStorage only.

const $ = (id) => document.getElementById(id);
// On GitHub Pages there are no functions, so call the Netlify backend directly.
const API = location.hostname.endsWith('github.io')
  ? 'https://ralph-ai-suite.vercel.app/api/assistant'
  : '/api/assistant';

const KEYS = { convos: 'ralph-chat-convos-v1', code: 'ralph-chat-code', side: 'ralph-chat-sidebar', theme: 'studio-theme' };
const CONTINUE_PROMPT = 'Continue exactly where you left off, without repeating anything.';
const MAX_ATTACH = 4;
const MAX_SIDE = 1568;
const MAX_TEXT = 20000;
const MAX_CONTINUES = 8;

const store = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); return true; } catch { return false; } },
  del(k) { try { localStorage.removeItem(k); } catch { /* ignore */ } },
};

const ICON = {
  bot: '<svg viewBox="0 0 24 24"><path d="M5 6h14a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-7l-5 4v-4H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2z"/></svg>',
  copy: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V6a2 2 0 0 1 2-2h8"/></svg>',
  check: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12l5 5 9-10"/></svg>',
  regen: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7"/></svg>',
  edit: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16v4zM13.5 6.5l4 4"/></svg>',
  trash: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg>',
  x: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  bulb: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z"/></svg>',
  code: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 7l-5 5 5 5M16 7l5 5-5 5M14 4l-4 16"/></svg>',
  chat: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h16v11H9l-5 4V5z"/><path d="M8 10h8"/></svg>',
  image: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="M21 16l-5-5-9 9"/></svg>',
};

const EXAMPLES = [
  { icon: 'bulb', title: 'Explain a concept', sub: 'How do neural networks actually learn?', prompt: 'Explain how neural networks learn, like I\'m a first-year college student. Keep it short and use a simple analogy.' },
  { icon: 'code', title: 'Write some code', sub: 'Clean a messy CSV with pandas', prompt: 'Write a Python function that cleans a messy CSV with pandas: trim whitespace, fix column names, parse dates and drop duplicates. Add a short usage example.' },
  { icon: 'chat', title: 'Tulungan mo ako', sub: 'Study plan para sa board exam (Taglish)', prompt: 'Gawan mo ako ng 4-week study plan para sa board exam ko. May work ako on weekdays kaya mga 2 hours lang per day. Taglish lang please!' },
  { icon: 'image', title: 'Analyze this image', sub: 'Attach a photo, chart or screenshot', prompt: 'Analyze this image. Describe what\'s in it and point out anything important or interesting.', attach: true },
];

// ---------- state ----------
let convos = loadConvos();
let activeId = null;
let pending = [];          // attachments for the next message: { id, media_type, data, thumb, ready }
let busy = null;           // { controller, conv, msg, stopped }
let accessCode = store.get(KEYS.code) || '';
let afterGate = null;      // action to resume after the code is entered
const els = new Map();     // message id -> rendered element

const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
const activeConv = () => convos.find((c) => c.id === activeId) || null;
const isMobile = () => matchMedia('(max-width: 860px)').matches;

// ---------- persistence ----------
function loadConvos() {
  try {
    const list = JSON.parse(store.get(KEYS.convos) || '[]');
    if (!Array.isArray(list)) return [];
    return list.filter((c) => c && c.id && Array.isArray(c.messages)).map((c) => {
      // A reply that was mid-stream when the page closed is shown as stopped.
      for (const m of c.messages) if (m.streaming) { delete m.streaming; m.stopped = true; }
      return c;
    });
  } catch { return []; }
}

function saveConvos() {
  const snapshot = () => JSON.stringify(convos.slice(0, 100));
  if (store.set(KEYS.convos, snapshot())) return;
  // Over the storage quota: drop full-size image data (keep thumbnails), oldest chats first.
  const order = [...convos].sort((a, b) => a.updated - b.updated);
  for (const c of order) {
    let changed = false;
    for (const m of c.messages) for (const img of m.images || []) if (img.data) { delete img.data; changed = true; }
    if (changed && store.set(KEYS.convos, snapshot())) return;
  }
  // Still full: keep only the most recent chats.
  for (let n = Math.min(convos.length, 50); n > 0; n = Math.floor(n / 2)) {
    if (store.set(KEYS.convos, JSON.stringify(convos.slice(0, n)))) { toast('Storage is full — older chats were not saved.'); return; }
  }
}

// ---------- theme ----------
$('btnTheme').addEventListener('click', () => {
  const next = document.documentElement.dataset.theme === 'light' ? 'dark' : 'light';
  document.documentElement.dataset.theme = next;
  store.set(KEYS.theme, next);
});

// ---------- sidebar ----------
const app = $('app');
function setSidebar(open) {
  if (isMobile()) {
    app.classList.toggle('drawer-open', open);
    $('scrim').hidden = !open;
    if (open) setTimeout(() => $('btnNewChat').focus(), 50);
  } else {
    app.classList.toggle('side-collapsed', !open);
    store.set(KEYS.side, open ? 'open' : 'closed');
  }
  $('btnSidebar').setAttribute('aria-expanded', String(open));
}
const sidebarOpen = () => (isMobile() ? app.classList.contains('drawer-open') : !app.classList.contains('side-collapsed'));
$('btnSidebar').addEventListener('click', () => setSidebar(!sidebarOpen()));
$('btnSideClose').addEventListener('click', () => { setSidebar(false); $('btnSidebar').focus(); });
$('scrim').addEventListener('click', () => setSidebar(false));
if (store.get(KEYS.side) === 'closed') app.classList.add('side-collapsed');
$('btnSidebar').setAttribute('aria-expanded', String(sidebarOpen()));
matchMedia('(max-width: 860px)').addEventListener('change', () => {
  app.classList.remove('drawer-open'); $('scrim').hidden = true;
  $('btnSidebar').setAttribute('aria-expanded', String(sidebarOpen()));
});

function renderSidebar() {
  const list = $('convoList');
  list.textContent = '';
  if (!convos.length) {
    const p = document.createElement('p');
    p.className = 'side-empty';
    p.textContent = 'No chats yet. Your conversations will appear here.';
    list.append(p);
    return;
  }
  const startToday = new Date(); startToday.setHours(0, 0, 0, 0);
  const t0 = startToday.getTime();
  const groups = [['Today', []], ['Previous 7 days', []], ['Older', []]];
  for (const c of [...convos].sort((a, b) => b.updated - a.updated)) {
    groups[c.updated >= t0 ? 0 : c.updated >= t0 - 7 * 864e5 ? 1 : 2][1].push(c);
  }
  for (const [label, items] of groups) {
    if (!items.length) continue;
    const h = document.createElement('div');
    h.className = 'group-label';
    h.textContent = label;
    list.append(h);
    for (const c of items) {
      const row = document.createElement('div');
      row.className = 'convo' + (c.id === activeId ? ' active' : '');
      row.dataset.id = c.id;
      const open = document.createElement('button');
      open.className = 'convo-open';
      open.textContent = c.title || 'New chat';
      open.title = c.title || 'New chat';
      if (c.id === activeId) open.setAttribute('aria-current', 'page');
      open.addEventListener('click', () => { openConv(c.id); if (isMobile()) setSidebar(false); });
      const acts = document.createElement('div');
      acts.className = 'convo-actions';
      acts.append(
        miniBtn(ICON.edit, `Rename “${c.title}”`, () => renameConv(c.id)),
        miniBtn(ICON.trash, `Delete “${c.title}”`, () => deleteConv(c.id), 'danger'),
      );
      row.append(open, acts);
      list.append(row);
    }
  }
}

function miniBtn(icon, label, fn, extra = '') {
  const b = document.createElement('button');
  b.className = 'mini-btn ' + extra;
  b.innerHTML = icon;
  b.setAttribute('aria-label', label);
  b.title = label.split(' “')[0];
  b.addEventListener('click', (e) => { e.stopPropagation(); fn(); });
  return b;
}

function makeTitle(text, hasImage) {
  const t = (text || '').replace(/\s+/g, ' ').trim();
  if (!t) return hasImage ? 'Image analysis' : 'New chat';
  if (t.length <= 42) return t;
  const cut = t.slice(0, 42);
  return (cut.lastIndexOf(' ') > 24 ? cut.slice(0, cut.lastIndexOf(' ')) : cut) + '…';
}

// ---------- rename / delete ----------
let renaming = null;
function renameConv(id) {
  const c = convos.find((x) => x.id === id);
  if (!c) return;
  renaming = id;
  $('renameInput').value = c.title || '';
  openModal('renameWrap', $('renameInput'));
  $('renameInput').select();
}
$('renameForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const c = convos.find((x) => x.id === renaming);
  const v = $('renameInput').value.trim();
  if (c && v) { c.title = v.slice(0, 80); saveConvos(); renderSidebar(); }
  closeModal('renameWrap');
});
$('renameCancel').addEventListener('click', () => closeModal('renameWrap'));

function deleteConv(id) {
  const idx = convos.findIndex((x) => x.id === id);
  if (idx < 0) return;
  if (busy && busy.conv.id === id) stopStreaming();
  const [removed] = convos.splice(idx, 1);
  saveConvos();
  if (activeId === id) newChat();
  else renderSidebar();
  toast('Chat deleted', 'Undo', () => {
    convos.splice(Math.min(idx, convos.length), 0, removed);
    saveConvos();
    openConv(removed.id);
  });
}

// ---------- conversations ----------
function newChat() {
  activeId = null;
  renderThread();
  renderSidebar();
  $('prompt').focus({ preventScroll: true });
}
$('btnNewChat').addEventListener('click', () => { newChat(); if (isMobile()) setSidebar(false); });

function openConv(id) {
  activeId = id;
  renderThread();
  renderSidebar();
  scrollToBottom(true);
}

// ---------- rendering ----------
const thread = $('thread');
const scroller = $('scroller');

function renderThread() {
  thread.textContent = '';
  els.clear();
  const conv = activeConv();
  const has = conv && conv.messages.length;
  $('empty').hidden = !!has;
  if (!has) return;
  conv.messages.forEach((m) => thread.append(renderMessage(m, conv)));
}

function renderMessage(m, conv) {
  const el = document.createElement('article');
  el.className = 'msg ' + m.role;
  el.dataset.id = m.id;
  if (m.role === 'user') {
    el.setAttribute('aria-label', 'You said');
    const wrap = document.createElement('div');
    wrap.className = 'bubble-wrap';
    if (m.images?.length) {
      const imgs = document.createElement('div');
      imgs.className = 'msg-images';
      for (const img of m.images) {
        const i = document.createElement('img');
        i.src = img.thumb || `data:${img.media_type};base64,${img.data}`;
        i.alt = 'Attached image';
        imgs.append(i);
      }
      wrap.append(imgs);
    }
    if (m.text) {
      const b = document.createElement('div');
      b.className = 'bubble';
      b.textContent = m.text;
      wrap.append(b);
    }
    const acts = document.createElement('div');
    acts.className = 'actions';
    acts.append(actBtn(ICON.copy, 'Copy', 'Copy message', (btn) => copyText(m.text, btn)));
    wrap.append(acts);
    el.append(wrap);
  } else {
    el.setAttribute('aria-label', 'Ralph AI said');
    const av = document.createElement('div');
    av.className = 'avatar';
    av.setAttribute('aria-hidden', 'true');
    av.innerHTML = ICON.bot;
    const body = document.createElement('div');
    body.className = 'body';
    const md = document.createElement('div');
    md.className = 'md';
    body.append(md);
    el.append(av, body);
    els.set(m.id, el);
    paintAssistant(m, conv);
  }
  return el;
}

function actBtn(icon, text, label, fn) {
  const b = document.createElement('button');
  b.className = 'act';
  b.type = 'button';
  b.innerHTML = icon + `<span>${text}</span>`;
  b.setAttribute('aria-label', label);
  b.addEventListener('click', () => fn(b));
  return b;
}

// Re-render an assistant message (content + status + actions).
function paintAssistant(m, conv = activeConv()) {
  const el = els.get(m.id);
  if (!el) return;
  const body = el.querySelector('.body');
  const md = body.querySelector('.md');
  const streaming = !!(busy && busy.msg === m);
  if (!m.text && streaming) {
    md.innerHTML = '<span class="thinking" role="img" aria-label="Ralph AI is thinking"><i></i><i></i><i></i></span>';
  } else {
    renderMarkdown(md, m.text, streaming);
  }
  body.querySelectorAll('.alert, .note, .actions').forEach((n) => n.remove());
  if (streaming) return;

  if (m.stopped) body.append(note(m.text ? 'Stopped' : 'Stopped before Ralph AI replied.'));
  if (m.refused) body.append(alertBox('That’s one I can’t help with.', 'Try rephrasing, or ask something else.', m, 'info'));
  if (m.error) body.append(alertBox(m.error.title, m.error.detail, m, m.error.tone));

  const isLast = conv && conv.messages[conv.messages.length - 1] === m;
  const acts = document.createElement('div');
  acts.className = 'actions';
  if (m.text) acts.append(actBtn(ICON.copy, 'Copy', 'Copy answer', (btn) => copyText(m.text, btn)));
  if (isLast && !m.error && !m.refused) acts.append(actBtn(ICON.regen, 'Regenerate', 'Regenerate answer', () => regenerate()));
  if (acts.children.length) body.append(acts);
}

function note(text) {
  const p = document.createElement('p');
  p.className = 'note';
  p.textContent = text;
  return p;
}

function alertBox(title, detail, m, tone = '') {
  const box = document.createElement('div');
  box.className = 'alert ' + tone;
  box.setAttribute('role', 'alert');
  const t = document.createElement('div');
  t.className = 'alert-text';
  const b = document.createElement('b');
  b.textContent = title;
  t.append(b, document.createTextNode(detail || ''));
  const retry = document.createElement('button');
  retry.className = 'retry';
  retry.type = 'button';
  retry.innerHTML = ICON.regen + '<span>Retry</span>';
  retry.addEventListener('click', () => regenerate());
  box.append(t, retry);
  return box;
}

// ---------- markdown ----------
let purifyHooked = false;
function renderMarkdown(target, text, streaming) {
  if (!window.marked || !window.DOMPurify) {
    target.textContent = text; // libraries unavailable: never inject unsanitized HTML
    if (streaming) target.append(cursorEl());
    return;
  }
  if (!purifyHooked) {
    DOMPurify.addHook('afterSanitizeAttributes', (node) => {
      if (node.tagName === 'A' && node.getAttribute('href')) {
        node.setAttribute('target', '_blank');
        node.setAttribute('rel', 'noopener noreferrer');
      }
    });
    purifyHooked = true;
  }
  let html;
  try { html = marked.parse(text, { gfm: true, breaks: false, async: false }); } catch { target.textContent = text; return; }
  target.innerHTML = DOMPurify.sanitize(html, { FORBID_TAGS: ['style', 'form', 'input', 'button', 'iframe'], FORBID_ATTR: ['style'] });
  enhance(target, streaming);
  if (streaming) appendCursor(target);
}

function enhance(root, streaming) {
  root.querySelectorAll('pre > code').forEach((code) => {
    const pre = code.parentElement;
    const lang = ((code.className.match(/language-([\w+#.-]+)/) || [])[1] || '').toLowerCase();
    const block = document.createElement('div');
    block.className = 'code-block';
    const head = document.createElement('div');
    head.className = 'code-head';
    const label = document.createElement('span');
    label.className = 'code-lang';
    label.textContent = lang || 'code';
    const copy = document.createElement('button');
    copy.className = 'copy-code';
    copy.type = 'button';
    copy.innerHTML = ICON.copy + '<span>Copy code</span>';
    copy.setAttribute('aria-label', `Copy ${lang || ''} code`.replace('  ', ' '));
    head.append(label, copy);
    pre.replaceWith(block);
    block.append(head, pre);
    if (window.hljs) {
      try {
        const src = code.textContent;
        let out = null;
        if (lang && hljs.getLanguage(lang)) out = hljs.highlight(src, { language: lang, ignoreIllegals: true });
        else if (!streaming && src.length < 20000) out = hljs.highlightAuto(src);
        if (out) { code.innerHTML = out.value; code.classList.add('hljs'); } // hljs output is escaped
      } catch { /* leave plain */ }
    }
  });
  root.querySelectorAll('table').forEach((t) => {
    const w = document.createElement('div');
    w.className = 'table-wrap';
    t.replaceWith(w);
    w.append(t);
  });
}

const cursorEl = () => { const s = document.createElement('span'); s.className = 'cursor'; s.setAttribute('aria-hidden', 'true'); return s; };
// The last node that actually holds content (skips trailing whitespace-only text).
const lastContentNode = (el) => {
  let n = el.lastChild;
  while (n && n.nodeType === Node.TEXT_NODE && !n.textContent.trim()) n = n.previousSibling;
  return n;
};
function appendCursor(root) {
  let node = root;
  // Only descend into the last element if nothing comes after it — otherwise
  // "a **longer** answer" would put the cursor after "longer", mid-sentence.
  while (node.lastElementChild && lastContentNode(node) === node.lastElementChild && !['BR', 'HR', 'IMG'].includes(node.lastElementChild.tagName)) {
    const last = node.lastElementChild;
    if (last.classList.contains('code-head')) break;
    node = last.classList.contains('code-block') ? last.querySelector('code') : last;
    if (node.tagName === 'CODE') break;
  }
  node.append(cursorEl());
}

thread.addEventListener('click', (e) => {
  const btn = e.target.closest('.copy-code');
  if (!btn) return;
  const code = btn.closest('.code-block')?.querySelector('code');
  if (code) copyText(code.textContent, btn, 'Copied!');
});

async function copyText(text, btn, done = 'Copied') {
  let ok = false;
  try { await navigator.clipboard.writeText(text); ok = true; } catch {
    try {
      const ta = document.createElement('textarea');
      ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.append(ta); ta.select();
      ok = document.execCommand('copy'); ta.remove();
    } catch { ok = false; }
  }
  if (!ok) { toast('Couldn’t copy — select the text instead.'); return; }
  if (btn) {
    const span = btn.querySelector('span');
    const prevIcon = btn.querySelector('svg')?.outerHTML;
    const prevText = span?.textContent;
    btn.querySelector('svg')?.remove();
    btn.insertAdjacentHTML('afterbegin', ICON.check);
    if (span) span.textContent = done;
    setTimeout(() => {
      btn.querySelector('svg')?.remove();
      if (prevIcon) btn.insertAdjacentHTML('afterbegin', prevIcon);
      if (span) span.textContent = prevText;
    }, 1600);
  }
}

// ---------- scrolling ----------
let stick = true;
const nearBottom = () => scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight < 80;
scroller.addEventListener('scroll', () => { stick = nearBottom(); $('btnJump').hidden = stick || !activeConv(); }, { passive: true });
function scrollToBottom(force) {
  if (force) stick = true;
  if (stick) { scroller.scrollTop = scroller.scrollHeight; $('btnJump').hidden = true; }
}
$('btnJump').addEventListener('click', () => { scroller.scrollTo({ top: scroller.scrollHeight, behavior: 'smooth' }); stick = true; });

// ---------- composer ----------
const prompt = $('prompt');
prompt.maxLength = MAX_TEXT;
function autosize() {
  prompt.style.height = 'auto';
  prompt.style.height = Math.min(prompt.scrollHeight, 200) + 'px';
  updateSend();
}
function updateSend() {
  const ready = pending.every((p) => p.ready);
  $('btnSend').disabled = !!busy || !ready || (!prompt.value.trim() && !pending.length);
}
prompt.addEventListener('input', autosize);
prompt.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
    e.preventDefault();
    if (!$('btnSend').disabled) $('composer').requestSubmit();
  }
});
$('composer').addEventListener('submit', (e) => { e.preventDefault(); send(); });
$('btnStop').addEventListener('click', () => stopStreaming());

// attachments
$('btnAttach').addEventListener('click', () => $('fileInput').click());
$('fileInput').addEventListener('change', (e) => { addFiles([...e.target.files]); e.target.value = ''; });
prompt.addEventListener('paste', (e) => {
  const files = [...(e.clipboardData?.files || [])].filter((f) => f.type.startsWith('image/'));
  if (files.length) { e.preventDefault(); addFiles(files); }
});
const chatEl = $('chat');
let dragDepth = 0;
const hasFiles = (e) => [...(e.dataTransfer?.types || [])].includes('Files');
chatEl.addEventListener('dragenter', (e) => { if (!hasFiles(e)) return; e.preventDefault(); dragDepth++; showDrop(true); });
chatEl.addEventListener('dragover', (e) => { if (hasFiles(e)) e.preventDefault(); });
chatEl.addEventListener('dragleave', () => { if (--dragDepth <= 0) { dragDepth = 0; showDrop(false); } });
chatEl.addEventListener('drop', (e) => {
  if (!hasFiles(e)) return;
  e.preventDefault(); dragDepth = 0; showDrop(false);
  addFiles([...e.dataTransfer.files]);
});
function showDrop(on) { $('dropHint').hidden = !on; $('composer').classList.toggle('dragging', on); }

async function addFiles(files) {
  for (const f of files) {
    if (pending.length >= MAX_ATTACH) { toast(`You can attach up to ${MAX_ATTACH} images per message.`); break; }
    if (!/^image\/(jpeg|png|webp|gif)$/.test(f.type)) { toast('Only JPG, PNG, WebP or GIF images can be attached.'); continue; }
    if (f.size > 30 * 1024 * 1024) { toast('That image is too large (max 30 MB).'); continue; }
    const item = { id: uid(), media_type: 'image/jpeg', data: '', thumb: '', ready: false };
    pending.push(item);
    renderAttachments();
    try {
      const { data, thumb } = await resizeImage(f);
      if (!pending.includes(item)) continue; // removed while processing
      Object.assign(item, { data, thumb, ready: true });
    } catch {
      pending = pending.filter((p) => p !== item);
      toast('Couldn’t read that image.');
    }
    renderAttachments();
  }
  prompt.focus();
}

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('decode')); };
    img.src = url;
  });
}

function drawJpeg(img, maxSide, quality) {
  const w = img.naturalWidth, h = img.naturalHeight;
  const scale = Math.min(1, maxSide / Math.max(w, h));
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w * scale));
  c.height = Math.max(1, Math.round(h * scale));
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#ffffff'; // transparent PNGs get a white background, not black
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.drawImage(img, 0, 0, c.width, c.height);
  return c.toDataURL('image/jpeg', quality);
}

// Resize to ≤1568px on the long side as JPEG ~0.85 (keeps requests far under Netlify's 6 MB cap).
async function resizeImage(file) {
  const img = await loadImage(file);
  if (!img.naturalWidth || !img.naturalHeight) throw new Error('empty');
  const full = drawJpeg(img, MAX_SIDE, 0.85);
  const thumb = drawJpeg(img, 320, 0.7);
  return { data: full.slice(full.indexOf(',') + 1), thumb };
}

function renderAttachments() {
  const box = $('attachments');
  box.textContent = '';
  for (const p of pending) {
    const t = document.createElement('div');
    t.className = 'thumb' + (p.ready ? '' : ' loading');
    if (p.thumb) {
      const img = document.createElement('img');
      img.src = p.thumb;
      img.alt = 'Attachment preview';
      t.append(img);
    }
    const x = document.createElement('button');
    x.type = 'button';
    x.className = 'thumb-x';
    x.innerHTML = ICON.x;
    x.setAttribute('aria-label', 'Remove image');
    x.addEventListener('click', () => { pending = pending.filter((q) => q !== p); renderAttachments(); prompt.focus(); });
    t.append(x);
    box.append(t);
  }
  updateSend();
}

// voice input
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
let recog = null;
if (SR) {
  const mic = $('btnMic');
  mic.hidden = false;
  mic.addEventListener('click', () => {
    if (recog) { recog.stop(); return; }
    recog = new SR();
    recog.lang = navigator.language || 'en-US';
    recog.interimResults = true;
    recog.continuous = false;
    const base = prompt.value ? prompt.value.replace(/\s*$/, ' ') : '';
    recog.onresult = (e) => {
      let txt = '';
      for (const r of e.results) txt += r[0].transcript;
      prompt.value = (base + txt).slice(0, MAX_TEXT);
      autosize();
    };
    recog.onerror = (e) => {
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') toast('Microphone access was blocked.');
      else if (e.error !== 'no-speech' && e.error !== 'aborted') toast('Voice input stopped.');
    };
    recog.onend = () => { recog = null; mic.setAttribute('aria-pressed', 'false'); mic.setAttribute('aria-label', 'Voice input'); prompt.focus(); };
    try {
      recog.start();
      mic.setAttribute('aria-pressed', 'true');
      mic.setAttribute('aria-label', 'Stop voice input');
    } catch { recog = null; }
  });
}

// ---------- examples ----------
for (const ex of EXAMPLES) {
  const b = document.createElement('button');
  b.className = 'example';
  b.type = 'button';
  b.innerHTML = `<span class="ex-icon">${ICON[ex.icon]}</span><span class="ex-text"><span class="ex-title"></span><span class="ex-sub"></span></span>`;
  b.querySelector('.ex-title').textContent = ex.title;
  b.querySelector('.ex-sub').textContent = ex.sub;
  b.addEventListener('click', () => {
    prompt.value = ex.prompt;
    autosize();
    if (ex.attach) { $('fileInput').click(); prompt.focus(); }
    else send();
  });
  $('examples').append(b);
}

// ---------- sending ----------
function send() {
  if (busy) return;
  const text = prompt.value.trim();
  if (!text && !pending.length) return;
  if (!pending.every((p) => p.ready)) return;
  if (!accessCode) { afterGate = () => send(); showGate(); return; }

  let conv = activeConv();
  if (!conv) {
    conv = { id: uid(), title: makeTitle(text, pending.length > 0), created: Date.now(), updated: Date.now(), messages: [] };
    convos.unshift(conv);
    activeId = conv.id;
  }
  const userMsg = { id: uid(), role: 'user', text };
  if (pending.length) userMsg.images = pending.map(({ media_type, data, thumb }) => ({ media_type, data, thumb }));
  conv.messages.push(userMsg);
  prompt.value = '';
  pending = [];
  renderAttachments();
  autosize();
  $('empty').hidden = true;
  thread.append(renderMessage(userMsg, conv));
  startReply(conv);
}

function regenerate() {
  if (busy) return;
  const conv = activeConv();
  if (!conv) return;
  const last = conv.messages[conv.messages.length - 1];
  if (last?.role === 'assistant') {
    conv.messages.pop();
    els.get(last.id)?.remove();
    els.delete(last.id);
  }
  if (!conv.messages.length || conv.messages[conv.messages.length - 1].role !== 'user') return;
  if (!accessCode) { afterGate = () => regenerate(); showGate(); return; }
  startReply(conv);
}

function startReply(conv) {
  const prevAnswer = [...conv.messages].reverse().find((m) => m.role === 'assistant');
  const msg = { id: uid(), role: 'assistant', text: '', streaming: true };
  conv.messages.push(msg);
  conv.updated = Date.now();
  // Move this chat to the top.
  convos = [conv, ...convos.filter((c) => c !== conv)];
  busy = { controller: null, conv, msg, stopped: false };
  // Remove the regenerate button from the previous answer.
  if (prevAnswer) paintAssistant(prevAnswer, conv);
  thread.append(renderMessage(msg, conv));
  renderSidebar();
  setBusyUI(true);
  scrollToBottom(true);
  saveConvos();
  stream(conv, msg).finally(() => {
    delete msg.streaming;
    busy = null;
    setBusyUI(false);
    conv.updated = Date.now();
    saveConvos();
    if (activeId === conv.id) { paintAssistant(msg, conv); scrollToBottom(); }
    announce(msg.error ? msg.error.title : msg.refused ? 'Ralph AI declined to answer.' : 'Ralph AI finished responding.');
  });
}

function setBusyUI(on) {
  $('btnStop').hidden = !on;
  $('btnSend').hidden = on;
  thread.setAttribute('aria-busy', String(on));
  if (on) $('btnStop').focus({ preventScroll: true });
  else if (document.activeElement === document.body || document.activeElement === $('btnStop')) prompt.focus({ preventScroll: true });
  updateSend();
}

function stopStreaming() {
  if (!busy) return;
  busy.stopped = true;
  busy.controller?.abort();
}

// Convert stored messages to the API shape, within the server's limits.
function toApiMessages(msgs) {
  const list = [];
  for (const m of msgs) {
    if (m.role === 'assistant' && !(m.text || '').trim()) continue; // failed / empty replies
    const prev = list[list.length - 1];
    const item = { role: m.role, text: m.text || '', images: m.role === 'user' ? (m.images || []) : [] };
    if (prev && prev.role === item.role) { // merge so roles alternate
      prev.text = [prev.text, item.text].filter(Boolean).join('\n\n');
      prev.images = [...prev.images, ...item.images];
    } else list.push(item);
  }
  while (list.length > 28) list.shift(); // leave room for a continuation pair (max 30)
  while (list.length && list[0].role !== 'user') list.shift();
  let total = list.reduce((n, m) => n + Math.min(m.text.length, 19900), 0);
  while (total > 180000 && list.length > 2) {
    total -= Math.min(list.shift().text.length, 19900);
    while (list.length && list[0].role !== 'user') total -= Math.min(list.shift().text.length, 19900);
  }
  // Newest images first: at most 4 and ~4.5 MB of base64 per request.
  let count = 0, bytes = 0;
  for (let i = list.length - 1; i >= 0; i--) {
    const m = list[i];
    m.keep = [];
    for (const img of [...m.images].reverse()) {
      const data = img.data || (img.thumb ? img.thumb.slice(img.thumb.indexOf(',') + 1) : '');
      if (!data) continue;
      if (count < MAX_ATTACH && bytes + data.length <= 4_500_000) {
        count++; bytes += data.length;
        m.keep.unshift({ type: 'image', media_type: img.data ? img.media_type : 'image/jpeg', data });
      }
    }
    m.dropped = m.images.length - m.keep.length;
  }
  return list.map((m) => {
    const text = m.text.length > 19900 ? m.text.slice(0, 19900) : m.text;
    if (m.role === 'assistant') return { role: 'assistant', content: text };
    const noteTxt = m.dropped ? `[${m.dropped} earlier image${m.dropped > 1 ? 's' : ''} not included]` : '';
    const t = [noteTxt, text].filter(Boolean).join('\n');
    const content = [...m.keep];
    if (t.trim()) content.push({ type: 'text', text: t });
    if (!content.length) content.push({ type: 'text', text: '(image)' });
    return { role: 'user', content };
  });
}

class ChatError extends Error {
  constructor(kind, status, detail) { super(kind); this.kind = kind; this.status = status; this.detail = detail; }
}

async function stream(conv, msg) {
  const base = toApiMessages(conv.messages.slice(0, -1));
  const controller = new AbortController();
  busy.controller = controller;
  let continues = 0;
  let netRetries = 0;
  let frame = 0;
  const paint = () => {
    if (frame) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      if (activeId === conv.id) { paintAssistant(msg, conv); scrollToBottom(); }
    });
  };

  try {
    for (;;) {
      const before = msg.text;
      // After a server-side cutoff, send what we have so far and ask for the rest.
      // (No assistant prefill: the last turn must be the user's.)
      const messages = before.trim()
        ? [...base, { role: 'assistant', content: before.length > 19900 ? before.slice(-19900) : before }, { role: 'user', content: CONTINUE_PROMPT }]
        : base;
      let res;
      try {
        res = await fetch(API, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ accessCode, messages }),
          signal: controller.signal,
        });
      } catch (err) {
        if (controller.signal.aborted) throw err;
        throw new ChatError('network');
      }
      if (!res.ok) {
        let body = {};
        try { body = await res.json(); } catch { /* not json */ }
        throw new ChatError('http', res.status, body.error);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let raw = '';
      try {
        for (;;) {
          const { value, done } = await reader.read();
          if (done) break;
          raw += decoder.decode(value, { stream: true });
          const cut = raw.indexOf('\u0000');
          msg.text = before + (cut >= 0 ? raw.slice(0, cut) : raw).replace(/\u0001/g, '');
          paint();
        }
        raw += decoder.decode();
      } catch (err) {
        if (controller.signal.aborted) throw err;
        // The connection dropped mid-answer: pick up where it stopped, once or twice.
        if (msg.text.trim() && netRetries < 2) { netRetries++; continue; }
        throw new ChatError('network');
      }
      const cut = raw.indexOf('\u0000');
      const marker = cut >= 0 ? raw.slice(cut + 1) : '';
      msg.text = before + (cut >= 0 ? raw.slice(0, cut) : raw).replace(/\u0001/g, '');
      if (marker.startsWith('CONTINUE') && continues < MAX_CONTINUES) { continues++; paint(); continue; }
      if (marker.startsWith('REFUSAL')) msg.refused = true;
      else if (marker.startsWith('ERROR')) throw new ChatError('server');
      else if (!msg.text.trim() && !marker) throw new ChatError('empty');
      break;
    }
  } catch (err) {
    if (controller.signal.aborted || busy?.stopped) { msg.stopped = true; return; }
    handleError(err, conv, msg);
  } finally {
    if (frame) cancelAnimationFrame(frame);
  }
}

function handleError(err, conv, msg) {
  const status = err.status;
  const code = err.detail;
  if (err.kind === 'http' && status === 401) {
    // Wrong or revoked code: forget it, drop the empty reply and ask again.
    accessCode = '';
    store.del(KEYS.code);
    if (!msg.text) {
      conv.messages = conv.messages.filter((m) => m !== msg);
      els.get(msg.id)?.remove();
      els.delete(msg.id);
    }
    msg.error = { title: 'Access code needed', detail: 'Enter the demo access code to continue.', tone: 'info' };
    afterGate = () => { if (activeId !== conv.id) openConv(conv.id); regenerate(); };
    setTimeout(() => showGate('That access code didn’t work. Please enter it again.'), 0);
    return;
  }
  if (err.kind === 'http' && status === 503 && (code === 'chat_not_configured' || code === 'not_configured')) {
    msg.error = { title: 'Chat isn’t switched on yet.', detail: 'The owner hasn’t enabled the AI backend. Please try again a little later.', tone: 'info' };
  } else if (err.kind === 'http' && status === 429) {
    msg.error = { title: 'Too many messages right now.', detail: 'Please wait a minute, then retry.', tone: 'info' };
  } else if (err.kind === 'http' && status === 413) {
    msg.error = { title: 'That message is too large.', detail: 'Try fewer or smaller images.' };
  } else if (err.kind === 'http' && status === 400) {
    msg.error = { title: 'The request couldn’t be processed.', detail: code ? `(${String(code).slice(0, 120)})` : '' };
  } else if (err.kind === 'network') {
    msg.error = { title: 'Network problem.', detail: 'Couldn’t reach Ralph AI. Check your connection and retry.' };
  } else if (err.kind === 'server' || err.kind === 'http') {
    msg.error = { title: 'Ralph AI hit a snag.', detail: 'Something went wrong on the server. Please retry.' };
  } else if (err.kind === 'empty') {
    msg.error = { title: 'No answer came back.', detail: 'Please retry.' };
  } else {
    console.warn(err);
    msg.error = { title: 'Something went wrong.', detail: 'Please retry.' };
  }
}

// ---------- access gate ----------
let lastFocus = null;
function openModal(id, focusEl) {
  lastFocus = document.activeElement;
  $(id).hidden = false;
  setTimeout(() => focusEl?.focus(), 30);
}
function closeModal(id) {
  $(id).hidden = true;
  if (lastFocus && document.contains(lastFocus)) lastFocus.focus({ preventScroll: true });
}
function showGate(message = '') {
  const msgEl = $('gateMsg');
  msgEl.textContent = message;
  msgEl.className = 'gate-msg';
  $('gateCode').value = '';
  $('gateSubmit').disabled = false;
  $('gateSubmit').textContent = 'Unlock chat';
  if ($('gate').hidden) openModal('gate', $('gateCode'));
  else $('gateCode').focus();
}
$('gateForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const code = $('gateCode').value.trim();
  if (!code) return;
  const btn = $('gateSubmit');
  const msgEl = $('gateMsg');
  btn.disabled = true;
  btn.textContent = 'Checking…';
  msgEl.textContent = '';
  try {
    const res = await fetch(API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accessCode: code, verify: true }),
    });
    let body = {};
    try { body = await res.json(); } catch { /* ignore */ }
    if (res.ok && body.ok) {
      accessCode = code;
      store.set(KEYS.code, code);
      closeModal('gate');
      toast('Unlocked — welcome to Ralph AI Chat!');
      const next = afterGate; afterGate = null;
      if (next) next(); else prompt.focus();
      return;
    }
    msgEl.className = 'gate-msg';
    if (res.status === 401) msgEl.textContent = 'That code didn’t work. Please check it and try again.';
    else if (res.status === 503) { msgEl.className = 'gate-msg info'; msgEl.textContent = 'Chat isn’t switched on yet — please check back a little later.'; }
    else if (res.status === 429) msgEl.textContent = 'Too many attempts. Please wait a minute and try again.';
    else msgEl.textContent = 'Something went wrong. Please try again.';
  } catch {
    msgEl.className = 'gate-msg';
    msgEl.textContent = 'Couldn’t reach the server. Check your connection and try again.';
  }
  btn.disabled = false;
  btn.textContent = 'Unlock chat';
  $('gateCode').focus();
  $('gateCode').select();
});

// Keep keyboard focus inside open dialogs; Esc closes the rename dialog and the drawer.
document.addEventListener('keydown', (e) => {
  const open = [...document.querySelectorAll('.modal-wrap')].find((m) => !m.hidden);
  if (e.key === 'Escape') {
    if (open?.id === 'renameWrap') closeModal('renameWrap');
    else if (!open && isMobile() && sidebarOpen()) { setSidebar(false); $('btnSidebar').focus(); }
    else if (!open && busy) stopStreaming();
    return;
  }
  if (e.key === 'Tab' && open) {
    const f = [...open.querySelectorAll('button, input, [tabindex]:not([tabindex="-1"])')].filter((x) => !x.disabled && x.offsetParent);
    if (!f.length) return;
    const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }
});

// ---------- toast + announcements ----------
let toastTimer = 0;
function toast(text, actionLabel, action) {
  const t = $('toast');
  t.textContent = '';
  const s = document.createElement('span');
  s.textContent = text;
  t.append(s);
  if (actionLabel) {
    const b = document.createElement('button');
    b.className = 'toast-act';
    b.type = 'button';
    b.textContent = actionLabel;
    b.addEventListener('click', () => { t.hidden = true; action(); });
    t.append(b);
  }
  t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.hidden = true; }, actionLabel ? 6000 : 2600);
}

const live = document.createElement('div');
live.className = 'sr-only';
live.setAttribute('aria-live', 'polite');
document.body.append(live);
function announce(text) { live.textContent = ''; setTimeout(() => { live.textContent = text; }, 50); }

// Save a half-finished answer if the tab closes mid-stream.
addEventListener('pagehide', () => { if (busy) saveConvos(); });

// ---------- boot ----------
renderSidebar();
renderThread();
autosize();
if (!accessCode) showGate();
else prompt.focus({ preventScroll: true });
// Re-render once the CDN libraries arrive (marked/DOMPurify/hljs are deferred).
addEventListener('load', () => { if (activeConv()) renderThread(); });
