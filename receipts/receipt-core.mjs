// Receipt maths + an offline fallback parser. No DOM here, so it is unit-testable in Node.
// All money is computed here (never by the AI), rounded to centavos.

export const VAT_RATE = 0.12;
export const PAYMENT_METHODS = ['Cash', 'GCash', 'Maya', 'Card', 'Bank Transfer', 'Other'];
const r2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

/**
 * sale: { items:[{description, quantity, unit_price}], discount_type, discount_percent, amount_tendered, payment_method }
 * business: { vatRegistered: boolean }
 * Prices are VAT-inclusive (normal for Philippine retail).
 *
 * Senior citizen / PWD (RA 9994 / RA 10754): the sale is VAT-exempt and gets 20% off
 * the VAT-exclusive price, i.e. due = (gross / 1.12) × 0.80 for a VAT-registered seller.
 */
export function computeTotals(sale, business = { vatRegistered: true }) {
  const lines = (sale.items || []).map((it) => {
    const quantity = Math.max(0, Number(it.quantity) || 0);
    const unitPrice = Math.max(0, Number(it.unit_price) || 0);
    return { description: String(it.description || '').trim() || 'Item', quantity, unit_price: unitPrice, amount: r2(quantity * unitPrice) };
  }).filter((l) => l.quantity > 0);

  const gross = r2(lines.reduce((a, l) => a + l.amount, 0));
  const vatReg = business.vatRegistered !== false;
  const t = { lines, gross, discountLabel: null, discount: 0, vatableSales: 0, vatExemptSales: 0, vat: 0, lessVat: 0, total: gross };

  if (sale.discount_type === 'senior' || sale.discount_type === 'pwd') {
    const base = vatReg ? r2(gross / (1 + VAT_RATE)) : gross;
    t.lessVat = r2(gross - base);
    t.discount = r2(base * 0.2);
    t.vatExemptSales = base;
    t.total = r2(base - t.discount);
    t.discountLabel = sale.discount_type === 'senior' ? 'Senior Citizen (20%)' : 'PWD (20%)';
  } else {
    const pct = sale.discount_type === 'percent' ? Math.min(100, Math.max(0, Number(sale.discount_percent) || 0)) : 0;
    t.discount = r2(gross * (pct / 100));
    t.total = r2(gross - t.discount);
    if (pct) t.discountLabel = `Discount (${pct}%)`;
    if (vatReg) {
      t.vatableSales = r2(t.total / (1 + VAT_RATE));
      t.vat = r2(t.total - t.vatableSales);
    }
  }
  const tendered = Number(sale.amount_tendered);
  t.tendered = sale.payment_method === 'Cash' && tendered > 0 ? r2(tendered) : null;
  t.change = t.tendered !== null ? r2(Math.max(0, t.tendered - t.total)) : null;
  t.short = t.tendered !== null && t.tendered < t.total;
  return t;
}

