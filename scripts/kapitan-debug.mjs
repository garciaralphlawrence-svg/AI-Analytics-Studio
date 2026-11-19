// Shows why Kapitan picked (or refused) an answer.
// Run: node scripts/kapitan-debug.mjs <site> "<question>" ["<question>" ...]
import { readFileSync } from 'node:fs';
const w = readFileSync(new URL('../public/widget/kapitan.js', import.meta.url), 'utf8');
const src = w.match(/\/\/ BRAIN START[^\n]*\n([\s\S]*?)\/\/ BRAIN END/)[1]
  .replace('// Relevance check:', 'console.log("   score", best && best.s.toFixed(2), "recall", best && best.R.toFixed(2), "hit", best && best.hit, "q", qt, "→", best && (best.d.faq ? best.d.faq.q[0] : best.d.text.slice(0, 60)));\n    // Relevance check:');
const KB = JSON.parse(readFileSync(new URL('../public/widget/kb.json', import.meta.url), 'utf8'));
const [site, ...qs] = process.argv.slice(2);
const brain = new Function('KB', 'SITE', src + '\nreturn { answer: offlineAnswer };')(KB, site);
for (const q of qs) { console.log(q); console.log('   ⇒', brain.answer(q).replace(/\s+/g, ' ').slice(0, 140)); }
