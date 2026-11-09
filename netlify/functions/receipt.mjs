// POST /api/receipt — the AI behind the Resibo / Receipt Maker.
//   mode "parse": a sale described in plain words (English, Filipino or Taglish)
//                 → structured line items. Totals, VAT and discounts are computed
//                 in the browser, never by the model, so the money is always exact.
//   mode "scan":  a photo of a paper receipt → an expense record.
// Single model call per request, so it stays well inside Netlify's ~30s limit.
import Anthropic from '@anthropic-ai/sdk';
import { gate, json, MODEL } from '../lib/shared.mjs';

const client = new Anthropic();
const nullable = (schema) => ({ anyOf: [schema, { type: 'null' }] });
const PAYMENT = ['Cash', 'GCash', 'Maya', 'Card', 'Bank Transfer', 'Other'];
const CATEGORIES = ['Food & Drinks', 'Groceries', 'Transport', 'Supplies', 'Utilities', 'Services', 'Other'];
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_IMAGE_B64 = 5_000_000;

const PARSE_TOOL = {
  name: 'record_sale',
  description: 'Record the sale the cashier described as structured receipt data.',
  strict: true,
  input_schema: {
    type: 'object',
    additionalProperties: false,
    required: ['customer_name', 'items', 'payment_method', 'amount_tendered', 'discount_type', 'discount_percent', 'notes', 'clarification'],
    properties: {
      customer_name: nullable({ type: 'string' }),
      items: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['description', 'quantity', 'unit_price'],
          properties: {
            description: { type: 'string', description: 'Clean product name in Title Case, e.g. "Spanish Latte"' },
            quantity: { type: 'number' },
            unit_price: { type: 'number', description: 'Price per unit in PHP, VAT-inclusive as stated' },
          },
        },
      },
      payment_method: { type: 'string', enum: PAYMENT },
      amount_tendered: nullable({ type: 'number', description: 'Cash handed over, only if stated' }),
      discount_type: { type: 'string', enum: ['none', 'senior', 'pwd', 'percent'] },
      discount_percent: nullable({ type: 'number', description: 'Only for discount_type "percent"' }),
      notes: nullable({ type: 'string', description: 'Order notes worth printing, e.g. "less ice"' }),
      clarification: nullable({ type: 'string', description: 'If a price or quantity is missing, a short question to ask; otherwise null' }),
    },
  },
};

const SCAN_TOOL = {
  name: 'record_expense',
  description: 'Record what this receipt photo shows as an expense entry.',
  strict: true,
  input_schema: {
    type: 'object',
    additionalProperties: false,
    required: ['readable', 'merchant_name', 'receipt_number', 'date', 'items', 'subtotal', 'vat', 'total', 'payment_method', 'category', 'notes'],
    properties: {
      readable: { type: 'boolean', description: 'false if this is not a receipt or is too blurry to read' },
      merchant_name: nullable({ type: 'string' }),
      receipt_number: nullable({ type: 'string' }),
      date: nullable({ type: 'string', description: 'YYYY-MM-DD' }),
      items: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['description', 'quantity', 'amount'],
          properties: {
            description: { type: 'string' },
            quantity: { type: 'number' },
            amount: { type: 'number', description: 'Line total as printed' },
          },
        },
      },
      subtotal: nullable({ type: 'number' }),
      vat: nullable({ type: 'number' }),
      total: nullable({ type: 'number', description: 'Grand total / amount due as printed' }),
      payment_method: nullable({ type: 'string' }),
      category: { type: 'string', enum: CATEGORIES },
      notes: nullable({ type: 'string', description: 'Anything uncertain, e.g. "total partly cut off"' }),
    },
  },
};

const PARSE_SYSTEM = `You turn a cashier's quick description of a sale into receipt line items for a small Philippine business.
- Input may be English, Filipino or Taglish. "tig-165" / "tig 165" / "@165" / "165 each" mean the unit price; "2 pcs" is quantity 2.
  A bare "latte 165" means quantity 1 at 165. "Php", "P", "₱" are pesos.
- Payment: "gcash" → GCash, "maya"/"paymaya" → Maya, "card"/"credit"/"debit" → Card, "bayad 500"/"cash 500"/"abot 500" → Cash with amount_tendered 500. Default Cash.
- "senior"/"SC" → senior discount; "PWD" → pwd; "10% off" → percent 10. Never compute totals.
- Customer: "si Juan", "for Maria", "customer: Ana" → the name. Otherwise null.
- If a price is missing for an item, still include the item with unit_price 0 and ask in clarification.
Call record_sale exactly once.`;

const SCAN_SYSTEM = `You read photos of receipts (often Philippine: BIR official receipts, sales invoices, grocery and restaurant slips) and record them as expense entries.
Copy amounts exactly as printed; never invent numbers. Use null for anything you cannot read. If the image is not a receipt or is unreadable, set readable to false.
Call record_expense exactly once.`;

async function runTool(system, tool, content) {
  const response = await client.beta.messages.create({
    model: MODEL,
    max_tokens: 4000,
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    output_config: { effort: 'low' },
    system,
    tools: [tool],
    messages: [{ role: 'user', content }],
  });
  if (response.stop_reason === 'refusal') return { error: 'The AI declined this request.' };
  const call = response.content.find((b) => b.type === 'tool_use' && b.name === tool.name);
  return call ? { result: call.input } : { error: 'The AI could not read that. Please try rephrasing.' };
}

export default async (req, context) => {
  const early = gate(req, context, { limit: 40, windowMs: 10 * 60_000 });
  if (early) return early;

  let body;
  try { body = await req.json(); } catch { return json(req, 400, { error: 'Invalid JSON' }); }

  try {
    if (body.mode === 'scan') {
      const { media_type: mediaType, data } = body.image || {};
      if (!IMAGE_TYPES.includes(mediaType) || typeof data !== 'string' || !data || data.length > MAX_IMAGE_B64) {
        return json(req, 400, { error: 'Please send a JPEG, PNG or WebP photo under 3.5 MB.' });
      }
      const out = await runTool(SCAN_SYSTEM, SCAN_TOOL, [
        { type: 'image', source: { type: 'base64', media_type: mediaType, data } },
        { type: 'text', text: 'Record this receipt as an expense.' },
      ]);
      return json(req, out.error ? 422 : 200, out);
    }

    const text = typeof body.text === 'string' ? body.text.trim() : '';
    if (!text || text.length > 1500) return json(req, 400, { error: 'Describe the sale in up to 1,500 characters.' });
    const out = await runTool(PARSE_SYSTEM, PARSE_TOOL, `Sale: ${text}`);
    return json(req, out.error ? 422 : 200, out);
  } catch (err) {
    console.error('receipt error', err?.status, err?.message);
    return json(req, err?.status === 429 ? 429 : 502, { error: err?.status === 429 ? 'The AI is busy. Try again in a moment.' : 'The AI service is unavailable right now.' });
  }
};

export const config = { path: '/api/receipt' };
