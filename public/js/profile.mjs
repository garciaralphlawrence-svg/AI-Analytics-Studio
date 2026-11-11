// Turns raw spreadsheet rows into typed rows + a column profile.
// Types: number | date | category | text. Dates become 'YYYY-MM-DD' strings.

const MONEY_RE = /(revenue|sales|amount|price|cost|income|profit|tuition|gross|net|fee|value|budget|discount|php|usd|₱|\$)/i;
const ID_RE = /(^id$|_id$|^id_|\bid\b|code|number$|no\.?$|#)/i;

function toISO(d) {
  if (!(d instanceof Date) || isNaN(d)) return null;
  const y = d.getFullYear();
  if (y < 1900 || y > 2100) return null;
  return `${y}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function parseNumber(v) {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  if (typeof v !== 'string') return null;
  const s = v.trim().replace(/[₱$€£,\s]/g, '').replace(/^\((.*)\)$/, '-$1');
  if (!s || !/^-?\d*\.?\d+(e-?\d+)?%?$/i.test(s)) return null;
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : null;
}

const DATE_RE = /^(\d{4}-\d{1,2}(-\d{1,2}([ T].*)?)?|\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|[A-Za-z]{3,9}\.? \d{1,2},? \d{4}|\d{1,2} [A-Za-z]{3,9}\.? \d{4})$/;
function parseDate(v) {
  if (v instanceof Date) return toISO(v);
  if (typeof v !== 'string') return null;
  const s = v.trim();
  if (!DATE_RE.test(s)) return null;
  const iso = s.match(/^(\d{4})-(\d{1,2})(?:-(\d{1,2}))?/);
  if (iso) return +iso[2] >= 1 && +iso[2] <= 12 ? toISO(new Date(+iso[1], +iso[2] - 1, +(iso[3] || 1))) : null;
  return toISO(new Date(s));
}

function cleanName(name, i, seen) {
  let n = String(name ?? '').trim().replace(/\s+/g, ' ') || `Column ${i + 1}`;
  let k = n, j = 2;
  while (seen.has(k)) k = `${n} (${j++})`;
  seen.add(k);
  return k;
}

/** raw: array of objects (keys = headers). Returns { columns, rows }. */
export function profileData(raw) {
  const seen = new Set();
  const headers = [...new Set(raw.flatMap((r) => Object.keys(r)))];
  const names = headers.map((h, i) => cleanName(h, i, seen));
  const n = raw.length;

  const columns = headers.map((h, i) => {
    const vals = raw.map((r) => r[h]).filter((v) => v !== null && v !== undefined && String(v).trim() !== '');
    const nonEmpty = vals.length || 1;
    const nums = vals.map(parseNumber).filter((x) => x !== null);
    const dates = vals.map(parseDate).filter((x) => x !== null);
    const distinct = new Set(vals.map((v) => String(v).trim().toLowerCase())).size;
    let type;
    if (dates.length / nonEmpty >= 0.9 && !(nums.length === dates.length && vals.every((v) => typeof v === 'number'))) type = 'date';
    else if (nums.length / nonEmpty >= 0.9) type = 'number';
    else {
      const avgLen = vals.reduce((a, v) => a + String(v).length, 0) / nonEmpty;
      type = distinct <= Math.max(25, n * 0.05) && avgLen < 40 ? 'category' : 'text';
    }
    // Numeric IDs / codes behave like labels, not quantities.
    if (type === 'number' && ID_RE.test(names[i]) && distinct > n * 0.9) type = 'text';
    return { key: h, name: names[i], type };
  });

  const rows = raw.map((r) => {
    const o = {};
    for (const c of columns) {
      const v = r[c.key];
      if (v === null || v === undefined || String(v).trim() === '') o[c.name] = null;
      else if (c.type === 'number') o[c.name] = parseNumber(v);
      else if (c.type === 'date') o[c.name] = parseDate(v);
      else o[c.name] = String(v).trim();
    }
    return o;
  });

  return { columns: columns.map((c) => describe(c, rows)), rows };
}

function describe(c, rows) {
  const vals = rows.map((r) => r[c.name]);
  const present = vals.filter((v) => v !== null);
  const out = { name: c.name, type: c.type, missing: vals.length - present.length };
  if (c.type === 'number') {
    const sum = present.reduce((a, b) => a + b, 0);
    Object.assign(out, {
      min: round(Math.min(...present)), max: round(Math.max(...present)),
      mean: round(sum / (present.length || 1)), sum: round(sum),
      money: MONEY_RE.test(c.name),
      integer: present.every((v) => Number.isInteger(v)),
    });
  } else if (c.type === 'date') {
    const sorted = present.slice().sort();
    Object.assign(out, { min: sorted[0], max: sorted[sorted.length - 1], distinctDays: new Set(present).size });
  } else {
    const counts = new Map();
    present.forEach((v) => counts.set(v, (counts.get(v) || 0) + 1));
    out.distinct = counts.size;
    out.top = [...counts].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([value, count]) => ({ value: String(value).slice(0, 60), count }));
  }
  return out;
}

const round = (x) => (Number.isFinite(x) ? Math.round(x * 100) / 100 : null);

/** Parse an uploaded File (xlsx/xls/csv) with SheetJS (global XLSX). */
export async function readFile(file) {
  const buf = await file.arrayBuffer();
  const wb = window.XLSX.read(buf, { type: 'array', cellDates: true, dense: true });
  // Use the sheet with the most rows.
  let best = null;
  for (const name of wb.SheetNames) {
    const rows = window.XLSX.utils.sheet_to_json(wb.Sheets[name], { defval: null, raw: true });
    if (!best || rows.length > best.rows.length) best = { name, rows };
  }
  if (!best || !best.rows.length) throw new Error('No data rows found in this file.');
  return { sheet: best.name, raw: best.rows };
}
