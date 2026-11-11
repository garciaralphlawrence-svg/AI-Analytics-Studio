// Free, offline analyst. It answers questions and finds insights by running
// real queries on every row in the browser. No API key and no server needed.
// It reads the question for column names, category values, "highest/lowest",
// "average/total/how many" and time words, then builds a query, a chart and
// a plain-English answer from the result.
import { runQuery } from './query.mjs';

const q = (o) => ({ measure: null, agg: 'count', groupBy: null, timeGrain: 'none', filters: [], sort: 'desc', limit: 0, ...o });
// "Revenue (PHP)" / "price_php" read as "Revenue" / "price" in sentences.
const nice = (s) => String(s).replace(/\s*\([^)]*\)\s*/g, ' ').trim().replace(/_(php|usd|amt)$/i, '').replace(/_/g, ' ');
const Nice = (s) => nice(s).replace(/\b\w/g, (c) => c.toUpperCase());
// Columns that are a level (price, rating, rate...) read better as an average than a total.
const LEVEL_RE = /(price|rate|rating|score|grade|per_|avg|average|percent|pct|age|days|nights|duration|satisfaction|margin|sqm|area|bedrooms)/i;
const PRIORITY = ['revenue', 'sales', 'net', 'total', 'amount', 'gross', 'income', 'profit', 'tuition', 'value', 'price', 'cost'];

// ---------- formatting ----------
function fmt(v, col) {
  if (v === null || v === undefined || Number.isNaN(v)) return '—';
  const abs = Math.abs(v);
  let s;
  if (abs >= 1e9) s = (v / 1e9).toFixed(2).replace(/\.?0+$/, '') + 'B';
  else if (abs >= 1e6) s = (v / 1e6).toFixed(2).replace(/\.?0+$/, '') + 'M';
  else if (abs >= 1e4) s = (v / 1e3).toFixed(1).replace(/\.0$/, '') + 'K';
  else s = v.toLocaleString('en-US', { maximumFractionDigits: abs < 10 ? 2 : abs < 1000 ? 1 : 0 });
  return (col && col.money ? '₱' : '') + s;
}
const pct = (x) => `${(x * 100).toFixed(Math.abs(x) < 0.1 ? 1 : 0)}%`;
function label(l) {
  const m = String(l).match(/^(\d{4})-(\d{2})$/);
  if (m) return new Date(+m[1], +m[2] - 1, 1).toLocaleString('en-US', { month: 'short', year: 'numeric' });
  const d = String(l).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (d) return new Date(+d[1], +d[2] - 1, +d[3]).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  return String(l);
}

// ---------- column helpers ----------
function kinds(ds) {
  const nums = ds.columns.filter((c) => c.type === 'number');
  const cats = ds.columns.filter((c) => c.type === 'category' && c.distinct >= 2 && c.distinct <= 60);
  const date = ds.columns.find((c) => c.type === 'date' && c.distinctDays > 1) || null;
  const rank = (c) => { const i = PRIORITY.findIndex((w) => c.name.toLowerCase().includes(w)); return i === -1 ? 99 : i; };
  const primary = nums.slice().sort((a, b) => rank(a) - rank(b) || Math.abs(b.sum) - Math.abs(a.sum))[0] || null;
  const secondary = nums.find((c) => c !== primary && LEVEL_RE.test(c.name)) || nums.find((c) => c !== primary) || null;
  return { nums, cats, date, primary, secondary };
}
function grainFor(date) {
  const days = (new Date(date.max) - new Date(date.min)) / 864e5;
  return days <= 45 ? 'day' : days <= 200 ? 'week' : days <= 1100 ? 'month' : 'quarter';
}
const defaultAgg = (col) => (col && LEVEL_RE.test(col.name) ? 'avg' : 'sum');
const aggWord = (agg) => ({ sum: 'total', avg: 'average', count: 'number of records', min: 'lowest', max: 'highest' }[agg] || agg);
function measureText(m, agg) {
  if (!m) return 'number of records';
  if (agg === 'avg' && /^(average|avg|mean)[_ ]/i.test(m.name)) return nice(m.name).toLowerCase();
  return `${aggWord(agg)} ${nice(m.name)}`;
}
// Words that mean "count the rows" ("most bookings", "how many students").
const ROW_NOUNS = new Set(['booking', 'order', 'student', 'listing', 'customer', 'transaction', 'record', 'row', 'entry', 'visit', 'patient', 'employee', 'client', 'trip', 'ticket', 'enrollment', 'enrolment', 'people', 'person', 'item', 'guest', 'member', 'case', 'admission', 'reservation', 'deal', 'lead', 'inquiry', 'property', 'staff', 'traveler', 'user', 'purchase', 'appointment']);
// Item-level attributes (a cheesecake costs more than a cookie) are not findings.
const GAP_RE = /(rating|score|grade|satisfaction|attendance|rate|days|duration|margin|inquir|wait|delay|return|churn|complain|defect)/i;

