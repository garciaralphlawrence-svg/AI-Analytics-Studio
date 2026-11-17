// Realistic visitor questions for Kapitan's free (offline) mode.
// expect: every string must appear in the answer (case-insensitive).
// Phrased the way real visitors type — short, sloppy, Taglish — not copied from the FAQ.
export const CASES = [
  // ---- portfolio (hub: knows every site) ----
  ['portfolio', 'what is kmm travel', ['philippine']],
  ['portfolio', 'what websites did ralph make', ['spc studio', 'caresight']],
  ['portfolio', 'how can I contact ralph', ['contact']],
  ['portfolio', 'what is caresight?', ['readmi']],
  ['portfolio', "what's islakeys", ['propert']],
  ['portfolio', 'tell me about bizbuddy', ['virtual assistant']],
  ['portfolio', 'how much is boracay', ['12,500']],
  ['portfolio', 'what is the resibo maker', ['receipt']],
  ['portfolio', 'what is spc studio', ['control']],
  ['portfolio', 'what is future minds academy', ['school']],
  ['portfolio', 'what can you do', ['ask']],

  // ---- KMM Travel ----
  ['kmm', 'How much is Boracay?', ['12,500']],
  ['kmm', 'magkano ang palawan', ['18,000']],
  ['kmm', 'price of siargao package', ['19,500']],
  ['kmm', 'what packages do you offer', ['boracay', 'siargao', 'baguio']],
  ['kmm', 'how do discounts work', ['35%']],
  ['kmm', 'is there a group discount?', ['10%']],
  ['kmm', 'how do I book', ['book now']],
  ['kmm', 'paano mag book', ['book now']],
  ['kmm', 'contact number', ['961']],
  ['kmm', 'whats your email', ['kmm.knowmemore']],
  ['kmm', 'do you do international tours', ['international']],
  ['kmm', 'cheapest package', ['baguio', '7,000']],
  ['kmm', 'who is the founder', ['km reyes']],
  ['kmm', 'how many nights is the cebu tour', ['3 nights']],
  ['kmm', 'are you DOT accredited', ['dot']],
  ['kmm', 'can you plan a custom trip for us', ['concierge']],
  ['kmm', 'ilocos tour price', ['11,200']],
  ['kmm', 'where are you located', ['metro manila']],
  ['kmm', 'do you have el nido', ['palawan']],
  ['kmm', 'what is the best time to travel discount', ['april']],

  // ---- IslaKeys ----
  ['islakeys', 'can foreigners buy property', ['40%']],
  ['islakeys', 'demo login', ['login']],
  ['islakeys', 'what can brokers do', ['lead']],
  ['islakeys', 'what properties do you have', ['tagaytay']],
  ['islakeys', 'contact email', ['hello@islakeys']],
  ['islakeys', 'are your brokers licensed', ['prc']],
  ['islakeys', 'what areas do you cover', ['bgc']],
  ['islakeys', 'how do i sign up', ['client', 'broker']],

  // ---- Biz Buddy ----
  ['bizbuddy', 'how do I become a VA', ['6 months']],
  ['bizbuddy', 'what are the requirements', ['laptop']],
  ['bizbuddy', 'what can a VA do for me', ['calendar']],
  ['bizbuddy', 'how much does it cost', ['hello@bizbuddy']],
  ['bizbuddy', 'how do I try the demo', ['demo']],
  ['bizbuddy', 'how many VAs do you have', ['520']],
  ['bizbuddy', 'where are your offices', ['new york']],

  // ---- AI Analytics Studio ----
  ['studio', 'is my data safe', ['never uploaded']],
  ['studio', 'what files can I upload', ['csv']],
  ['studio', 'how many rows can it handle', ['20,000']],
  ['studio', 'what sample datasets are there', ['coffee']],
  ['studio', 'can I export to pdf', ['pdf']],
  ['studio', 'do I need an api key', ['free']],
  ['studio', 'how does this work', ['dashboard']],
  ['studio', 'what questions can i ask my data', ['revenue']],

  // ---- AI Resibo Maker ----
  ['resibo', 'does it compute senior discount', ['20%']],
  ['resibo', 'is this a BIR official receipt', ['not a bir']],
  ['resibo', 'can it scan a paper receipt', ['photo']],
  ['resibo', 'how do I make a receipt', ['describe']],
  ['resibo', 'what payment methods', ['gcash']],
  ['resibo', 'how is vat computed', ['12%']],
  ['resibo', 'pwd discount', ['20%']],

  // ---- SPC Studio ----
  ['spc', 'what is cpk', ['1.33']],
  ['spc', 'what are the control chart rules', ['8 points']],
  ['spc', 'can i upload excel', ['your data']],
  ['spc', 'what is pareto', ['80%']],
  ['spc', 'what charts are available', ['i-mr']],
  ['spc', 'normality test', ['anderson']],

  // ---- CareSight ----
  ['caresight', 'is this real patient data', ['synthetic']],
  ['caresight', 'how accurate are the models', ['0.79']],
  ['caresight', 'what does caresight do', ['readmitted']],
  ['caresight', 'how does the forecast work', ['holt-winters']],
  ['caresight', 'can i upload my own excel', ['your data']],
  ['caresight', 'how to reduce no shows', ['sms']],

  // ---- cross-site + edge cases ----
  ['kmm', 'what is islakeys', ['propert']],
  ['caresight', 'how much is the boracay package', ['12,500']],
  ['kmm', 'hello', ['kapitan']],
  ['kmm', "what's the weather tomorrow", ["not sure"]],
  ['studio', 'who won the nba finals', ["not sure"]],
  ['bizbuddy', 'thanks!', ['welcome']],
];
