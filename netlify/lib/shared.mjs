// Shared helpers for the Ralph AI functions (chat + analytics).
// The Anthropic key lives only in the Netlify env var ANTHROPIC_API_KEY —
// it never reaches the browser.

// Sites allowed to call these endpoints from the browser. Anything else gets
// no CORS header, so other websites can't spend this API key.
export const ALLOWED_ORIGINS = new Set([
  'https://ralph-garcia-portfolio.netlify.app',
  'https://kmm-travel-ph.netlify.app',
  'https://islakeys-ph.netlify.app',
  'https://bizbuddy-va.netlify.app',
  'https://ralph-ai-analytics-studio.netlify.app',
  'https://ralph-ai-suite.vercel.app',
  'https://garciaralphlawrence-svg.github.io',
  ...(process.env.EXTRA_ALLOWED_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean),
]);

export function isAllowedOrigin(origin) {
  if (!origin) return false;
  if (ALLOWED_ORIGINS.has(origin)) return true;
  // Netlify deploy previews (e.g. https://abc123--kmm-travel-ph.netlify.app) and local testing.
  return /^https:\/\/[a-z0-9]+--(ralph-garcia-portfolio|kmm-travel-ph|islakeys-ph|bizbuddy-va|ralph-ai-analytics-studio)\.netlify\.app$/.test(origin)
    || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
}

export function corsHeaders(req) {
  const origin = req.headers.get('origin');
  const h = { Vary: 'Origin' };
  if (isAllowedOrigin(origin)) {
    h['Access-Control-Allow-Origin'] = origin;
    h['Access-Control-Allow-Methods'] = 'POST, OPTIONS';
    h['Access-Control-Allow-Headers'] = 'Content-Type';
    h['Access-Control-Max-Age'] = '86400';
  }
  return h;
}

export function json(req, status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
  });
}

// Best-effort per-IP limiter. Netlify may run several warm instances, so this
// isn't a hard cap — the real spending cap is the monthly limit set in the
// Anthropic Console. It stops one visitor from hammering the endpoint.
const hits = new Map();
export function rateLimited(ip, limit, windowMs) {
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter((t) => now - t < windowMs);
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 5000) hits.clear();
  return recent.length > limit;
}

// Common gate for every endpoint: CORS preflight, method, origin, key, rate limit.
// Returns a Response to send back early, or null to continue.
export function gate(req, context, { limit, windowMs }) {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders(req) });
  if (req.method !== 'POST') return json(req, 405, { error: 'Method not allowed' });
  if (!isAllowedOrigin(req.headers.get('origin'))) return json(req, 403, { error: 'Origin not allowed' });
  if (!process.env.ANTHROPIC_API_KEY) return json(req, 503, { error: 'not_configured' });
  if (rateLimited(context.ip || 'unknown', limit, windowMs)) {
    return json(req, 429, { error: 'Too many requests — please wait a minute and try again.' });
  }
  return null;
}

export const MODEL = 'claude-opus-5-5';