// ---------- question understanding ----------
const stem = (w) => w.toLowerCase().replace(/(ies)$/, 'y').replace(/(ses|xes)$/, (x) => x.slice(0, -2)).replace(/s$/, '');
const words = (s) => String(s).toLowerCase().split(/[^a-z0-9ñ]+/).filter(Boolean).map(stem);
const IGNORE = new Set(['php', 'usd', 'amt', 'the', 'of', 'per', 'rate']);

function colScore(col, qWords) {
  const toks = words(col.name).filter((t) => !IGNORE.has(t));
  if (!toks.length) return 0;
  const hit = toks.filter((t) => qWords.has(t)).length;
  return hit / toks.length + (hit ? 0.01 * hit : 0);
}
function bestCol(cols, qWords, min = 0.5) {
  let best = null, score = min;
  for (const c of cols) { const s = colScore(c, qWords); if (s >= score) { best = c; score = s + 1e-9; } }
  return best;
}
// Category values written in the question ("in Makati", "for Boracay") become filters.
function findFilters(ds, question, cats) {
  const text = ` ${question.toLowerCase()} `;
  const qWords = new Set(words(question));
  const colWords = new Set(ds.columns.flatMap((c) => words(c.name)));
  const out = [];
  for (const c of cats) {
    const vals = [...new Set(ds.rows.map((r) => r[c.name]).filter((v) => v !== null))];
    let hit = vals.filter((v) => String(v).length > 1 && new RegExp(`[^a-z0-9]${escapeRe(String(v).toLowerCase())}[^a-z0-9]`).test(text))
      .sort((a, b) => String(b).length - String(a).length)[0];
    if (hit === undefined) {
      // "Boracay" for "Boracay Getaway": one distinctive word, only if it points to a single value.
      const partial = vals.filter((v) => words(v).some((t) => t.length >= 4 && qWords.has(t) && !colWords.has(t)));
      if (partial.length === 1) hit = partial[0];
    }
    if (hit !== undefined) out.push({ column: c.name, op: 'eq', value: String(hit) });
  }
  return out;
}
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function parse(ds, question) {
  const k = kinds(ds);
  const text = question.toLowerCase();
  const qWords = new Set(words(question));
  const filters = findFilters(ds, question, k.cats);
  const filtered = new Set(filters.map((f) => f.column));

  let groupBy = bestCol(k.cats.filter((c) => !filtered.has(c.name)), qWords);
  // Words used up by the group column ("grade" in "grade level") don't also pick the measure.
  const measureWords = new Set([...qWords].filter((w) => !(groupBy && words(groupBy.name).includes(w)) || k.nums.some((c) => words(c.name).length === 1 && words(c.name)[0] === w)));
  const measure = bestCol(k.nums, measureWords);
  const wantsTime = !!(k.date && !groupBy && /\b(day|daily|week|weekly|month|monthly|quarter|quarterly|year|yearly|annual|trend|over time|season|seasonal|when)\b/.test(text));
  let grain = 'none';
  if (wantsTime) {
    grain = /\b(day|daily)\b/.test(text) ? 'day' : /\bweek/.test(text) ? 'week' : /\bquarter/.test(text) ? 'quarter'
      : /\b(year|yearly|annual)\b/.test(text) && !/\b(this|last|per) year\b/.test(text) ? 'year' : /\bmonth/.test(text) ? 'month' : grainFor(k.date);
  }

  // "most bookings", "how many students": count rows rather than add up a number.
  const rowNoun = [...text.matchAll(/\b(?:how many|number of|count of|most|fewest|least|more|fewer)\s+(\w+)/g)].some((x) => ROW_NOUNS.has(stem(x[1])));
  // "How many students have a scholarship?" on a Yes/No column means: filter to Yes.
  if (groupBy && /\b(how many|number of|count|what share|what percent|percentage)\b/.test(text) && !/\b(by|each|per|across|which)\b/.test(text)) {
    const vals = [...new Set(ds.rows.map((r) => r[groupBy.name]).filter((v) => v !== null).map((v) => String(v).toLowerCase()))];
    const yes = ds.rows.map((r) => r[groupBy.name]).find((v) => /^(yes|y|true|1)$/i.test(String(v)));
    if (vals.length === 2 && yes !== undefined) { filters.push({ column: groupBy.name, op: 'eq', value: String(yes) }); groupBy = null; }
  }

  let agg = null;
  if (/\b(average|avg|mean|typical)\b/.test(text)) agg = 'avg';
  else if ((/\b(how many|number of|count|volume of)\b/.test(text) && !measure) || (rowNoun && !measure)) agg = 'count';
  else if (/\b(total|sum|overall|combined)\b/.test(text)) agg = 'sum';
  else if (/\b(most expensive|maximum|max|largest|biggest single)\b/.test(text) && !groupBy && !wantsTime) agg = 'max';
  else if (/\b(cheapest|minimum|min|smallest single)\b/.test(text) && !groupBy && !wantsTime) agg = 'min';

  let m = measure;
  if (agg === 'count') m = null;
  else if (!m && !/\b(how many|count|number of)\b/.test(text)) m = k.primary;
  // An "average" of a column that is already an average is just that column.
  if (agg === 'avg' && m === null) m = k.secondary || k.primary;
  if (!agg) agg = m ? defaultAgg(m) : 'count';

  const dir = /\b(lowest|worst|least|bottom|smallest|fewest|weakest|slowest|cheapest|underperform\w*)\b/.test(text) ? 'asc' : 'desc';
  const ranking = /\b(which|what|who|highest|lowest|best|worst|top|most|least|rank|leading|biggest|strongest|weakest)\b/.test(text);
  const compare = /\b(compare|comparison|versus|vs|breakdown|break down|split|by|across|each|per)\b/.test(text);
  // "Which branch…" where the category was named but the question also names no time → rank it.
  if (!groupBy && !wantsTime && (ranking || compare) && k.cats.length && /\b(which|compare|breakdown|rank|by|across|each)\b/.test(text)) {
    groupBy = bestCol(k.cats.filter((c) => !filtered.has(c.name)), qWords, 0.3) || null;
  }
  return { k, text, measure: m, agg, groupBy, wantsTime, grain, filters, dir, ranking, compare };
}

