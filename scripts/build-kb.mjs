// Writes public/widget/kb.json from netlify/lib/knowledge.mjs + faq.mjs so the
// widget's free-mode answers use the same facts as the Claude-powered ones.
// Run: npm run build:kb   (also runs automatically before every deploy via "build")
import { writeFileSync } from 'node:fs';
import { SITES } from '../netlify/lib/knowledge.mjs';
import { FAQ, ALIASES } from '../netlify/lib/faq.mjs';

const sites = {};
const chunks = [];
const faq = [];
for (const [key, s] of Object.entries(SITES)) {
  sites[key] = { name: s.name, url: s.url, greeting: s.greeting, suggestions: s.suggestions, aliases: ALIASES[key] || [] };
  // Curated answers come first: they are what Kapitan should say.
  for (const f of FAQ[key] || []) faq.push({ site: key, q: f.q, a: f.a });
  // Fallback: individual fact SENTENCES (not whole paragraphs), so an answer
  // drawn from the facts stays short and on-topic.
  for (const raw of s.facts.split('\n')) {
    const line = raw.replace(/^\s*-\s*/, '').trim();
    if (line.length <= 12 || line.endsWith(':')) continue; // bare headings carry no answer
    for (const sent of line.split(/(?<=[.!?])\s+(?=[A-Z])/)) {
      if (sent.trim().length > 20) chunks.push({ site: key, siteName: s.name, text: sent.trim() }); // siteName: for widgets cached before v2
    }
  }
}
const out = new URL('../public/widget/kb.json', import.meta.url);
writeFileSync(out, JSON.stringify({ v: 2, sites, faq, chunks }));
console.log(`kb.json: ${Object.keys(sites).length} sites, ${faq.length} Q&A, ${chunks.length} fact sentences`);
