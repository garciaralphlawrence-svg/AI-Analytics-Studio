// POST /api/assistant — "Ralph AI Chat", the general-purpose ChatGPT-style assistant at /chat/.
// Protected by a demo access code (env DEMO_ACCESS_CODE) on top of the shared CORS/rate-limit gate.
//
// Response: plain-text stream of the reply. Control markers (never shown to the user):
//   \u0001            keep-alive byte, sent every 5s until the first words arrive
//   \u0000CONTINUE    the server stopped early to stay under Netlify's ~30s limit;
//                     the client asks for the rest in a follow-up request
//   \u0000REFUSAL     the model declined to answer
//   \u0000ERROR       upstream failure
import Anthropic from '@anthropic-ai/sdk';
import { createHash, timingSafeEqual } from 'node:crypto';
import { gate, json, corsHeaders, MODEL } from '../lib/shared.mjs';

const MAX_TURNS = 30;
const MAX_CHARS = 20_000;          // text per message
const MAX_TOTAL_CHARS = 200_000;   // text across the whole request
const MAX_IMAGES = 4;
const MAX_IMAGE_B64 = 3_000_000;   // ~2.2 MB binary per image
const MAX_TOTAL_IMAGE_B64 = 5_000_000;
const MAX_BODY_BYTES = 6 * 1024 * 1024;
const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

// Timing (overridable in unit tests only).
const timing = { budgetMs: 24_000, keepAliveMs: 5_000 };

let client = null;
const getClient = () => (client ||= new Anthropic());

// Test hooks — never used in production code paths.
export const __test = {
  setClient(c) { client = c; },
  setTiming(t) { Object.assign(timing, t); },
};

const SYSTEM = `You are **Ralph AI**, a capable, friendly general-purpose assistant built by Ralph Garcia, a data science graduate.

- Answer in clear, well-structured Markdown. Use headings, lists and tables only when they help; use fenced code blocks with a language tag for code.
- Be concise and modern: lead with the answer, then the detail that matters.
- Reply in the user's language, including Filipino and Taglish.
- Be honest about uncertainty and say when you don't know. You don't have web access or real-time information, so don't claim to have browsed or checked anything live.
- When the user shares images, look at them carefully and describe or analyze what is actually there.`;

const B64_RE = /^[A-Za-z0-9+/]+={0,2}$/;

// Returns a string error, or { messages } in Anthropic API shape.
export function validate(body) {
  if (!body || typeof body !== 'object' || !Array.isArray(body.messages)) return 'messages must be an array';
  const msgs = body.messages;
  if (!msgs.length) return 'messages must not be empty';
  if (msgs.length > MAX_TURNS) return `at most ${MAX_TURNS} messages per request`;

  let images = 0, imageBytes = 0, totalChars = 0;
  const out = [];
  for (const m of msgs) {
    if (!m || typeof m !== 'object' || !['user', 'assistant'].includes(m.role)) return 'bad message role';
    let blocks;
    if (typeof m.content === 'string') blocks = [{ type: 'text', text: m.content }];
    else if (Array.isArray(m.content) && m.content.length && m.content.length <= 12) blocks = m.content;
    else return 'bad message content';

    const content = [];
    let chars = 0;
    for (const b of blocks) {
      if (!b || typeof b !== 'object') return 'bad content block';
      if (b.type === 'text') {
        if (typeof b.text !== 'string') return 'bad text block';
        chars += b.text.length;
        if (b.text.trim()) content.push({ type: 'text', text: b.text });
      } else if (b.type === 'image') {
        if (m.role !== 'user') return 'images are only allowed in user messages';
        if (!IMAGE_TYPES.has(b.media_type)) return 'unsupported image type';
        if (typeof b.data !== 'string' || !b.data || !B64_RE.test(b.data)) return 'bad image data';
        if (b.data.length > MAX_IMAGE_B64) return 'image too large';
        images += 1;
        imageBytes += b.data.length;
        content.push({ type: 'image', source: { type: 'base64', media_type: b.media_type, data: b.data } });
      } else {
        return 'bad content block type';
      }
    }
    if (chars > MAX_CHARS) return `messages must be at most ${MAX_CHARS} characters`;
    if (!content.length) return 'messages must not be empty';
    totalChars += chars;
    out.push({ role: m.role, content });
  }
  if (images > MAX_IMAGES) return `at most ${MAX_IMAGES} images per request`;
  if (imageBytes > MAX_TOTAL_IMAGE_B64) return 'images too large in total';
  if (totalChars > MAX_TOTAL_CHARS) return 'conversation too long';
  if (out[out.length - 1].role !== 'user') return 'last message must be from the user';
  // The API requires the conversation to start with a user turn.
  while (out.length && out[0].role !== 'user') out.shift();
  return { messages: out };
}