// ---------- answers ----------
export function localAnswer(ds, question) {
  const p = parse(ds, question);
  const { k, text } = p;
  if (/\b(surpris|insight|finding|interesting|notable|summar|overview|key point|tell me about|highlights?|story)\w*/.test(text)) return insightsAnswer(ds);
  if (/\b(missing|blank|empty|null|data quality|clean|dirty|errors?)\b/.test(text)) return qualityAnswer(ds);
  if (/\b(correlat|relationship|related|affect|impact|influence|driver|drive|depend)\w*/.test(text)) return correlationAnswer(ds, p, question);
  if (/\b(forecast|predict|projection|project|next month|next quarter|next year|expect)\w*/.test(text) && k.date) return forecastAnswer(ds, p);
  if (p.wantsTime) return timeAnswer(ds, p);
  if (p.groupBy) return groupAnswer(ds, p);
  return singleAnswer(ds, p);
}

function filterText(filters) {
  return filters.length ? ` for ${filters.map((f) => `${nice(f.column)} = **${f.value}**`).join(' and ')}` : '';
}

function groupAnswer(ds, p) {
  const { measure: m, agg, groupBy: g, filters, dir } = p;
  const spec = q({ measure: m?.name ?? null, agg, groupBy: g.name, filters, sort: 'desc', limit: 0 });
  const res = runQuery(ds.rows, ds.columns, spec);
  const pairs = res.labels.map((l, i) => [l, res.values[i]]).filter((x) => x[1] !== null);
  if (!pairs.length) return { answer: `I couldn't find any rows${filterText(filters)}.`, followups: followups(ds, p) };
  const ordered = dir === 'asc' ? pairs.slice().reverse() : pairs;
  const [topL, topV] = ordered[0];
  const additive = agg === 'sum' || agg === 'count';
  const total = additive ? pairs.reduce((a, x) => a + x[1], 0) : null;
  const what = measureText(m, agg);
  const share = additive && total ? ` (${pct(topV / total)} of the total)` : '';
  let answer;
  if (p.compare && !p.ranking) {
    answer = `Here is the ${what} by ${nice(g.name)}${filterText(filters)}, from highest to lowest:\n` +
      pairs.slice(0, 8).map(([l, v]) => `- **${l}**: ${fmt(v, m)}${additive && total ? ` · ${pct(v / total)}` : ''}`).join('\n');
    const gap = pairs[0][1] && pairs[pairs.length - 1][1] ? pairs[0][1] / pairs[pairs.length - 1][1] : null;
    if (gap && pairs.length > 1) answer += `\n\nThe top, **${pairs[0][0]}**, is ${gap >= 2 ? `${gap.toFixed(1)}× ` : `${pct(gap - 1)} higher than `}the bottom, **${pairs[pairs.length - 1][0]}**.`;
  } else {
    answer = `**${topL}** has the ${dir === 'asc' ? 'lowest' : 'highest'} ${what}${filterText(filters)}: **${fmt(topV, m)}**${share}.`;
    if (ordered.length > 1) answer += ` Next ${ordered.length > 2 ? 'are' : 'is'} ${ordered.slice(1, 3).map(([l, v]) => `${l} (${fmt(v, m)})`).join(' and ')}.`;
    if (ordered.length > 3) { const [lastL, lastV] = ordered[ordered.length - 1]; answer += ` ${dir === 'asc' ? 'The highest' : 'The lowest'} is ${lastL} at ${fmt(lastV, m)}.`; }
  }
  // Add the other angle: if we ranked by total, mention the average too (and vice versa).
  if (m && agg === 'sum') {
    const avg = runQuery(ds.rows, ds.columns, q({ measure: m.name, agg: 'avg', groupBy: g.name, filters }));
    if (avg.labels.length > 1 && avg.labels[0] !== topL && dir === 'desc') answer += `\n\nPer record, though, **${avg.labels[0]}** has the highest average (${fmt(avg.values[0], m)}).`;
  }
  const chart = { type: pairs.length > 8 ? 'hbar' : 'bar', title: `${Nice(what)} by ${Nice(g.name)}`, subtitle: filters.length ? filters.map((f) => f.value).join(', ') : 'All rows', query: q({ ...spec, sort: dir === 'asc' ? 'asc' : 'desc', limit: 12 }) };
  return { answer, chart, followups: followups(ds, p), rowsMatched: res.rowsMatched };
}

