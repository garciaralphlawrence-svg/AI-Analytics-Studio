// Writes public/widget/kb.json from netlify/lib/knowledge.mjs so the widget's
// offline answers use exactly the same facts as the Claude-powered ones.
// Run: npm run build:kb   (also runs automatically before every deploy via "build")
import { writeFileSync } from 'node:fs';
import { SITES } from '../netlify/lib/knowledge.mjs';

const sites = {};
const chunks = [];
for (const [key, s] of Object.entries(SITES)) {
  sites[key] = { name: s.name, url: s.url, greeting: s.greeting, suggestions: s.suggestions };
  // Each fact line (or bullet) becomes one retrievable chunk.
  for (const raw of s.facts.split('\n')) {
    const text = raw.replace(/^\s*-\s*/, '').trim();
    // Skip bare headings like "Tour packages (...):" — they carry no answer on their own.
    if (text.length > 12 && !text.endsWith(':')) chunks.push({ site: key, siteName: s.name, text });
  }
}
const out = new URL('../public/widget/kb.json', import.meta.url);
writeFileSync(out, JSON.stringify({ sites, chunks }));
console.log(`kb.json: ${Object.keys(sites).length} sites, ${chunks.length} chunks`);
