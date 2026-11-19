// Prints Kapitan's answers for a broad set of visitor questions on every site,
// including off-topic and other-site questions, so bad answers are easy to spot.
// Run: node scripts/kapitan-probe.mjs [site]
import { readFileSync, existsSync } from 'node:fs';
import vm from 'node:vm';

const root = new URL('..', import.meta.url);
const widget = readFileSync(new URL('public/widget/kapitan.js', root), 'utf8');
const brainSrc = widget.match(/\/\/ BRAIN START[^\n]*\n([\s\S]*?)\/\/ BRAIN END/)[1];
const makeBrain = new Function('KB', 'SITE', brainSrc + '\nreturn { answer: offlineAnswer };');
const SHARED = JSON.parse(readFileSync(new URL('public/widget/kb.json', root), 'utf8'));

// Sites whose page builds its own window.KAPITAN_KB
function pageKB(files, href) {
  const ctx = { window: {}, location: { href }, console };
  ctx.window.location = ctx.location;
  vm.createContext(ctx);
  for (const f of files) vm.runInContext(readFileSync(f, 'utf8').replace(/\bwindow\.SITE\b/g, 'window.SITE'), ctx);
  return ctx.window.KAPITAN_KB;
}
const P = 'C:/Users/Lenovo/Desktop/Projects/';
const KBS = { comedian: null, likha: null };
if (existsSync(P + 'Comedian-Site/kapitan-kb.js')) KBS.comedian = pageKB([P + 'Comedian-Site/data.js', P + 'Comedian-Site/kapitan-kb.js'], 'https://x.github.io/Comedian-Demo/');
if (existsSync(P + 'Likha-Studio/kapitan-kb.js')) KBS.likha = pageKB([P + 'Likha-Studio/kapitan-kb.js'], 'https://x.github.io/Likha-Studio/');

export const OFF_TOPIC = [
  'what is the weather today', 'who is the president of the philippines', 'give me a recipe for adobo', 'tell me a joke',
  'what is 2 + 2', 'what is the capital of france', 'who won the nba finals', 'write my essay about climate change',
  'translate hello to spanish', 'how much is bitcoin', 'can you give me love advice', 'what is my horoscope',
  'recommend a good movie', 'how do i lose weight', 'what time is it', 'can you write python code for me',
  'what is chatgpt', 'what is the best phone to buy', 'how much is a big mac', 'where is the nearest hospital',
  'paano magluto ng sinigang', 'sino ang presidente ng pilipinas', 'ano ang panahon bukas', 'how to fix my car',
  'is it going to rain', 'what are the symptoms of dengue', 'how do i apply for a passport', 'best tourist spots in japan',
  'how much is a house in manila', 'can you help me with my homework', 'how old are you', 'do you like pizza',
  // second batch (written after the first round of fixes, to check it generalises)
  'who is taylor swift', 'how many planets are there', 'what should i eat for dinner', 'how do i get a girlfriend', 'what is the meaning of life',
  'kailan ang pasko', 'magkano ang bigas ngayon', 'how to make money online', 'what is the exchange rate of dollar to peso', 'who invented the telephone',
  'how tall is mount everest', 'what language do they speak in brazil', 'sing me a song', 'are you a robot', 'what is your favorite color',
  'how do i reset my facebook password', 'where can i buy shoes', 'how many calories in rice', 'what is the speed of light', 'teach me english',
  'what happened in world war 2', 'how do i cure a headache', 'recommend a laptop for gaming', 'who is the richest man', 'ano ang ulam natin',
  'what day is it today', 'how to grow tomatoes', 'explain quantum physics', 'how do i open a bank account', 'what is the population of cebu',
];
export const ON_TOPIC = {
  portfolio: ['what does ralph do', 'what projects has he built', 'is he available for hire', 'what skills does ralph have', 'where did ralph study', 'did ralph give a talk', 'how do i contact him', 'what is caresight', 'can he build a website for me', 'what programming languages does he know'],
  studio: ['how does this work', 'can i upload excel', 'is my data safe', 'is it free', 'what charts can it make', 'what files are supported', 'do i need to sign up', 'can it forecast'],
  resibo: ['how do i make a receipt', 'does it compute vat', 'senior citizen discount', 'can i print the receipt', 'is it free', 'can i type in tagalog'],
  spc: ['what is spc', 'what is cpk', 'can i upload my data', 'what charts are available', 'what are western electric rules', 'is it free'],
  caresight: ['what does caresight do', 'is this real patient data', 'how accurate is the model', 'what is readmission', 'can i upload my own data', 'how does the forecast work'],
  kmm: ['what tour packages do you have', 'how much is the palawan tour', 'how do i book', 'where is your office', 'do you have promos', 'how can i contact you', 'is boracay available', 'can foreigners join'],
  islakeys: ['what is islakeys', 'can foreigners buy property', 'how do i contact a broker', 'what properties do you have', 'how do i sign up', 'are there fees'],
  bizbuddy: ['what is bizbuddy', 'how much is a va', 'how do i hire a va', 'how do i become a va', 'what tasks can a va do', 'is it safe'],
  comedian: ['when is the next show', 'how much are tickets', 'where is the venue', 'who is joseph', 'how do i book him', 'what time does the show start', 'magkano ticket', 'saan ang venue', 'is there parking', 'who else is performing'],
  likha: ['how much is a website', 'do i pay monthly', 'how long does it take', 'what is k-hub', 'can you make a qr feedback system', 'who is ralph', 'how do i contact you', 'do you have a school system'],
};
const OTHER_SITE = {
  kmm: ['what is caresight', 'how does spc studio work', 'how much is a va on bizbuddy'],
  islakeys: ['what tour packages does kmm have', 'what is the resibo maker'],
  bizbuddy: ['can foreigners buy property on islakeys', 'what is cpk'],
  caresight: ['how much is the palawan tour', 'how do i hire a va'],
  spc: ['what tours do you have', 'can foreigners buy property'],
  studio: ['how do i book a tour', 'how do i become a va'],
  resibo: ['what properties are available', 'what is readmission'],
};

const only = process.argv[2];
const sites = ['portfolio', 'studio', 'resibo', 'spc', 'caresight', 'kmm', 'islakeys', 'bizbuddy', 'comedian', 'likha'].filter(s => !only || s === only);
const short = a => a.replace(/\s+/g, ' ').slice(0, 150);
const declined = a => /not sure|only (help|answer)|can only|outside what|not something i/i.test(a);
let offBad = 0, offTotal = 0, otherBad = 0, otherTotal = 0;
for (const site of sites) {
  const KB = KBS[site] || SHARED;
  const brain = makeBrain(KB, site);
  console.log(`\n================ ${site.toUpperCase()} ================`);
  console.log('-- on topic --');
  for (const q of ON_TOPIC[site] || []) console.log(`  ${declined(brain.answer(q)) ? '?' : ' '} ${q}\n      → ${short(brain.answer(q))}`);
  console.log('-- off topic (should decline) --');
  for (const q of OFF_TOPIC) { offTotal++; const a = brain.answer(q); if (!declined(a)) { offBad++; console.log(`  ✗ ${q}\n      → ${short(a)}`); } }
  if (OTHER_SITE[site]) {
    console.log('-- other sites (should decline on this site) --');
    for (const q of OTHER_SITE[site]) { otherTotal++; const a = brain.answer(q); if (!declined(a)) { otherBad++; console.log(`  ✗ ${q}\n      → ${short(a)}`); } }
  }
}
console.log(`\nOff-topic answered wrongly: ${offBad}/${offTotal}   Other-site answered: ${otherBad}/${otherTotal}`);