function timeAnswer(ds, p) {
  const { measure: m, agg, filters, grain, k } = p;
  const spec = q({ measure: m?.name ?? null, agg, groupBy: k.date.name, timeGrain: grain, filters });
  const res = runQuery(ds.rows, ds.columns, spec);
  const tr = trimPartial(ds, k.date.name, grain === 'none' ? 'month' : grain, filters, res.labels, res.values);
  const pts = tr.labels.map((l, i) => [l, tr.values[i]]).filter((x) => x[1] !== null);
  if (pts.length < 2) return { answer: `There isn't enough dated data${filterText(filters)} to show a trend.`, followups: followups(ds, p) };
  const sorted = pts.slice().sort((a, b) => b[1] - a[1]);
  const [bestL, bestV] = sorted[0];
  const [worstL, worstV] = sorted[sorted.length - 1];
  const what = measureText(m, agg);
  const unit = grain === 'none' ? 'month' : grain;
  const best = p.dir === 'asc' ? [worstL, worstV] : [bestL, bestV];
  let answer = `The ${p.dir === 'asc' ? 'weakest' : 'best'} ${unit} for ${what}${filterText(filters)} was **${label(best[0])}** at **${fmt(best[1], m)}**.`;
  answer += ` The ${p.dir === 'asc' ? 'strongest' : 'weakest'} was ${label(p.dir === 'asc' ? bestL : worstL)} (${fmt(p.dir === 'asc' ? bestV : worstV, m)}).`;
  const t = trend(pts.map((x) => x[1]));
  if (t !== null) answer += `\n\nOverall the trend is **${Math.abs(t) < 0.03 ? 'flat' : t > 0 ? 'rising' : 'falling'}**${Math.abs(t) < 0.03 ? '' : ` (${t > 0 ? '+' : ''}${pct(t)} from the first ${pts.length > 5 ? 'quarter' : 'half'} of the period to the last)`}.`;
  if (tr.trimmed) answer += ` A ${unit} with only a few days of data was left out of this comparison.`;
  const chart = { type: agg === 'avg' ? 'line' : 'area', title: `${Nice(what)} over time`, subtitle: `By ${unit}`, query: spec };
  return { answer, chart, followups: followups(ds, p), rowsMatched: res.rowsMatched };
}

