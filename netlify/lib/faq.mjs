// Curated Q&A for Kapitan's free mode (and extra context for the AI mode).
// Each entry: q = ways visitors ask it, a = the short, direct answer.
// The FIRST entry of every site must be its "what is it" answer — used when a
// visitor names a site without a clear question.
// Kapitan answers badly? Add/adjust an entry here, then:
//   npm run build:kb && npm run test:kapitan
const P = 'https://garciaralphlawrence-svg.github.io';

// How visitors refer to each site (matched as whole words).
export const ALIASES = {
  portfolio: ['portfolio', 'ralph'],
  studio: ['analytics studio', 'ai analytics', 'studio'],
  resibo: ['resibo', 'receipt maker', 'resibo maker'],
  spc: ['spc'],
  caresight: ['caresight', 'care sight'],
  kmm: ['kmm', 'know me more', 'kmm travel'],
  islakeys: ['islakeys', 'isla keys'],
  bizbuddy: ['bizbuddy', 'biz buddy'],
  fma: ['fma', 'future minds'],
};

export const FAQ = {
  portfolio: [
    { q: ['what is the portfolio', 'who is ralph'], a: `This is Ralph Garcia's portfolio — it showcases the websites and apps he has built, with screenshots and live links. [Open the portfolio](${P}/Ralph-Portfolio/)` },
    { q: ['what websites did ralph make', 'what projects', 'list of websites', 'what sites are here', 'what apps did he build', 'what websites'], a: "Ralph's websites:\n- **SPC Studio** — statistical process control / Six Sigma\n- **CareSight** — predictive hospital analytics\n- **AI Analytics Studio** — instant dashboards from Excel\n- **AI Resibo Maker** — Philippine receipts with VAT\n- **KMM Travel Co.** — Philippine tour packages\n- **IslaKeys** — property advisory\n- **Biz Buddy** — virtual assistant marketplace\n- **Future Minds Academy** — school website" },
    { q: ['latest talk', 'speaker', 'speaking', 'fuse', 'human behind the machine', 'did ralph give a talk', 'seminar', 'keynote', 'foundation for upgrading the standard of education'], a: `Ralph's latest talk is **"The Human Behind the Machine"**, given as an invited speaker at **FUSE (Foundation for Upgrading the Standard of Education)**. He spoke with educators about AI: what it can already do, what it changes about our work, and why people still matter — "The machine didn't decide which problem to solve. A person did." He received a Certificate of Appreciation. [See the photos](${P}/Ralph-Portfolio/#talk)` },
    { q: ['how to contact ralph', 'contact', 'hire ralph', 'email ralph', 'get in touch', 'message ralph'], a: `You can reach Ralph through the [contact form](${P}/Ralph-Portfolio/#contact) on his portfolio.` },
    { q: ['can you build me a website', 'how much for a website', 'website for my business', 'i need a website'], a: `Yes — Ralph builds websites and web apps like these. Send your idea through the [contact form](${P}/Ralph-Portfolio/#contact) and he'll get back to you.` },
  ],

  studio: [
    { q: ['what is ai analytics studio', 'what does it do', 'what is this'], a: `**AI Analytics Studio** turns any Excel or CSV file into an interactive dashboard in seconds — KPI cards, trends, breakdowns — and a Smart Analyst lists the key insights. Free, no account needed. [Open it](${P}/AI-Analytics-Studio/)` },
    { q: ['how does this work', 'how do i use it', 'how to start', 'how does it work'], a: 'Upload an Excel (.xlsx/.xls) or CSV file — or pick a sample dataset — and the dashboard builds itself from the columns it detects. Then type questions in "Ask your data" to get exact numbers and charts.' },
    { q: ['is my data safe', 'privacy', 'is it secure', 'where is my data stored', 'do you keep my data'], a: 'Yes — your file is read and analysed entirely in your browser. It is **never uploaded** to a server and nothing is stored.' },
    { q: ['what files can i upload', 'file types', 'supported formats', 'upload excel csv'], a: 'Excel (.xlsx, .xls) and CSV files, up to **20,000 rows** and 60 columns.' },
    { q: ['how many rows', 'file size limit', 'how big can the file be', 'maximum rows'], a: 'Up to **20,000 rows** and 60 columns per file.' },
    { q: ['sample datasets', 'try a sample', 'demo data', 'example data'], a: 'Sample datasets: **Coffee shop sales**, Philippine real-estate listings, Travel bookings and School enrollment. Pick one on the home screen to see a full dashboard instantly.' },
    { q: ['export pdf', 'print the dashboard', 'download dashboard', 'save dashboard'], a: "Yes — export the dashboard to **PDF** or print it, and download any chart's data as CSV. There's also a presentation mode." },
    { q: ['do i need an api key', 'is it free', 'do i need an account', 'cost', 'price'], a: "It's **free** — no account and no API key needed. Everything runs in your browser." },
    { q: ['what questions can i ask my data', 'ask your data', 'examples of questions', 'how to ask questions'], a: 'Examples: "Which branch has the highest revenue?", "Best month for sales?", "Average rating by channel", "Forecast next month\'s revenue", "What drives rating?", "Are there missing values?". Every number is computed on the full dataset.' },
    { q: ['what insights', 'smart analyst', 'what does the analyst do'], a: 'The Smart Analyst checks every row and lists the key insights: who leads, growth or decline, the peak month, big gaps between groups, numbers that move together, and blank cells.' },
    { q: ['tech stack', 'what technology', 'how was it built'], a: 'Built with vanilla JavaScript, Apache ECharts, SheetJS and an in-browser query engine and analyst.' },
  ],

  resibo: [
    { q: ['what is the resibo maker', 'what is ai resibo maker', 'what does it do'], a: `**AI Resibo Maker** makes Philippine-style receipts: describe a sale in English, Filipino or Taglish and it fills in the items, prices, payment and VAT. Print, save as PDF or share. [Open it](${P}/AI-Analytics-Studio/receipts/)` },
    { q: ['how do i make a receipt', 'how to create a resibo', 'how does it work', 'paano gumawa ng resibo'], a: 'Describe the sale like you\'d tell a cashier — e.g. "2 spanish latte tig-165, 1 ensaymada 85, gcash, si Juan" — and it fills in the receipt. Check it, click **Issue** to number it, then print, save as PDF or share.' },
    { q: ['senior discount', 'senior citizen discount', 'pwd discount', 'osca'], a: 'Yes. Senior Citizen and PWD discounts follow the law: VAT is removed first, then **20%** off. Example: ₱750 → less VAT ₱80.36 → ₱669.64 → less 20% ₱133.93 → **₱535.71** due. The receipt has a line for the OSCA/PWD ID and signature.' },
    { q: ['is this a bir official receipt', 'bir', 'official receipt', 'sales invoice', 'is it legal'], a: '**Not a BIR** Official Receipt or Sales Invoice — those require a BIR Authority to Print or an accredited POS. Use it for acknowledgement receipts and record-keeping.' },
    { q: ['scan a paper receipt', 'receipt scanner', 'take a photo of a receipt', 'expense'], a: 'Yes — take a **photo** of any paper receipt and it reads the merchant, date, items, VAT and total into an expense record for you to review.' },
    { q: ['payment methods', 'gcash', 'maya', 'card payment', 'how can customers pay'], a: 'Payment methods: Cash (with change computed), **GCash**, Maya, Card and Bank Transfer.' },
    { q: ['how is vat computed', 'vat', 'vatable sales', 'tax', 'non vat'], a: 'Prices are VAT-inclusive (**12%**). Example: ₱415 sale → VATable Sales ₱370.54 + VAT ₱44.46. Non-VAT businesses can turn VAT off in Business settings.' },
    { q: ['print receipt', 'save as pdf', 'share receipt'], a: 'Print it or save as PDF (80mm receipt layout), download it as an image, or share it from your phone.' },
    { q: ['analyze my sales', 'sales dashboard', 'connect to analytics studio'], a: '"Analyze my sales with AI" sends all issued receipts to AI Analytics Studio, which builds a sales dashboard automatically.' },
  ],

  spc: [
    { q: ['what is spc studio', 'what is spc', 'what does it do', 'statistical process control'], a: `**SPC Studio** does Statistical Process Control in the browser: control charts (is the process stable?), capability Cp/Cpk (does it meet spec?) and Pareto (what to fix first). [Open it](${P}/SPC-Studio/)` },
    { q: ['what is cpk', 'cpk', 'process capability', 'cp cpk pp ppk', 'is my process capable'], a: 'Cpk measures how well a process fits inside its spec limits, using within-subgroup variation. Rule of thumb: **Cpk ≥ 1.33** capable, 1.00–1.33 marginal, below 1.00 not capable. Pp/Ppk use overall variation instead.' },
    { q: ['control chart rules', 'western electric rules', 'signals', 'out of control'], a: 'Signal rules: 1) a point beyond 3σ; 2) 2 of 3 beyond 2σ on one side; 3) 4 of 5 beyond 1σ on one side; 4) **8 points** in a row on one side of the centre; 5) 6 points steadily rising or falling.' },
    { q: ['upload excel', 'my own data', 'import csv', 'your data'], a: 'Yes — use the **Your Data** tab to upload Excel or CSV. It picks the right chart, reads LSL/USL/Target columns automatically, and the file never leaves your browser. Templates are downloadable.' },
    { q: ['what is pareto', 'pareto chart', 'what to fix first'], a: 'The Pareto chart ranks problem categories and highlights the vital few that make up about **80%** of the problem — fix those first.' },
    { q: ['what charts are available', 'chart types', 'which control charts', 'imr xbar p chart'], a: 'Control charts: **I-MR** (individual values), X̄-R (subgroups of 2–10) and p chart (proportion defective). Plus capability, normality and Pareto.' },
    { q: ['normality test', 'normal distribution', 'anderson darling'], a: '**Anderson-Darling** test with a normal probability plot. If p < 0.05, treat the PPM estimates with caution.' },
    { q: ['sigma level', 'ppm', 'defects per million', 'z bench'], a: 'It shows expected and observed defects per million (PPM), Z.bench and the sigma level (Z.bench + 1.5 shift).' },
    { q: ['is it accurate', 'validated', 'verified calculations'], a: 'The calculations were checked against SciPy. The demo data (lab turnaround, bottle fill, documentation errors, complaints) is synthetic.' },
  ],

  caresight: [
    { q: ['what does caresight do', 'what is caresight', 'what is this'], a: `**CareSight** predicts which discharged patients are likely to be **readmitted** within 30 days, which appointments will be no-shows, and forecasts daily admissions for the next 30 days. [Open it](${P}/CareSight/)` },
    { q: ['is this real patient data', 'real data', 'patient privacy', 'fake data'], a: "No — all records are **synthetic** (fake but realistic). It's a portfolio demo, not a medical device, and everything runs in the browser." },
    { q: ['how accurate are the models', 'accuracy', 'auc', 'model performance'], a: 'AUC is about **0.79** for readmission and 0.75 for no-shows, tested on 20% held-out data.' },
    { q: ['what model', 'machine learning', 'algorithm', 'random forest', 'logistic regression'], a: 'It trains a Logistic Regression and a 30-tree Random Forest in your browser (80% train / 20% test) and uses whichever has the higher AUC.' },
    { q: ['how does the forecast work', 'forecast', 'admissions forecast', 'predict volume'], a: 'Daily admissions are forecast with **Holt-Winters** exponential smoothing (trend + weekly pattern) with a 95% range, backtested at about 9% average error.' },
    { q: ['upload my own excel', 'my own data', 'import data', 'your data'], a: "Yes — on the **Your Data** tab upload Excel or CSV (readmissions, no-shows or daily admissions) and CareSight retrains on it. Column names don't need to match exactly and the file never leaves your browser." },
    { q: ['reduce no shows', 'no show', 'missed appointments'], a: '**SMS** reminders and shorter booking lead times reduce no-shows the most. Other factors: previous no-shows, distance, clinic, day and time slot.' },
    { q: ['readmission risk factors', 'what drives readmission', 'reduce readmission'], a: 'Biggest readmission drivers: prior admissions, number of medications, age and length of stay. Booking a follow-up visit lowers risk.' },
    { q: ['what if simulator', 'simulate a patient'], a: "The What-If Simulator lets you change a patient's details and see the predicted risk, the reasons, and actions that would lower it." },
  ],

  kmm: [
    { q: ['what is kmm travel', 'what is kmm', 'who are you', 'about kmm'], a: `**KMM Travel Co.** ("Know Me More") offers premium, personalised Philippine tours — DOT accredited, founded by KM Reyes. Custom international trips on request. [See packages](${P}/KMM/#packages)` },
    { q: ['what packages do you offer', 'tour packages', 'destinations', 'list of tours', 'anong packages'], a: 'Tour packages (per person):\n- **Boracay** Getaway — ₱12,500, 3 nights\n- **Palawan** Adventure — ₱18,000, 4 nights\n- **Baguio** City Escape — ₱7,000, 2 nights\n- **Cebu** & Moalboal — ₱15,800, 3 nights\n- **Siargao** Surf & Soul — ₱19,500, 4 nights\n- **Ilocos** Heritage Tour — ₱11,200, 3 nights' },
    { q: ['boracay price', 'boracay package'], a: '**Boracay Getaway** — ₱12,500 per person, 3 nights, with a White Beach sunset cruise. Our bestseller!' },
    { q: ['palawan price', 'palawan package', 'el nido', 'underground river'], a: '**Palawan Adventure** — ₱18,000 per person, 4 nights: Underground River & El Nido. Top rated!' },
    { q: ['baguio price', 'baguio package'], a: '**Baguio City Escape** — ₱7,000 per person, 2 nights in the cool mountain city.' },
    { q: ['cebu price', 'cebu package', 'moalboal', 'whale shark'], a: '**Cebu & Moalboal** — ₱15,800 per person, 3 nights: whale sharks & the sardine run.' },
    { q: ['siargao price', 'siargao package', 'surf', 'cloud 9'], a: '**Siargao Surf & Soul** — ₱19,500 per person, 4 nights: Cloud 9 & Sugba Lagoon. Most loved!' },
    { q: ['ilocos price', 'ilocos package', 'vigan', 'sand dunes'], a: '**Ilocos Heritage Tour** — ₱11,200 per person, 3 nights: Vigan & the sand dunes.' },
    { q: ['cheapest package', 'cheapest', 'budget tour', 'affordable'], a: 'Our most affordable is the **Baguio City Escape** — ₱7,000 per person, 2 nights.' },
    { q: ['how do discounts work', 'discount', 'promo', 'group discount', 'barkada discount'], a: 'Discounts combine (max **35%** of the total):\n- 5% for 3–4 travellers, **10% for 5+**\n- 2% per extra night beyond the package\n- 8% for travel dates April–October' },
    { q: ['best time to travel', 'off season', 'season discount', 'when is cheaper'], a: 'Travel dates **April–October** get an extra 8% off (stacks with group and extra-night discounts, up to 35%).' },
    { q: ['how do i book', 'booking', 'reserve', 'paano mag book', 'book a tour'], a: 'Pick a package in Popular Destinations, adjust the nights, click **Book Now**, log in, choose travellers and a date, then confirm.' },
    { q: ['custom trip', 'plan a trip for us', 'personalized tour', 'concierge', 'tailor made'], a: `Yes! Fill in the **KMM Concierge** Form ("Let's Talk") with your destination, group, budget and preferences, and a travel specialist emails you. [Custom trip form](${P}/KMM/#contact)` },
    { q: ['contact number', 'phone', 'email', 'contact', 'facebook', 'instagram', 'how to reach you'], a: 'Phone: **+63 961 442 6785** · Email: **kmm.knowmemore@gmail.com** · Facebook: facebook.com/kmmtravelco · Instagram: @kmmtravel_co' },
    { q: ['where are you located', 'office', 'address', 'location'], a: "We're based in **Metro Manila**, PH. Reach us at +63 961 442 6785 or kmm.knowmemore@gmail.com." },
    { q: ['international tours', 'abroad', 'outside the philippines', 'japan', 'korea', 'europe'], a: 'Our packages are Philippines-only, but we customise **international** tours (Asia, Europe, Oceania) on request — use the Concierge Form.' },
    { q: ['who is the founder', 'owner', 'ceo', 'who runs kmm'], a: 'KMM Travel Co. was founded by **KM Reyes**, founder & CEO.' },
    { q: ['are you dot accredited', 'accredited', 'legit', 'licensed'], a: 'Yes — KMM Travel Co. is **DOT** accredited, follows eco-friendly practices and partners with local guides.' },
    { q: ['other destinations', 'bohol', 'coron', 'batanes', 'siquijor', 'banaue'], a: 'Beyond our packages, we can arrange El Nido, Coron, Chocolate Hills (Bohol), Mayon, Mount Pulag, Banaue, Batanes, Siquijor and more — ask via the Concierge Form.' },
  ],

  islakeys: [
    { q: ['what is islakeys', 'about islakeys', 'what do you do'], a: `**IslaKeys** is a Philippine luxury property advisory that matches buyers — including foreigners — with verified, PRC-licensed brokers. [Visit IslaKeys](${P}/IslaKeys/)` },
    { q: ['can foreigners buy property', 'foreigner', 'foreign buyer', 'own land'], a: "Foreigners generally can't own land in the Philippines, but can own condo units within the **40%** foreign-ownership limit of a condo project. Confirm with a licensed broker or lawyer." },
    { q: ['demo login', 'demo account', 'try the portal', 'log in as demo', 'test account'], a: `Ready-made demo accounts (client, broker, admin) are shown on the [Login page](${P}/IslaKeys/login.html) — try every portal without signing up.` },
    { q: ['what can brokers do', 'broker portal', 'for brokers'], a: 'The Broker portal has a **lead** queue of buyer inquiries, a listing manager with inquiry counts, a compliance checklist (PRC, DHSUD, CPD) and follow-up notes.' },
    { q: ['client dashboard', 'what can buyers do', 'for clients'], a: 'Clients can save listings, send inquiries to brokers, see replies, and track their application: verified → profile → viewing → reservation & due diligence.' },
    { q: ['what properties do you have', 'featured properties', 'listings', 'condo', 'house'], a: 'Featured: Makati Luxury Condo, BGC Skyline Condo, **Tagaytay** Villa (lake views), Palawan Beach House and Cebu Ocean Condo.' },
    { q: ['contact email', 'contact', 'phone', 'how to reach'], a: 'Email **hello@islakeys.ph** · Phone +63 (2) 1234 5678.' },
    { q: ['are brokers licensed', 'verified brokers', 'legit'], a: 'Yes — transactions are handled by verified, **PRC**-licensed brokers. IslaKeys is a facilitation service, not legal advice.' },
    { q: ['what areas do you cover', 'locations', 'where are you'], a: 'Makati, **BGC**, Cebu, Tagaytay and coastal investment areas.' },
    { q: ['how do i sign up', 'register', 'create account'], a: 'Sign up as a **Client** or **Broker** on the Login page. You can add preferences: property type, budget (₱1M–₱10M+), location and purpose (buy, rent, invest).' },
  ],

  bizbuddy: [
    { q: ['what is biz buddy', 'about bizbuddy', 'what do you do'], a: `**Biz Buddy** places top 1% vetted **virtual assistant**s with executive leaders — 520+ VAs, 1.2k clients, 98% retention. [Visit Biz Buddy](${P}/BizBuddy/)` },
    { q: ['how do i become a va', 'apply as va', 'join as virtual assistant', 'work as va', 'become a partner'], a: 'Sign up as a VA with your CV/portfolio links. Requirements: reliable laptop and stable internet, at least **6 months** of VA/admin experience preferred, strong written English, and confidentiality and responsiveness.' },
    { q: ['va requirements', 'requirements', 'qualifications'], a: 'VA requirements: reliable **laptop** and stable internet with a professional setup, 6+ months VA/admin/operations experience preferred, strong written English, confidentiality and time discipline.' },
    { q: ['what can a va do', 'services', 'capabilities', 'what tasks'], a: 'Our VAs handle **calendar** & travel management, email & communications, reporting & dashboards, stakeholder management, presentations & proposals, and operations & vendor coordination.' },
    { q: ['how much does it cost', 'pricing', 'rates', 'hourly rate', 'price'], a: 'Pricing depends on the VA and scope — each VA sets an hourly rate on their profile. For a quote, email **hello@bizbuddy.com** or call +1 (212) 555 9800.' },
    { q: ['how do i try the demo', 'demo login', 'demo account', 'test account'], a: `Ready-made **demo** logins (client, VA, admin) are in the login box on the [Biz Buddy site](${P}/BizBuddy/). Data saves in your browser; use "Reset demo data" to start over.` },
    { q: ['how many vas', 'how big', 'statistics', 'how many clients'], a: '**520+** vetted VAs, 1.2k clients and 98% retention.' },
    { q: ['where are your offices', 'office', 'location', 'address'], a: 'Offices in **New York** and London, plus remote.' },
    { q: ['contact', 'email', 'phone'], a: 'Email **hello@bizbuddy.com** · Phone +1 (212) 555 9800.' },
    { q: ['how do i hire a va', 'post a task', 'for clients'], a: 'Sign up as a client, post a task (title, budget, category), accept applicants, chat, then release payment and rate the VA. You can also browse "Find a VA" and invite them directly.' },
  ],

  fma: [
    { q: ['what is future minds academy', 'what is fma', 'school'], a: '**Future Minds Academy** is a private Kindergarten–Grade 6 school in Mandaluyong City. [futuremindsacademyph.com](https://futuremindsacademyph.com/)' },
    { q: ['fma address', 'where is fma', 'fma contact'], a: 'Future Minds Academy: 650 Ma. Isabel Bldg., Boni Ave., Brgy. Plainview, Mandaluyong City · (02) 7949-7084 · Mon–Fri 8 AM–5 PM.' },
    { q: ['enroll at fma', 'fma admission', 'apply to fma'], a: 'Apply online: [futuremindsacademyph.com/apply](https://futuremindsacademyph.com/apply)' },
  ],
};
