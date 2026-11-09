// Runs the Netlify-style handlers (netlify/functions/*.mjs) on Vercel, so the
// same tested code serves both hosts. Netlify passes the visitor IP as
// context.ip; on Vercel it comes from the proxy headers instead.
export function adapt(handler) {
  const run = (req) => {
    const ip = req.headers.get('x-real-ip') || (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'unknown';
    return handler(req, { ip });
  };
  return { POST: run, OPTIONS: run, GET: run };
}