// Drops a first/last period that holds far fewer records than usual (e.g. a
// month with one day of data), so it can't pose as a peak or a slump.
function trimPartial(ds, dateName, grain, filters, labels, values) {
  const cnt = runQuery(ds.rows, ds.columns, q({ groupBy: dateName, timeGrain: grain, filters }));
  const byLabel = new Map(cnt.labels.map((l, i) => [l, cnt.values[i]]));
  const counts = labels.map((l) => byLabel.get(l) || 0);
  const med = counts.slice().sort((a, b) => a - b)[Math.floor(counts.length / 2)] || 0;
  let lo = 0, hi = labels.length;
  if (labels.length > 4 && counts[hi - 1] < med * 0.4) hi--;
  if (labels.length > 4 && counts[0] < med * 0.4) lo++;
  return { labels: labels.slice(lo, hi), values: values.slice(lo, hi), trimmed: lo + (labels.length - hi) };
}

// Compares the average of the first and last chunk of a series.
function trend(vals) {
  if (vals.length < 4) return null;
  const n = Math.max(1, Math.floor(vals.length / (vals.length > 5 ? 4 : 2)));
  const a = vals.slice(0, n).reduce((s, x) => s + x, 0) / n;
  const b = vals.slice(-n).reduce((s, x) => s + x, 0) / n;
  return a ? (b - a) / Math.abs(a) : null;
}

function singleAnswer(ds, p) {
  const { measure: m, agg, filters } = p;
  const res = runQuery(ds.rows, ds.columns, q({ measure: m?.name ?? null, agg, filters }));
  const what = measureText(m, agg);
  let answer = `The ${what}${filterText(filters)} is **${fmt(res.total, m)}**, across ${res.rowsMatched.toLocaleString()} ${res.rowsMatched === 1 ? 'row' : 'rows'}.`;
  if (m && agg !== 'avg') {
    const avg = runQuery(ds.rows, ds.columns, q({ measure: m.name, agg: 'avg', filters }));
    answer += ` That is ${fmt(avg.total, m)} per record on average.`;
  }
  if (filters.length) {
    const all = runQuery(ds.rows, ds.columns, q({ measure: m?.name ?? null, agg }));
    if ((agg === 'sum' || agg === 'count') && all.total) answer += ` This is ${pct(res.total / all.total)} of the whole dataset (${fmt(all.total, m)}).`;
    else if (all.total) answer += ` Across all rows it is ${fmt(all.total, m)}.`;
  }
  return { answer, followups: followups(ds, p), rowsMatched: res.rowsMatched };
}

function forecastAnswer(ds, p) {
  const { k, filters } = p;
  const m = p.measure || k.primary;
  const agg = m ? (p.agg === 'count' ? 'sum' : p.agg) : 'count';
  const grain = /quarter/.test(p.text) ? 'quarter' : /year/.test(p.text) ? 'year' : 'month';
  const spec = q({ measure: m?.name ?? null, agg, groupBy: k.date.name, timeGrain: grain, filters });
  const res = runQuery(ds.rows, ds.columns, spec);
  const ys = res.values.filter((v) => v !== null);
  if (ys.length < 4) return { answer: `I need at least 4 ${grain}s of data to project the next one.`, followups: followups(ds, p) };
  // Least-squares line through the series.
  const n = ys.length, xm = (n - 1) / 2, ym = ys.reduce((a, b) => a + b, 0) / n;
  let sxy = 0, sxx = 0;
  ys.forEach((y, x) => { sxy += (x - xm) * (y - ym); sxx += (x - xm) ** 2; });
  const slope = sxy / sxx, next = ym + slope * (n - xm);
  const resid = Math.sqrt(ys.reduce((a, y, x) => a + (y - (ym + slope * (x - xm))) ** 2, 0) / Math.max(1, n - 2));
  const what = measureText(m, agg);
  const answer = `Based on the straight-line trend of the last ${n} ${grain}s, the next ${grain}'s ${what}${filterText(filters)} is about **${fmt(Math.max(0, next), m)}** (likely range ${fmt(Math.max(0, next - 1.5 * resid), m)} to ${fmt(next + 1.5 * resid, m)}).` +
    `\n\nThe trend moves by about ${fmt(Math.abs(slope), m)} per ${grain} (${slope >= 0 ? 'up' : 'down'}). This is a simple projection; seasonality and one-off events can change the result.`;
  return { answer, chart: { type: 'line', title: `${Nice(what)} by ${grain}`, subtitle: 'History used for the projection', query: spec }, followups: followups(ds, p), rowsMatched: res.rowsMatched };
}