// Constant-time comparison (hashing first makes the lengths equal).
export function codeMatches(given, expected) {
  if (typeof given !== 'string' || !given || given.length > 200) return false;
  const a = createHash('sha256').update(given).digest();
  const b = createHash('sha256').update(expected).digest();
  return timingSafeEqual(a, b);
}

export default async (req, context) => {
  const startedAt = Date.now();
  const early = gate(req, context || {}, { limit: 40, windowMs: 10 * 60_000 });
  if (early) return early;

  const len = Number(req.headers.get('content-length') || 0);
  if (len > MAX_BODY_BYTES) return json(req, 413, { error: 'request_too_large' });

  let body;
  try { body = await req.json(); } catch { return json(req, 400, { error: 'Invalid JSON' }); }

  const expected = process.env.DEMO_ACCESS_CODE;
  if (!expected) return json(req, 503, { error: 'chat_not_configured' });
  if (!codeMatches(body?.accessCode, expected)) return json(req, 401, { error: 'bad_code' });
  // The access-code modal checks the code without spending a model call.
  if (body.verify === true) return json(req, 200, { ok: true });

  const v = validate(body);
  if (typeof v === 'string') return json(req, 400, { error: v });

  const encoder = new TextEncoder();
  const abort = new AbortController();
  let cutoff = false;
  let cancelled = false;

  const stream = new ReadableStream({
    async start(controller) {
      const send = (s) => { if (!cancelled) { try { controller.enqueue(encoder.encode(s)); } catch { /* closed */ } } };
      // Invisible keep-alive until the first words arrive: Netlify's edge drops
      // a response that stays silent for ~30s.
      let started = false;
      const keepAlive = setInterval(() => { if (!started) send('\u0001'); }, timing.keepAliveMs);
      // Netlify kills functions at ~30s even mid-stream, so stop at ~24s and let
      // the client request the rest.
      const remaining = Math.max(1000, timing.budgetMs - (Date.now() - startedAt));
      const deadline = setTimeout(() => { cutoff = true; abort.abort(); }, remaining);
      try {
        const s = getClient().beta.messages.stream({
          model: MODEL,
          max_tokens: 4096,
          betas: ['server-side-fallback-2026-07-01'],
          fallbacks: 'default',
          output_config: { effort: 'low' },
          system: [{ type: 'text', text: SYSTEM, cache_control: { type: 'ephemeral' } }],
          messages: v.messages,
        }, { signal: abort.signal });
        for await (const event of s) {
          if (event.type === 'content_block_delta' && event.delta?.type === 'text_delta') {
            started = true;
            send(event.delta.text);
          }
        }
        const final = await s.finalMessage();
        if (final.stop_reason === 'refusal') send('\u0000REFUSAL');
        else if (final.stop_reason === 'max_tokens') send('\u0000CONTINUE');
      } catch (err) {
        if (cutoff) send('\u0000CONTINUE');
        else if (!cancelled) {
          console.error('assistant error', err?.status, err?.message);
          send('\u0000ERROR');
        }
      } finally {
        clearInterval(keepAlive);
        clearTimeout(deadline);
        if (!cancelled) { try { controller.close(); } catch { /* already closed */ } }
      }
    },
    cancel() {
      // The visitor pressed Stop or left: stop generating (and paying for) tokens.
      cancelled = true;
      abort.abort();
    },
  });

  return new Response(stream, {
    headers: {
      ...corsHeaders(req),
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
};

export const config = { path: '/api/assistant' };
