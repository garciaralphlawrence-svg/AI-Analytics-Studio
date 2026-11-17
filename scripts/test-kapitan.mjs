// Scores Kapitan's offline answers against scripts/kapitan-cases.mjs.
// Run: npm run test:kapitan            (uses public/widget/kapitan.js + kb.json)
//      node scripts/test-kapitan.mjs <widget.js> <kb.json>   (score another version)
// The widget exposes its answer engine between "// BRAIN START" and "// BRAIN END".
import { readFileSync } from 'node:fs';
const { CASES } = await import(process.argv.includes('--holdout') ? './kapitan-holdout.mjs' : './kapitan-cases.mjs');

const widget = readFileSync((process.argv[2] && !process.argv[2].startsWith('--') && process.argv[2]) || new URL('../public/widget/kapitan.js', import.meta.url), 'utf8');
const KB = JSON.parse(readFileSync((process.argv[3] && !process.argv[3].startsWith('--') && process.argv[3]) || new URL('../public/widget/kb.json', import.meta.url), 'utf8'));
const m = widget.match(/\/\/ BRAIN START[^\n]*\n([\s\S]*?)\/\/ BRAIN END/);
if (!m) { console.error('BRAIN markers not found'); process.exit(2); }
// eslint-disable-next-line no-new-func
const makeBrain = new Function('KB', 'SITE', m[1] + '\nreturn { answer: offlineAnswer };');

let pass = 0;
const fails = [];
for (const [site, q, expect] of CASES) {
  const a = makeBrain(KB, site).answer(q);
  const low = a.toLowerCase();
  // A correct fact buried in a wall of text isn't an answer: cap the length.
  const ok = expect.every(e => low.includes(e.toLowerCase())) && a.length <= 520;
  if (ok) pass++; else fails.push({ site, q, expect, a });
}
for (const f of fails) console.log(`✗ [${f.site}] ${f.q}\n    want: ${f.expect.join(' + ')}\n    got:  ${f.a.replace(/\n+/g, ' ⏎ ').slice(0, 220)}\n`);
console.log(`${pass}/${CASES.length} correct (${Math.round(pass / CASES.length * 100)}%)`);
process.exitCode = fails.length ? 1 : 0;