function pearson(rows, a, b) {
  let n = 0, sa = 0, sb = 0, saa = 0, sbb = 0, sab = 0;
  for (const r of rows) {
    const x = r[a], y = r[b];
    if (typeof x !== 'number' || typeof y !== 'number') continue;
    n++; sa += x; sb += y; saa += x * x; sbb += y * y; sab += x * y;
  }
  if (n < 10) return null;
  const cov = sab - (sa * sb) / n, va = saa - (sa * sa) / n, vb = sbb - (sb * sb) / n;
  return va > 0 && vb > 0 ? cov / Math.sqrt(va * vb) : null;
}
const strength = (r) => (Math.abs(r) >= 0.7 ? 'strong' : Math.abs(r) >= 0.4 ? 'moderate' : Math.abs(r) >= 0.2 ? 'weak' : 'almost no');

function correlationAnswer(ds, p, question) {
  const { k } = p;
  const qWords = new Set(words(question));
  const mentioned = k.nums.filter((c) => colScore(c, qWords) >= 0.5);
  const target = mentioned[0] || k.primary;
  if (!target) return { answer: 'This file has no number columns to relate to each other.', followups: followups(ds, p) };
  const others = (mentioned.length > 1 ? mentioned.slice(1) : k.nums.filter((c) => c !== target))
    .map((c) => ({ c, r: pearson(ds.rows, target.name, c.name) })).filter((x) => x.r !== null)
    .sort((a, b) => Math.abs(b.r) - Math.abs(a.r));
  const lines = others.slice(0, 4).map(({ c, r }) => `- **${Nice(c.name)}**: ${strength(r)} ${r >= 0 ? 'positive' : 'negative'} link (r = ${r.toFixed(2)})`);
  // How much the target's average changes between groups of each category.
  const catEffects = k.cats.map((g) => {
    const res = runQuery(ds.rows, ds.columns, q({ measure: target.name, agg: 'avg', groupBy: g.name }));
    const v = res.values.filter((x) => x !== null);
    return v.length > 1 && Math.min(...v) > 0 ? { g, hi: res.labels[0], lo: res.labels[res.labels.length - 1], ratio: Math.max(...v) / Math.min(...v) } : null;
  }).filter(Boolean).sort((a, b) => b.ratio - a.ratio);
  let answer = `What moves with **${Nice(target.name)}**:\n${lines.join('\n') || '- No other number column has enough data to compare.'}`;
  if (catEffects[0]) {
    const e = catEffects[0];
    answer += `\n\nAmong the categories, **${Nice(e.g.name)}** makes the biggest difference: the average ${nice(target.name)} for ${e.hi} is ${e.ratio.toFixed(1)}× that of ${e.lo}.`;
  }
  answer += '\n\nA link is not proof of cause, but it shows where to look first.';
  const chart = catEffects[0] ? { type: 'bar', title: `Avg ${Nice(target.name)} by ${Nice(catEffects[0].g.name)}`, subtitle: 'Biggest category difference', query: q({ measure: target.name, agg: 'avg', groupBy: catEffects[0].g.name, limit: 12 }) } : undefined;
  return { answer, chart, followups: followups(ds, p) };
}

function qualityAnswer(ds) {
  const n = ds.rows.length;
  const gaps = ds.columns.filter((c) => c.missing > 0).sort((a, b) => b.missing - a.missing);
  const dupes = n - new Set(ds.rows.map((r) => JSON.stringify(r))).size;
  let answer = `The file has **${n.toLocaleString()} rows** and **${ds.columns.length} columns**.`;
  answer += gaps.length
    ? ` ${gaps.length} ${gaps.length === 1 ? 'column has' : 'columns have'} blank cells:\n` + gaps.slice(0, 6).map((c) => `- **${c.name}**: ${c.missing.toLocaleString()} blank (${pct(c.missing / n)})`).join('\n')
    : ' No column has blank cells.';
  answer += `\n\n${dupes ? `**${dupes.toLocaleString()}** rows are exact duplicates of another row.` : 'There are no exact duplicate rows.'} Blank cells are left out of totals and averages, so the numbers on the dashboard are still correct.`;
  return { answer, followups: [] };
}