export const peso = (n) => '₱' + (Number(n) || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function nextReceiptNumber(prefix, last) {
  return `${(prefix || 'RCPT').toUpperCase()}-${String((last || 0) + 1).padStart(6, '0')}`;
}

/**
 * Offline fallback when the AI is unreachable: understands simple descriptions like
 * "2 spanish latte tig-165, 1 ensaymada 85, gcash, si Juan" or "latte x2 @150; cash 500".
 */
export function quickParse(text) {
  const src = String(text || '');
  const lower = src.toLowerCase();
  const sale = { customer_name: null, items: [], payment_method: 'Cash', amount_tendered: null, discount_type: 'none', discount_percent: null, notes: null, clarification: null };

  if (/\bg-?cash\b/.test(lower)) sale.payment_method = 'GCash';
  else if (/\b(pay)?maya\b/.test(lower)) sale.payment_method = 'Maya';
  else if (/\b(card|credit|debit|visa|mastercard)\b/.test(lower)) sale.payment_method = 'Card';
  else if (/\b(bank|transfer|bdo|bpi)\b/.test(lower)) sale.payment_method = 'Bank Transfer';

  const tender = lower.match(/\b(?:cash|bayad|abot|tendered|paid)\s*(?:na|ng|of)?\s*₱?\s*(\d+(?:\.\d+)?)/);
  if (tender) sale.amount_tendered = Number(tender[1]);
  if (/\b(senior|sc)\b/.test(lower)) sale.discount_type = 'senior';
  else if (/\bpwd\b/.test(lower)) sale.discount_type = 'pwd';
  const pct = lower.match(/(\d{1,2})\s*%\s*(off|discount)/);
  if (pct && sale.discount_type === 'none') { sale.discount_type = 'percent'; sale.discount_percent = Number(pct[1]); }
  const cust = src.match(/\b(?:si|for|customer[:\s]+|kay|para kay)\s+([A-Z][\w.]*(?:\s+[A-Z][\w.]*)?)/);
  if (cust) sale.customer_name = cust[1];

  const PAY_WORDS = /^(g-?cash|(pay)?maya|card|credit|debit|cash|bayad|abot|paid|tendered|bank|transfer|senior|sc|pwd|si|for|customer|kay|para)\b/i;
  // Split into items on commas/newlines and on "and" / Filipino "at" / "tsaka" — but only when a new
  // item follows ("120 at 2 cheesecake", "175 tsaka dalawang croissant"), so "latte at 150" stays a price.
  for (const raw of src.split(/[,;\n]|\b(?:and|at saka|tsaka|saka)\b|\bat\s+(?=(?:\d+|isa|isang|dalawa|dalawang|tatlo|tatlong|apat|apat na|lima|limang)\s+[a-z])/i)) {
    // Drop payment / discount / tender words wherever they sit ("cheesecake 195 senior").
    let part = raw
      .replace(/\b(?:cash|bayad|abot|paid|tendered)\s*(?:na|ng|of)?\s*₱?\s*\d+(?:\.\d+)?/gi, '')
      .replace(/\d{1,2}\s*%\s*(?:off|discount)/gi, '')
      .replace(/\b(?:senior|sc|pwd|g-?cash|(?:pay)?maya|card|credit|debit)\b/gi, '')
      .trim();
    if (!part || PAY_WORDS.test(part) || /^\d+\s*%/.test(part)) continue;
    // Filipino number words: "isang latte", "dalawang croissant".
    part = part.replace(/^(isa|isang|dalawa|dalawang|tatlo|tatlong|apat na|apat|lima|limang)\s+/i,
      (w) => `${{ isa: 1, isang: 1, dalawa: 2, dalawang: 2, tatlo: 3, tatlong: 3, apat: 4, 'apat na': 4, lima: 5, limang: 5 }[w.trim().toLowerCase()]} `);
    let qty = 1;
    let m = part.match(/^(\d+(?:\.\d+)?)\s*(?:x|pcs?|pieces?|order|orders)?\s+(.*)$/i);
    if (m) { qty = Number(m[1]); part = m[2]; }
    m = part.match(/^(.*?)\s*x\s*(\d+)\b(.*)$/i); // "latte x2 @150"
    if (m) { qty = Number(m[2]); part = `${m[1]} ${m[3]}`.trim(); }
    m = part.match(/^(.*?)\s*(?:tig-?|@|at|each|₱|php|p)?\s*₱?\s*(\d+(?:\.\d+)?)\s*(?:each|ea|pesos?)?$/i);
    if (!m || !m[1].trim()) {
      if (/[a-z]/i.test(part)) sale.items.push({ description: titleCase(part), quantity: qty, unit_price: 0 });
      continue;
    }
    const desc = m[1].replace(/\b(tig|at|@|each|php)\b\s*$/i, '').replace(/[-@₱]+$/, '').trim();
    sale.items.push({ description: titleCase(desc), quantity: qty, unit_price: Number(m[2]) });
  }
  if (sale.items.some((i) => !i.unit_price)) sale.clarification = 'Some items have no price yet — please fill them in.';
  return sale;
}

function titleCase(s) {
  return s.replace(/\s+/g, ' ').trim().replace(/\w\S*/g, (w) => w[0].toUpperCase() + w.slice(1).toLowerCase());
}

/** Demo history so the "Analyze my sales" dashboard has something meaningful to show. */
export function sampleReceipts(prefix = 'KC', count = 160) {
  let s = 7;
  const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  const menu = [['Spanish Latte', 165, 'Coffee'], ['Caffè Latte', 150, 'Coffee'], ['Americano', 120, 'Coffee'], ['Cold Brew', 175, 'Coffee'],
    ['Matcha Latte', 170, 'Non-Coffee'], ['Iced Chocolate', 140, 'Non-Coffee'], ['Ensaymada', 85, 'Pastry'], ['Basque Cheesecake', 195, 'Pastry'], ['Ham & Cheese Croissant', 135, 'Pastry']];
  const names = [null, null, null, 'Juan', 'Maria', 'Ana', 'Paolo', 'Bea', 'Carlo', 'Jasmine', 'Miguel'];
  const pays = [['Cash', 5], ['GCash', 4], ['Maya', 1.5], ['Card', 1.2]];
  const pick = (arr) => { const tot = arr.reduce((a, x) => a + x[1], 0); let x = rnd() * tot; for (const [v, w] of arr) { if ((x -= w) <= 0) return v; } return arr[0][0]; };
  const out = [];
  const now = new Date();
  for (let i = 0; i < count; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() - Math.floor((count - i) * 90 / count));
    d.setHours(7 + Math.floor(rnd() * 13), Math.floor(rnd() * 60));
    const n = 1 + Math.floor(rnd() * 3);
    const items = [];
    for (let k = 0; k < n; k++) {
      const m = menu[Math.floor(rnd() * menu.length)];
      items.push({ description: m[0], quantity: 1 + Math.floor(rnd() * rnd() * 3), unit_price: m[1], category: m[2] });
    }
    const pm = pick(pays);
    const disc = rnd() < 0.06 ? 'senior' : rnd() < 0.03 ? 'pwd' : 'none';
    out.push({ number: `${prefix}-${String(i + 1).padStart(6, '0')}`, issuedAt: d.toISOString(), customer_name: names[Math.floor(rnd() * names.length)],
      items, payment_method: pm, amount_tendered: null, discount_type: disc, discount_percent: null, notes: null, sample: true });
  }
  return out;
}
