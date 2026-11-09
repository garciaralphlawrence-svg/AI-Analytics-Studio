// Tiny query engine over an array of row objects.
// Used in two places, kept byte-identical:
//   - netlify/lib/query.mjs   (server: the AI's run_query tool)
//   - public/js/query.mjs     (browser: renders charts on the full dataset)
// Rows hold numbers as numbers and dates as 'YYYY-MM-DD' strings.

export const AGGS = ['sum', 'avg', 'count', 'min', 'max', 'distinct'];
export const GRAINS = ['none', 'day', 'week', 'month', 'quarter', 'year'];
export const OPS = ['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'contains', 'in'];

function bucket(dateStr, grain) {
  if (!dateStr || grain === 'none' || grain === 'day') return dateStr;
  const [y, m, d] = dateStr.split('-').map(Number);
  if (grain === 'year') return String(y);
  if (grain === 'quarter') return `${y}-Q${Math.floor((m - 1) / 3) + 1}`;
  if (grain === 'month') return `${y}-${String(m).padStart(2, '0')}`;
  // ISO-ish week: label by the Monday that starts the week.
  const dt = new Date(Date.UTC(y, m - 1, d));
  const dow = (dt.getUTCDay() + 6) % 7;
  dt.setUTCDate(dt.getUTCDate() - dow);
  return dt.toISOString().slice(0, 10);
}

function matches(row, f) {
  const v = row[f.column];
  const target = f.value;
  const num = typeof v === 'number' ? Number(target) : null;
  switch (f.op) {
    case 'eq': return num !== null ? v === num : String(v ?? '').toLowerCase() === String(target).toLowerCase();
    case 'neq': return num !== null ? v !== num : String(v ?? '').toLowerCase() !== String(target).toLowerCase();
    case 'gt': return num !== null ? v > num : String(v) > String(target);
    case 'gte': return num !== null ? v >= num : String(v) >= String(target);
    case 'lt': return num !== null ? v < num : String(v) < String(target);
    case 'lte': return num !== null ? v <= num : String(v) <= String(target);
    case 'contains': return String(v ?? '').toLowerCase().includes(String(target).toLowerCase());
    case 'in': return String(target).toLowerCase().split('|').includes(String(v ?? '').toLowerCase());
    default: return true;
  }
}

function aggregate(values, agg) {
  if (agg === 'count') return values.length;
  if (agg === 'distinct') return new Set(values).size;
  const nums = values.filter((x) => typeof x === 'number' && Number.isFinite(x));
  if (!nums.length) return null;
  if (agg === 'sum') return nums.reduce((a, b) => a + b, 0);
  if (agg === 'avg') return nums.reduce((a, b) => a + b, 0) / nums.length;
  if (agg === 'min') return Math.min(...nums);
  if (agg === 'max') return Math.max(...nums);
  return null;
}

const round = (n) => (typeof n === 'number' ? Math.round(n * 100) / 100 : n);

/**
 * spec: {
 *   measure: column | null   (null → count rows)
 *   agg: one of AGGS
 *   groupBy: column | null
 *   timeGrain: one of GRAINS (only used when groupBy is a date column)
 *   filters: [{ column, op, value }]
 *   sort: 'desc' | 'asc' | 'label'
 *   limit: number (0 = no limit)
 * }
 * returns { labels: [...], values: [...], total, rowsMatched }
 */
export function runQuery(rows, columns, spec) {
  const colNames = new Set(columns.map((c) => c.name));
  const types = Object.fromEntries(columns.map((c) => [c.name, c.type]));
  const s = {
    measure: colNames.has(spec.measure) ? spec.measure : null,
    agg: AGGS.includes(spec.agg) ? spec.agg : 'count',
    groupBy: colNames.has(spec.groupBy) ? spec.groupBy : null,
    timeGrain: GRAINS.includes(spec.timeGrain) ? spec.timeGrain : 'none',
    filters: (spec.filters || []).filter((f) => colNames.has(f.column) && OPS.includes(f.op)),
    sort: ['desc', 'asc', 'label'].includes(spec.sort) ? spec.sort : 'desc',
    limit: Math.max(0, Math.min(Number(spec.limit) || 0, 500)),
  };
  if (!s.measure && s.agg !== 'count') s.agg = 'count';

  const filtered = rows.filter((r) => s.filters.every((f) => matches(r, f)));
  const pick = (r) => (s.measure ? r[s.measure] : 1);
  const total = round(aggregate(filtered.map(pick), s.agg));

  if (!s.groupBy) return { labels: ['All'], values: [total], total, rowsMatched: filtered.length, spec: s };

  const isDate = types[s.groupBy] === 'date';
  const groups = new Map();
  for (const r of filtered) {
    let key = r[s.groupBy];
    if (key === null || key === undefined || key === '') key = '(blank)';
    else if (isDate) key = bucket(String(key), s.timeGrain === 'none' ? 'month' : s.timeGrain);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(pick(r));
  }
  let entries = [...groups].map(([k, vals]) => [String(k), round(aggregate(vals, s.agg))]);
  // Time series always read left-to-right in time order.
  if (isDate || s.sort === 'label') entries.sort((a, b) => a[0].localeCompare(b[0], undefined, { numeric: true }));
  else entries.sort((a, b) => (s.sort === 'asc' ? (a[1] ?? 0) - (b[1] ?? 0) : (b[1] ?? 0) - (a[1] ?? 0)));
  if (s.limit && !isDate) entries = entries.slice(0, s.limit);
  return { labels: entries.map((e) => e[0]), values: entries.map((e) => e[1]), total, rowsMatched: filtered.length, spec: s };
}