function insightsAnswer(ds) {
  const list = localInsights(ds).slice(0, 4);
  if (!list.length) return { answer: 'This file is too small or has too few numbers for strong findings.', followups: [] };
  return { answer: `Here ${list.length === 1 ? 'is what stands out' : `are the ${list.length} things that stand out most`}:\n` + list.map((x) => `- **${x.headline}** ${x.detail}`).join('\n'), followups: [] };
}

// ---------- insights for the panel ----------
export function localInsights(ds) {
  const k = kinds(ds);
  const out = [];
  const m = k.primary;
  const agg = m ? defaultAgg(m) : 'count';
  const what = measureText(m, agg);
  const additive = agg !== 'avg';

  // 1. Which group leads, and by how much.
  for (const g of k.cats.filter((c) => c.distinct > 2).sort((a, b) => Math.abs(a.distinct - 6) - Math.abs(b.distinct - 6)).slice(0, 2)) {
    const res = runQuery(ds.rows, ds.columns, q({ measure: m?.name ?? null, agg, groupBy: g.name }));
    if (res.labels.length < 2) continue;
    const total = res.values.reduce((a, b) => a + (b || 0), 0);
    const [top, second] = res.values;
    const lead = second ? top / second - 1 : 0;
    out.push({
      score: additive ? top / total * 2 : lead,
      tone: 'positive',
      headline: `${res.labels[0]} leads on ${nice(g.name)}`,
      detail: additive
        ? `It brings in ${pct(top / total)} of the ${what} (${fmt(top, m)}), ${lead > 0.005 ? `${pct(lead)} ahead of ${res.labels[1]}` : `neck and neck with ${res.labels[1]}`}. ${res.labels[res.labels.length - 1]} is last with ${pct(res.values[res.values.length - 1] / total)}.`
        : `Its ${what} is ${fmt(top, m)}, ${pct(lead)} above ${res.labels[1]}. ${res.labels[res.labels.length - 1]} is lowest at ${fmt(res.values[res.values.length - 1], m)}.`,
    });
  }

  // 2. Trend and peak over time.
  if (k.date) {
    const grain = grainFor(k.date) === 'day' ? 'day' : grainFor(k.date) === 'week' ? 'week' : 'month';
    const res = runQuery(ds.rows, ds.columns, q({ measure: m?.name ?? null, agg, groupBy: k.date.name, timeGrain: grain }));
    const { labels, values: vals } = trimPartial(ds, k.date.name, grain, [], res.labels, res.values);
    const t = trend(vals);
    if (t !== null && Math.abs(t) >= 0.03) {
      out.push({ score: Math.min(1.5, Math.abs(t) * 3), tone: t > 0 ? 'positive' : 'negative',
        headline: `${Nice(what)} is ${t > 0 ? 'growing' : 'falling'}`,
        detail: `The latest ${grain}s are ${t > 0 ? 'up' : 'down'} ${pct(Math.abs(t))} compared with the start of the data (${label(labels[0])} to ${label(labels[labels.length - 1])}).` });
    }
    if (vals.length >= 4) {
      const i = vals.indexOf(Math.max(...vals)), j = vals.indexOf(Math.min(...vals));
      const avgV = vals.reduce((a, b) => a + b, 0) / vals.length;
      out.push({ score: (vals[i] - avgV) / avgV * 2, tone: 'neutral',
        headline: `Peak ${grain}: ${label(labels[i])}`,
        detail: `${Nice(what)} reached ${fmt(vals[i], m)}, ${pct(vals[i] / avgV - 1)} above a typical ${grain}. The quietest was ${label(labels[j])} (${fmt(vals[j], m)}).` });
    }
  }

  // 3. A quality / level metric that differs a lot between groups.
  const level = k.nums.filter((c) => c !== m && GAP_RE.test(c.name));
  for (const s of level.slice(0, 2)) {
    let best = null;
    for (const g of k.cats) {
      const res = runQuery(ds.rows, ds.columns, q({ measure: s.name, agg: 'avg', groupBy: g.name }));
      const v = res.values;
      if (v.length < 2 || !v[v.length - 1]) continue;
      const gap = v[0] / v[v.length - 1] - 1;
      if (!best || gap > best.gap) best = { g, gap, hi: res.labels[0], lo: res.labels[res.labels.length - 1], hv: v[0], lv: v[v.length - 1] };
    }
    if (best && best.gap > 0.04) {
      // Is a higher value good (rating) or bad (readmissions, waiting days)?
      const good = /(rating|score|grade|satisfaction|attendance|margin|inquir)/i.test(s.name);
      const bad = /(readmi|days|duration|wait|delay|return|churn|complain|defect|cancel|no.?show|overtime)/i.test(s.name);
      const watch = good ? best.lo : bad ? best.hi : null;
      out.push({ score: Math.min(1.4, best.gap * 2), tone: watch ? 'negative' : 'neutral',
        headline: `${Nice(s.name)} differs a lot by ${nice(best.g.name)}`,
        detail: `${best.hi} averages ${fmt(best.hv, s)}, versus ${fmt(best.lv, s)} for ${best.lo} (${best.gap >= 1 ? `${(best.gap + 1).toFixed(1)}×` : `${pct(best.gap)} higher`}).${watch ? ` Worth a closer look at ${watch}.` : ''}` });
    }
  }

  // 4. Strongest link between two numbers that aren't simply derived from each other.
  let link = null;
  for (let i = 0; i < k.nums.length; i++) for (let j = i + 1; j < k.nums.length; j++) {
    const a = k.nums[i], b = k.nums[j];
    const r = pearson(ds.rows, a.name, b.name);
    if (r === null || Math.abs(r) > 0.97) continue; // near 1 means one is computed from the other
    if (!link || Math.abs(r) > Math.abs(link.r)) link = { a, b, r };
  }
  if (link && Math.abs(link.r) >= 0.35) {
    out.push({ score: Math.abs(link.r) * 0.6, tone: 'neutral',
      headline: `${Nice(link.a.name)} and ${nice(link.b.name)} move ${link.r > 0 ? 'together' : 'in opposite directions'}`,
      detail: `There is a ${strength(link.r)} ${link.r > 0 ? 'positive' : 'negative'} link (r = ${link.r.toFixed(2)}): when ${nice(link.a.name)} is higher, ${nice(link.b.name)} tends to be ${link.r > 0 ? 'higher' : 'lower'} too.` });
  }

  // 5. Data quality.
  const gaps = ds.columns.filter((c) => c.missing > 0);
  if (gaps.length) {
    const worst = gaps.sort((a, b) => b.missing - a.missing)[0];
    out.push({ score: 0.2, tone: 'neutral', headline: `${gaps.length} ${gaps.length === 1 ? 'column has' : 'columns have'} blank cells`,
      detail: `${worst.name} is missing ${worst.missing.toLocaleString()} values (${pct(worst.missing / ds.rows.length)}). Blanks are skipped in totals and averages.` });
  }
  return out.sort((a, b) => b.score - a.score).slice(0, 5).map(({ tone, headline, detail }) => ({ tone, headline, detail }));
}

