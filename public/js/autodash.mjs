// Instant, rule-based dashboard from the column profile — shown immediately
// while the AI analyst works (and on its own if the AI is unavailable).

const q = (o) => ({ measure: null, agg: 'count', groupBy: null, timeGrain: 'none', filters: [], sort: 'desc', limit: 0, ...o });
const nice = (s) => s.replace(/_(php|usd|amt)$/i, '').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

export function autoDashboard(dataset) {
  const cols = dataset.columns;
  const nums = cols.filter((c) => c.type === 'number');
  const dates = cols.filter((c) => c.type === 'date' && c.distinctDays > 1);
  // Categories worth charting: 2+ values, not one value per row.
  const cats = cols.filter((c) => c.type === 'category' && c.distinct >= 2 && c.distinct <= 60)
    .sort((a, b) => Math.abs(a.distinct - 7) - Math.abs(b.distinct - 7));

  // Headline measure: the most "business-like" numeric column, in priority order.
  const primary = pickPrimary(nums);
  // Second measure: a quality/performance metric reads better than a raw count.
  const QUALITY = /(rating|score|grade|rate|satisfaction|days|duration|margin|nights|area|sqm|inquir)/i;
  const secondary = nums.find((c) => c !== primary && QUALITY.test(c.name)) || nums.find((c) => c !== primary && !c.money) || nums.find((c) => c !== primary) || null;
  const date = dates[0] || null;
  const grain = date ? pickGrain(date) : 'none';

  const kpis = [{ type: 'kpi', title: 'Records', subtitle: '', query: q({}) }];
  if (primary) {
    kpis.push({ type: 'kpi', title: `Total ${nice(primary.name)}`, subtitle: '', query: q({ measure: primary.name, agg: 'sum' }) });
    kpis.push({ type: 'kpi', title: `Avg ${nice(primary.name)}`, subtitle: '', query: q({ measure: primary.name, agg: 'avg' }) });
  }
  if (secondary) kpis.push({ type: 'kpi', title: `Avg ${nice(secondary.name)}`, subtitle: '', query: q({ measure: secondary.name, agg: 'avg' }) });
  else if (cats[0]) kpis.push({ type: 'kpi', title: `${nice(cats[0].name)}s`, subtitle: 'distinct values', query: q({ measure: cats[0].name, agg: 'distinct' }) });

  const m = primary ? { measure: primary.name, agg: 'sum' } : { measure: null, agg: 'count' };
  const mLabel = primary ? nice(primary.name) : 'Records';
  const charts = [];
  if (date) charts.push({ type: 'area', title: `${mLabel} over time`, subtitle: `By ${grain}`, query: q({ ...m, groupBy: date.name, timeGrain: grain }) });
  if (cats[0]) charts.push({ type: cats[0].distinct > 8 ? 'hbar' : 'bar', title: `${mLabel} by ${nice(cats[0].name)}`, subtitle: 'Top groups', query: q({ ...m, groupBy: cats[0].name, limit: 12 }) });
  if (cats[1]) charts.push({ type: cats[1].distinct <= 6 ? 'donut' : 'hbar', title: `Share by ${nice(cats[1].name)}`, subtitle: primary ? `${mLabel} split` : 'Record split', query: q({ ...m, groupBy: cats[1].name, limit: cats[1].distinct <= 6 ? 6 : 10 }) });
  if (secondary && cats[0]) charts.push({ type: 'bar', title: `Avg ${nice(secondary.name)} by ${nice(cats[0].name)}`, subtitle: 'Average per group', query: q({ measure: secondary.name, agg: 'avg', groupBy: cats[0].name, limit: 12 }) });
  if (date && secondary) charts.push({ type: 'line', title: `Avg ${nice(secondary.name)} trend`, subtitle: `By ${grain}`, query: q({ measure: secondary.name, agg: 'avg', groupBy: date.name, timeGrain: grain }) });
  if (cats[2]) charts.push({ type: 'table', title: `Top ${nice(cats[2].name)}`, subtitle: `Ranked by ${mLabel.toLowerCase()}`, query: q({ ...m, groupBy: cats[2].name, limit: 15 }) });
  if (!charts.length && cols[0]) charts.push({ type: 'table', title: `Most common ${nice(cols[0].name)}`, subtitle: '', query: q({ groupBy: cols[0].name, limit: 15 }) });

  return { title: dataset.name, summary: '', kpis: kpis.slice(0, 4), charts: charts.slice(0, 6), insights: [], questions: [] };
}

const PRIORITY = ['revenue', 'sales', 'net', 'total', 'amount', 'gross', 'income', 'profit', 'tuition', 'value', 'price', 'cost'];
function pickPrimary(nums) {
  const rank = (c) => { const i = PRIORITY.findIndex((w) => c.name.toLowerCase().includes(w)); return i === -1 ? 99 : i; };
  return nums.slice().sort((a, b) => rank(a) - rank(b) || Math.abs(b.sum) - Math.abs(a.sum))[0] || null;
}

function pickGrain(dateCol) {
  const days = (new Date(dateCol.max) - new Date(dateCol.min)) / 864e5;
  if (days <= 45) return 'day';
  if (days <= 200) return 'week';
  if (days <= 1100) return 'month';
  return 'quarter';
}

/** Rule-based starter questions shown before the AI suggests its own. */
export function starterQuestions(dataset) {
  const nums = dataset.columns.filter((c) => c.type === 'number');
  const cats = dataset.columns.filter((c) => c.type === 'category');
  const date = dataset.columns.find((c) => c.type === 'date');
  const p = pickPrimary(nums);
  const out = [];
  if (p && cats[0]) out.push(`Which ${nice(cats[0].name).toLowerCase()} has the highest ${nice(p.name).toLowerCase()}?`);
  if (p && date) out.push(`What was the best month for ${nice(p.name).toLowerCase()}?`);
  if (cats[1]) out.push(`Compare ${nice(cats[1].name).toLowerCase()} performance`);
  out.push('What are the 3 most surprising findings?');
  return out.slice(0, 4);
}
