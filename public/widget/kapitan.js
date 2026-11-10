/*!
 * Kapitan — chat widget shared by all of Ralph Garcia's sites.
 * Usage: <script src="https://garciaralphlawrence-svg.github.io/AI-Analytics-Studio/widget/kapitan.js" data-site="kmm" data-api="https://ralph-ai-suite.vercel.app" defer></script>
 * data-site: portfolio | studio | kmm | islakeys | bizbuddy
 * data-api: origin of the AI backend (default: the script's own origin)
 * data-position: right (default) | left — use left when the page already has UI in the bottom-right corner.
 * Everything renders inside a shadow root, so host-page CSS can't leak in or out.
 */
(function () {
  'use strict';
  if (window.__kapitan) return;
  window.__kapitan = true;

  var script = document.currentScript || document.querySelector('script[src*="kapitan.js"], script[src*="ralph-ai.js"]');
  // Widget files (kb.json) live next to this script; the AI backend can live elsewhere
  // (data-api), so the widget can be served from GitHub Pages while the AI runs on Netlify.
  var ASSETS = new URL(script.src, location.href).href.replace(/\/[^\/]*$/, '');
  var API = (script.getAttribute('data-api') || new URL(script.src, location.href).origin).replace(/\/$/, '');
  var SITE = (script.getAttribute('data-site') || 'portfolio').toLowerCase();
  var STORE_KEY = 'kapitan-chat:' + SITE;
  var MAX_HISTORY = 12;
  var reduceMotion = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  var KB = null;               // loaded from /widget/kb.json (also powers offline answers)
  var history = load();        // [{role, content}]
  var busy = false;
  var offline = API === 'none'; // data-api="none" → free mode: answer from kb.json only, no AI server

  function load() {
    try { return JSON.parse(sessionStorage.getItem(STORE_KEY)) || []; } catch (e) { return []; }
  }
  function save() {
    try { sessionStorage.setItem(STORE_KEY, JSON.stringify(history.slice(-30))); } catch (e) { /* private mode */ }
  }

  // ---------- icons ----------
  function svg(p) { return '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + p + '</svg>'; }
  var ICON = {
    close: svg('<path d="M18 6 6 18M6 6l12 12"/>'),
    expand: svg('<path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/>'),
    refresh: svg('<path d="M3 12a9 9 0 0 1 15.5-6.3L21 8M21 3v5h-5M21 12a9 9 0 0 1-15.5 6.3L3 16M3 21v-5h5"/>'),
    send: svg('<path d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7z"/>'),
    mic: svg('<rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10a7 7 0 0 0 14 0M12 19v3"/>'),
  };

  // ---------- markup ----------
  var host = document.createElement('div');
  host.id = 'kapitan-root';
  host.style.cssText = 'position:fixed;z-index:2147483000;inset:auto 0 0 auto;';
  if (script.getAttribute('data-position') === 'left') host.className = 'left';
  var root = host.attachShadow({ mode: 'open' });

  root.innerHTML = '<style>' + CSS() + '</style>' +
    '<button class="launcher" part="launcher" aria-label="Open Kapitan chat" aria-expanded="false">' +
      '<span class="orb"><span class="orb-core"></span></span>' +
      '<span class="launch-label">Ask Kapitan</span>' +
    '</button>' +
    '<section class="panel" role="dialog" aria-label="Kapitan chat" aria-hidden="true">' +
      '<header>' +
        '<span class="orb sm"><span class="orb-core"></span></span>' +
        '<div class="title"><strong>Kapitan</strong><span class="status"><i></i><em>Online · knows all these websites</em></span></div>' +
        '<button class="icon expand" title="Expand" aria-label="Expand chat">' + ICON.expand + '</button>' +
        '<button class="icon reset" title="New chat" aria-label="Start a new chat">' + ICON.refresh + '</button>' +
        '<button class="icon close" title="Close" aria-label="Close chat">' + ICON.close + '</button>' +
      '</header>' +
      '<div class="body" aria-live="polite"></div>' +
      '<div class="chips"></div>' +
      '<form class="composer" autocomplete="off">' +
        '<textarea rows="1" maxlength="2000" placeholder="Ask anything about Ralph\'s sites…" aria-label="Message"></textarea>' +
        '<button type="button" class="icon mic" title="Speak" aria-label="Voice input" hidden>' + ICON.mic + '</button>' +
        '<button type="submit" class="send" aria-label="Send">' + ICON.send + '</button>' +
      '</form>' +
      '<footer>Powered by Claude · answers can be imperfect — double-check important details</footer>' +
    '</section>';

  var $ = function (s) { return root.querySelector(s); };
  var launcher = $('.launcher'), panel = $('.panel'), body = $('.body'), chips = $('.chips');
  var form = $('.composer'), input = $('textarea'), sendBtn = $('.send'), micBtn = $('.mic');

  (document.body ? Promise.resolve() : new Promise(function (r) { document.addEventListener('DOMContentLoaded', r); }))
    .then(function () { document.body.appendChild(host); });

  // Restore an earlier conversation right away; greet new visitors once the
  // knowledge file arrives. Never redraw if the visitor has already started
  // chatting — that would wipe an answer that is still streaming in.
  if (history.length) renderHistory();
  var greetIfIdle = function () { if (!history.length && !body.children.length) greet(); };
  fetch(ASSETS + '/kb.json').then(function (r) { return r.json(); }).then(function (kb) {
    KB = kb;
    greetIfIdle();
  }).catch(greetIfIdle);

  // ---------- open / close ----------
  function open() {
    panel.classList.add('open');
    launcher.classList.add('hidden');
    panel.setAttribute('aria-hidden', 'false');
    launcher.setAttribute('aria-expanded', 'true');
    setTimeout(function () { input.focus(); }, 180);
  }
  function close() {
    panel.classList.remove('open', 'expanded');
    launcher.classList.remove('hidden');
    panel.setAttribute('aria-hidden', 'true');
    launcher.setAttribute('aria-expanded', 'false');
    launcher.focus();
  }
  launcher.addEventListener('click', open);
  $('.close').addEventListener('click', close);
  $('.expand').addEventListener('click', function () { panel.classList.toggle('expanded'); });
  $('.reset').addEventListener('click', function () {
    history = []; save(); body.innerHTML = ''; greet(); input.focus();
  });
  root.addEventListener('keydown', function (e) { if (e.key === 'Escape' && panel.classList.contains('open')) close(); });
  // Small "hello" nudge a few seconds after first load in this tab.
  if (!sessionStorage.getItem('kapitan-nudged')) {
    setTimeout(function () {
      if (!panel.classList.contains('open')) launcher.classList.add('nudge');
      try { sessionStorage.setItem('kapitan-nudged', '1'); } catch (e) {}
    }, 4000);
  }

  // ---------- conversation ----------
  function siteInfo() { return (KB && KB.sites[SITE]) || (KB && KB.sites.portfolio) || null; }

  function greet() {
    var s = siteInfo();
    addBubble('assistant', s && s.greeting ? s.greeting : "Hi! I'm Kapitan 👋 Ask me anything about Ralph's websites.", false);
    showChips(s ? s.suggestions : []);
  }

  function renderHistory() {
    body.innerHTML = '';
    history.forEach(function (m) { addBubble(m.role, m.content, false); });
    showChips([]);
  }

  function showChips(list) {
    chips.innerHTML = '';
    (list || []).slice(0, 4).forEach(function (q, i) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'chip';
      b.style.animationDelay = (i * 60) + 'ms';
      b.textContent = q;
      b.addEventListener('click', function () { ask(q); });
      chips.appendChild(b);
    });
  }

  function addBubble(role, text, animate) {
    var row = document.createElement('div');
    row.className = 'msg ' + role + (animate === false ? '' : ' pop');
    var bubble = document.createElement('div');
    bubble.className = 'bubble';
    bubble.innerHTML = role === 'user' ? esc(text).replace(/\n/g, '<br>') : md(text);
    row.appendChild(bubble);
    body.appendChild(row);
    scroll();
    return bubble;
  }

  function scroll() { body.scrollTop = body.scrollHeight; }

  form.addEventListener('submit', function (e) { e.preventDefault(); ask(input.value); });
  input.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); ask(input.value); }
  });
  input.addEventListener('input', function () {
    input.style.height = 'auto';
    input.style.height = Math.min(input.scrollHeight, 120) + 'px';
  });

  function ask(text) {
    text = (text || '').trim();
    if (!text || busy) return;
    busy = true;
    sendBtn.disabled = true;
    input.value = '';
    input.style.height = 'auto';
    showChips([]);
    addBubble('user', text);
    history.push({ role: 'user', content: text });
    save();

    var bubble = addBubble('assistant', '');
    bubble.innerHTML = '<span class="typing"><i></i><i></i><i></i></span>';

    var done = function (answer, followups) {
      history.push({ role: 'assistant', content: answer });
      save();
      busy = false;
      sendBtn.disabled = false;
      showChips(followups || []);
      input.focus();
    };

    if (offline) { var a = offlineAnswer(text); typeOut(bubble, a, function () { done(a, offlineFollowups()); }); return; }

    streamChat(bubble).then(function (answer) {
      done(answer, []);
    }).catch(function (err) {
      // Backend unavailable (no key, out of credit, network): answer from the local knowledge base.
      offline = true;
      $('.status em').textContent = 'Quick-answer mode · knows all of Ralph\'s sites';
      $('.status').classList.add('degraded');
      var a2 = offlineAnswer(text);
      typeOut(bubble, a2, function () { done(a2, offlineFollowups()); });
    });
  }

  function streamChat(bubble) {
    var ctrl = new AbortController();
    var timer = setTimeout(function () { ctrl.abort(); }, 45000);
    return fetch(API + '/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ site: SITE, page: location.pathname + location.hash, messages: history.slice(-MAX_HISTORY) }),
      signal: ctrl.signal,
    }).then(function (res) {
      if (res.status === 429) {
        clearTimeout(timer);
        return res.json().then(function (j) { var m = j.error || 'Too many questions at once — try again in a minute.'; bubble.innerHTML = md(m); return m; });
      }
      if (!res.ok || !res.body) throw new Error('http ' + res.status);
      var reader = res.body.getReader();
      var dec = new TextDecoder();
      var text = '';
      function pump() {
        return reader.read().then(function (r) {
          if (r.done) {
            clearTimeout(timer);
            if (!text.trim()) throw new Error('empty');
            bubble.innerHTML = md(text);
            scroll();
            return text;
          }
          text += dec.decode(r.value, { stream: true }).replace(/\u0001/g, ''); // strip server keep-alives
          if (text.indexOf('\u0000ERROR') !== -1) { clearTimeout(timer); throw new Error('upstream'); }
          bubble.innerHTML = md(text) + '<span class="cursor"></span>';
          scroll();
          return pump();
        });
      }
      return pump();
    });
  }

  function typeOut(bubble, text, cb) {
    if (reduceMotion) { bubble.innerHTML = md(text); scroll(); cb(); return; }
    var i = 0;
    var step = Math.max(2, Math.round(text.length / 90));
    (function tick() {
      i = Math.min(text.length, i + step);
      bubble.innerHTML = md(text.slice(0, i)) + (i < text.length ? '<span class="cursor"></span>' : '');
      scroll();
      if (i < text.length) setTimeout(tick, 16); else cb();
    })();
  }

  // ---------- offline answers (keyword retrieval over kb.json) ----------
  var STOP = 'a an the and or of to in on for with is are was be do does how what who where when which can i you me my your it this that about tell show please he his him she her they site website web page built build made make po ba ang ng sa mga ko mo'.split(' ');
  function tokens(s) {
    return (s.toLowerCase().match(/[a-z0-9₱]+/g) || []).filter(function (w) { return w.length > 1 && STOP.indexOf(w) === -1; });
  }
  // Rare words ("Boracay") matter more than common ones ("price") — classic IDF weighting.
  var IDF = null;
  function idf() {
    if (IDF || !KB) return IDF;
    var df = {};
    KB.chunks.forEach(function (c) {
      var seen = {};
      tokens(c.text + ' ' + c.siteName).forEach(function (t) { if (!seen[t]) { seen[t] = 1; df[t] = (df[t] || 0) + 1; } });
    });
    IDF = {};
    Object.keys(df).forEach(function (t) { IDF[t] = Math.log((KB.chunks.length + 1) / df[t]); });
    return IDF;
  }
  function offlineAnswer(q) {
    if (!KB) return "I'm having trouble connecting right now. Please try again in a moment, or use the [contact form](https://garciaralphlawrence-svg.github.io/Ralph-Portfolio/#contact).";
    if (/^(hi|hello|hey|kumusta|good (morning|afternoon|evening))\b/i.test(q.trim())) {
      return (siteInfo() && siteInfo().greeting) || "Hi! Ask me about any of these websites.";
    }
    var weights = idf();
    var qt = tokens(q);
    var scored = KB.chunks.map(function (c) {
      var ct = (c.text + ' ' + c.siteName).toLowerCase();
      var score = 0;
      qt.forEach(function (w) {
        var wt = weights[w] || 2.5;
        if (ct.indexOf(w) !== -1) score += wt;
        else if (w.length > 4 && ct.indexOf(w.slice(0, -1)) !== -1) score += wt * 0.6; // packages → package
      });
      if (c.site === SITE) score *= 1.25;          // prefer the site the visitor is on
      if (qt.some(function (w) { return w.length > 2 && c.siteName.toLowerCase().indexOf(w) !== -1; })) score += 3; // question names this site
      return { c: c, score: score };
    }).filter(function (x) { return x.score >= 2; }).sort(function (a, b) { return b.score - a.score; });
    // Keep answers tight: the best match plus anything nearly as relevant.
    var best = scored.length ? scored[0].score : 0;
    scored = scored.filter(function (x) { return x.score >= best * 0.6; }).slice(0, 3);

    if (!scored.length) {
      var s = siteInfo();
      return "I don't have that detail handy. You can ask me about KMM Travel, IslaKeys, Biz Buddy, AI Analytics Studio, the AI Resibo Maker or Future Minds Academy — or send a message through the portfolio's [contact form](https://garciaralphlawrence-svg.github.io/Ralph-Portfolio/#contact)." +
        (s ? '\n\nTry: ' + s.suggestions.slice(0, 2).map(function (x) { return '“' + x + '”'; }).join(' or ') : '');
    }
    var lines = scored.map(function (x) { return '- ' + (x.c.site !== SITE ? '**' + x.c.siteName + ':** ' : '') + x.c.text; });
    return "Here's what I found:\n\n" + lines.join('\n');
  }
  function offlineFollowups() { var s = siteInfo(); return s ? s.suggestions.slice(0, 3) : []; }

  // ---------- voice input ----------
  var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (SR) {
    micBtn.hidden = false;
    var rec = null;
    micBtn.addEventListener('click', function () {
      if (rec) { rec.stop(); return; }
      rec = new SR();
      rec.lang = navigator.language || 'en-US';
      rec.interimResults = true;
      micBtn.classList.add('listening');
      rec.onresult = function (e) {
        var t = '';
        for (var i = 0; i < e.results.length; i++) t += e.results[i][0].transcript;
        input.value = t;
        if (e.results[e.results.length - 1].isFinal) { rec.stop(); ask(t); }
      };
      rec.onend = rec.onerror = function () { micBtn.classList.remove('listening'); rec = null; };
      rec.start();
    });
  }

  // ---------- tiny safe markdown ----------
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; });
  }
  function inline(s) {
    return s
      .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, function (_, label, url) {
        var internal = url.indexOf(location.origin) === 0;
        return '<a class="link" href="' + url + '"' + (internal ? '' : ' target="_blank" rel="noopener"') + '>' + label + ' <span aria-hidden="true">↗</span></a>';
      })
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>')
      .replace(/`([^`]+)`/g, '<code>$1</code>');
  }
  function md(text) {
    var lines = esc(text).split('\n');
    var out = [], list = null;
    lines.forEach(function (line) {
      var m = line.match(/^\s*(?:[-*•]|\d+\.)\s+(.*)$/);
      if (m) {
        if (!list) { list = []; }
        list.push('<li>' + inline(m[1]) + '</li>');
        return;
      }
      if (list) { out.push('<ul>' + list.join('') + '</ul>'); list = null; }
      var h = line.match(/^#{1,4}\s+(.*)$/);
      if (h) out.push('<p class="h">' + inline(h[1]) + '</p>');
      else if (line.trim()) out.push('<p>' + inline(line) + '</p>');
    });
    if (list) out.push('<ul>' + list.join('') + '</ul>');
    return out.join('');
  }

  // ---------- assets ----------
  function CSS() {
    return [
      ':host{all:initial}',
      '*{box-sizing:border-box;font-family:Inter,ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}',
      // launcher
      '.launcher{position:fixed;right:22px;bottom:22px;display:flex;align-items:center;gap:10px;padding:8px 18px 8px 8px;border:1px solid rgba(255,255,255,.18);border-radius:999px;cursor:pointer;color:#fff;background:rgba(15,18,36,.82);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);box-shadow:0 12px 40px rgba(76,61,255,.35),0 2px 8px rgba(0,0,0,.25);font-size:14px;font-weight:600;letter-spacing:.2px;transition:transform .25s cubic-bezier(.2,.9,.3,1.3),opacity .2s}',
      '.launcher:hover{transform:translateY(-3px) scale(1.03)}',
      '.launcher:focus-visible,.icon:focus-visible,.send:focus-visible,.chip:focus-visible{outline:2px solid #8b7bff;outline-offset:2px}',
      '.launcher.hidden{opacity:0;pointer-events:none;transform:scale(.8)}',
      '.launcher.nudge{animation:nudge 1.2s ease 2}',
      '@keyframes nudge{0%,100%{transform:none}30%{transform:translateY(-6px)}60%{transform:translateY(-2px)}}',
      // orb
      '.orb{position:relative;width:38px;height:38px;border-radius:50%;background:conic-gradient(from 0deg,#6d5dfc,#22d3ee,#a855f7,#f472b6,#6d5dfc);animation:spin 6s linear infinite;box-shadow:0 0 22px rgba(109,93,252,.7);flex:none}',
      '.orb.sm{width:34px;height:34px}',
      '.orb::after{content:"";position:absolute;inset:-6px;border-radius:50%;border:2px solid rgba(109,93,252,.45);animation:pulse 2.4s ease-out infinite}',
      '.orb-core{position:absolute;inset:5px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#fff 0,#c7d2fe 18%,#1e1b4b 70%)}',
      '@keyframes spin{to{transform:rotate(360deg)}}',
      '@keyframes pulse{0%{transform:scale(.9);opacity:.9}100%{transform:scale(1.35);opacity:0}}',
      // panel
      '.panel{position:fixed;right:22px;bottom:22px;width:400px;height:min(640px,calc(100vh - 44px));display:flex;flex-direction:column;border-radius:22px;overflow:hidden;color:#e8e9f5;background:linear-gradient(160deg,rgba(23,25,48,.94),rgba(12,13,28,.96));backdrop-filter:blur(22px);-webkit-backdrop-filter:blur(22px);border:1px solid rgba(255,255,255,.12);box-shadow:0 30px 80px rgba(10,8,40,.55),0 0 0 1px rgba(109,93,252,.15),inset 0 1px 0 rgba(255,255,255,.08);opacity:0;transform:translateY(16px) scale(.96);transform-origin:bottom right;pointer-events:none;transition:opacity .22s ease,transform .28s cubic-bezier(.2,.9,.3,1.15),width .3s,height .3s}',
      '.panel.open{opacity:1;transform:none;pointer-events:auto}',
      '.panel.expanded{width:min(760px,calc(100vw - 44px));height:calc(100vh - 44px)}',
      '.panel::before{content:"";position:absolute;inset:-40% -20% auto auto;width:320px;height:320px;background:radial-gradient(circle,rgba(109,93,252,.28),transparent 65%);pointer-events:none}',
      'header{position:relative;display:flex;align-items:center;gap:10px;padding:14px 12px 14px 16px;border-bottom:1px solid rgba(255,255,255,.08)}',
      '.title{flex:1;display:flex;flex-direction:column;line-height:1.25}',
      '.title strong{font-size:15px;color:#fff}',
      '.status{display:flex;align-items:center;gap:6px;font-size:11.5px;color:#a5a8c9}',
      '.status em{font-style:normal}',
      '.status i{width:7px;height:7px;border-radius:50%;background:#34d399;box-shadow:0 0 8px #34d399}',
      '.status.degraded i{background:#fbbf24;box-shadow:0 0 8px #fbbf24}',
      '.icon{display:grid;place-items:center;width:34px;height:34px;border:0;border-radius:10px;background:transparent;color:#c4c6e6;cursor:pointer;transition:background .15s,color .15s}',
      '.icon:hover{background:rgba(255,255,255,.08);color:#fff}',
      // messages
      '.body{position:relative;flex:1;overflow-y:auto;padding:18px 16px 6px;scroll-behavior:smooth}',
      '.body::-webkit-scrollbar{width:6px}.body::-webkit-scrollbar-thumb{background:rgba(255,255,255,.12);border-radius:3px}',
      '.msg{display:flex;margin:0 0 12px}',
      '.msg.user{justify-content:flex-end}',
      '.msg.pop{animation:pop .3s cubic-bezier(.2,.9,.3,1.2)}',
      '@keyframes pop{from{opacity:0;transform:translateY(8px) scale(.97)}to{opacity:1;transform:none}}',
      '.bubble{max-width:86%;padding:11px 14px;border-radius:16px;font-size:14px;line-height:1.55;word-wrap:break-word}',
      '.assistant .bubble{background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.08);border-top-left-radius:6px}',
      '.user .bubble{background:linear-gradient(135deg,#6d5dfc,#8b5cf6);color:#fff;border-top-right-radius:6px;box-shadow:0 6px 18px rgba(109,93,252,.35)}',
      '.bubble p{margin:0 0 8px}.bubble p:last-child{margin:0}',
      '.bubble p.h{font-weight:700;color:#fff}',
      '.bubble ul{margin:4px 0 8px;padding-left:18px}.bubble li{margin:3px 0}',
      '.bubble strong{color:#fff}',
      '.bubble code{background:rgba(255,255,255,.1);padding:1px 5px;border-radius:5px;font-size:12.5px}',
      '.bubble a.link{display:inline-flex;align-items:center;gap:3px;margin:2px 0;padding:3px 10px;border-radius:999px;color:#c7d2fe;background:rgba(109,93,252,.18);border:1px solid rgba(139,123,255,.35);text-decoration:none;font-weight:600;font-size:13px;transition:background .15s}',
      '.bubble a.link:hover{background:rgba(109,93,252,.35);color:#fff}',
      '.cursor{display:inline-block;width:7px;height:15px;margin-left:2px;vertical-align:-2px;border-radius:2px;background:#8b7bff;animation:blink 1s steps(2) infinite}',
      '@keyframes blink{50%{opacity:0}}',
      '.typing{display:inline-flex;gap:4px;padding:4px 2px}',
      '.typing i{width:7px;height:7px;border-radius:50%;background:#a5b4fc;animation:dot 1.2s infinite ease-in-out}',
      '.typing i:nth-child(2){animation-delay:.15s}.typing i:nth-child(3){animation-delay:.3s}',
      '@keyframes dot{0%,80%,100%{transform:translateY(0);opacity:.4}40%{transform:translateY(-5px);opacity:1}}',
      // chips
      '.chips{display:flex;flex-wrap:wrap;gap:6px;padding:4px 16px 8px}',
      '.chips:empty{display:none}',
      '.chip{padding:7px 12px;border-radius:999px;border:1px solid rgba(139,123,255,.35);background:rgba(109,93,252,.12);color:#dcdcff;font-size:12.5px;cursor:pointer;animation:pop .35s both;transition:background .15s,transform .15s}',
      '.chip:hover{background:rgba(109,93,252,.3);transform:translateY(-1px)}',
      // composer
      '.composer{display:flex;align-items:flex-end;gap:6px;margin:6px 12px 6px;padding:6px 6px 6px 14px;border-radius:16px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);transition:border-color .15s,box-shadow .15s}',
      '.composer:focus-within{border-color:rgba(139,123,255,.6);box-shadow:0 0 0 4px rgba(109,93,252,.15)}',
      'textarea{flex:1;resize:none;border:0;outline:0;background:transparent;color:#fff;font-size:14px;line-height:1.45;padding:8px 0;max-height:120px}',
      'textarea::placeholder{color:#8b8eb3}',
      '.send{display:grid;place-items:center;width:38px;height:38px;border:0;border-radius:12px;cursor:pointer;color:#fff;background:linear-gradient(135deg,#6d5dfc,#22d3ee);box-shadow:0 6px 16px rgba(109,93,252,.4);transition:transform .15s,opacity .15s}',
      '.send:hover{transform:scale(1.06)}.send:disabled{opacity:.5;cursor:default;transform:none}',
      '.mic.listening{color:#f472b6;background:rgba(244,114,182,.15);animation:pulseMic 1s infinite}',
      '@keyframes pulseMic{50%{box-shadow:0 0 0 6px rgba(244,114,182,.15)}}',
      'footer{padding:2px 16px 12px;font-size:10.5px;color:#7c7fa6;text-align:center}',
      // mobile: full-screen sheet
      ':host(.left) .launcher{right:auto;left:22px}',
      ':host(.left) .panel{right:auto;left:22px;transform-origin:bottom left}',
      '@media (max-width:520px){:host(.left) .launcher{left:14px}:host(.left) .panel{left:0}.launcher{right:14px;bottom:14px}.launch-label{display:none}.launcher{padding:8px}.panel,.panel.expanded{right:0;bottom:0;width:100vw;height:100dvh;border-radius:0}.expand{display:none}}',
      '@media (prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}}',
    ].join('');
  }
})();