/** One-line plain-English summary for the top of the dashboard. */
export function localSummary(ds) {
  const k = kinds(ds);
  const parts = [`${ds.rows.length.toLocaleString()} rows analysed on your device`];
  if (k.date) parts.push(`from ${label(k.date.min)} to ${label(k.date.max)}`);
  let s = parts.join(', ') + '.';
  if (k.primary) {
    const agg = defaultAgg(k.primary);
    const tot = runQuery(ds.rows, ds.columns, q({ measure: k.primary.name, agg }));
    s += ` ${Nice(measureText(k.primary, agg))}: ${fmt(tot.total, k.primary)}.`;
    const g = k.cats.slice().sort((a, b) => Math.abs(a.distinct - 6) - Math.abs(b.distinct - 6))[0];
    if (g) {
      const res = runQuery(ds.rows, ds.columns, q({ measure: k.primary.name, agg, groupBy: g.name, limit: 1 }));
      if (res.labels[0]) s += ` Top ${nice(g.name)}: ${res.labels[0]}.`;
    }
  }
  return s;
}

// ---------- follow-up suggestions ----------
function followups(ds, p) {
  const k = p?.k || kinds(ds);
  const m = (p && p.measure) || k.primary;
  const used = p?.groupBy?.name;
  const out = [];
  const other = k.cats.find((c) => c.name !== used);
  if (m && other) out.push(`Which ${nice(other.name)} has the highest ${nice(m.name)}?`);
  if (m && k.date && !p?.wantsTime) out.push(`What was the best month for ${nice(m.name)}?`);
  if (m && k.date) out.push(`Forecast next month's ${nice(m.name)}`);
  if (m) out.push(`What drives ${nice(m.name)}?`);
  if (used && p?.ranking) out.push(`Compare ${nice(used)} performance`);
  out.push('What are the 3 most surprising findings?');
  return [...new Set(out)].slice(0, 4);
}
