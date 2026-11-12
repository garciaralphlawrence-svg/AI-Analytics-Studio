// What Kapitan knows. One source of truth for:
//   - the Claude system prompt (KNOWLEDGE, built from SITES below)
//   - the widget's offline answers (scripts/build-kb.mjs writes public/widget/kb.json)
// Keep facts here in sync with the real sites. URLs are the live Netlify addresses.

export const SITES = {
  portfolio: {
    name: "Ralph Garcia — Portfolio",
    url: "https://garciaralphlawrence-svg.github.io/Ralph-Portfolio/",
    greeting: "Hi! I'm Kapitan 👋 Ask me about any of these websites.",
    suggestions: ["What is AI Analytics Studio?", "What is KMM Travel?", "What is IslaKeys?", "What is BizBuddy?"],
    facts: `
Portfolio website by Ralph Garcia showing his projects with screenshots and links to each live website. Contact form on the portfolio: [Contact](https://garciaralphlawrence-svg.github.io/Ralph-Portfolio/#contact)
Websites on the portfolio: SPC Studio (statistical process control / Six Sigma), CareSight (predictive hospital analytics), AI Analytics Studio, AI Resibo Maker, KMM Travel Co., IslaKeys, Biz Buddy and Future Minds Academy.`,
  },

  studio: {
    name: "AI Analytics Studio",
    url: "https://garciaralphlawrence-svg.github.io/AI-Analytics-Studio/",
    greeting: "Hi! I'm Kapitan 👋 Drop in a spreadsheet and I'll build the dashboard — or ask me how it works.",
    suggestions: ["How does this work?", "Is my data safe?", "What files can I upload?", "Try a sample dataset"],
    facts: `
AI Analytics Studio — built by Ralph Garcia. Upload any Excel (.xlsx/.xls) or CSV file, or pick a sample dataset, and it instantly builds an interactive dashboard: KPI cards, trend lines, category breakdowns and a data table, all generated automatically from the column types it detects (numbers, dates, categories, text).
Then the Smart Analyst panel checks every row and lists the key insights: who leads, growth or decline over time, the peak month, big gaps between groups, numbers that move together, and blank cells. It runs entirely in your browser, is free, and needs no account or API key.
"Ask your data": type a question in plain English and the analyst answers with exact numbers and a chart you can pin to the dashboard. Examples: "Which branch has the highest revenue?", "What was the best month for sales?", "Average rating by channel", "Total revenue for Makati", "How many bookings in Boracay?", "Forecast next month's revenue", "What drives rating?", "Are there missing values?", "What are the 3 most surprising findings?". Every number is computed on the full dataset, never guessed from a sample.
Privacy & data safety (is my data safe or secure?): files are read and analysed entirely in your browser. Your data is never uploaded to a server and nothing is stored. Up to 20,000 rows and 60 columns.
Sample datasets: Coffee shop sales, Philippine real-estate listings, Travel bookings, School enrollment.
Extras: dark/light theme, presentation mode, export the dashboard to PDF/print, CSV download of any chart's data.
Tech: vanilla JavaScript, Apache ECharts, SheetJS, and an in-browser query engine and analyst.
It works together with the AI Resibo Maker (receipts): sales from the Resibo Maker open here as a dashboard with one click.
Open it: [AI Analytics Studio](https://garciaralphlawrence-svg.github.io/AI-Analytics-Studio/)`,
  },

  resibo: {
    name: "AI Resibo Maker",
    url: "https://garciaralphlawrence-svg.github.io/AI-Analytics-Studio/receipts/",
    greeting: "Hi! I'm Kapitan 🧾 Describe a sale and I'll help you make the resibo — or ask how it works.",
    suggestions: ["How do I make a receipt?", "Does it compute senior discount?", "Can it scan a paper receipt?", "Is this a BIR official receipt?"],
    facts: `
AI Resibo Maker (part of AI Analytics Studio, built by Ralph Garcia). Describe a sale the way you'd tell a cashier — typed or spoken, in English, Filipino or Taglish (e.g. "2 spanish latte tig-165, 1 ensaymada 85, gcash, si Juan") — and the AI fills in the receipt: customer, items, quantities, prices, payment method (Cash, GCash, Maya, Card, Bank Transfer), cash received and discounts. Everything stays editable before issuing.
Money and VAT are computed exactly by the app, not the AI. Prices are VAT-inclusive (12%). Like a standard Philippine receipt, it shows Total Sales (VAT Inclusive), TOTAL AMOUNT DUE, and a VAT breakdown: VATable Sales, VAT-Exempt Sales, Zero-Rated Sales and VAT Amount (12%). Example: ₱415 sale → VATable Sales ₱370.54 + VAT ₱44.46. VAT can be turned off in Business settings for non-VAT businesses. Senior Citizen and PWD discounts follow the law: VAT is removed first, then 20% off (e.g. ₱750 of items → Less VAT ₱80.36 → Net of VAT ₱669.64 → less 20% ₱133.93 → ₱535.71 due), and the receipt has a line for the OSCA/PWD ID and signature. Promo % discounts and change for cash payments are supported.
Issue the receipt to give it a number (e.g. KC-000001), then print it or save as PDF (80mm receipt layout), download it as an image, or share it from a phone. Business name, address, TIN, prefix and footer are set in Business settings.
Receipt scanner: take a photo of any paper receipt and the AI reads the merchant, date, items, VAT and total into an expense record for review.
"Analyze my sales with AI" sends all issued receipts to AI Analytics Studio, which builds a sales dashboard automatically (there's a "Load 160 sample receipts" button for demos). Scanned expenses can be analyzed the same way.
Not a BIR Official Receipt or Sales Invoice: those require a BIR Authority to Print or an accredited POS. Data is saved in the browser only.
Open it: [AI Resibo Maker](https://garciaralphlawrence-svg.github.io/AI-Analytics-Studio/receipts/)`,
  },

  spc: {
    name: "SPC Studio",
    url: "https://garciaralphlawrence-svg.github.io/SPC-Studio/",
    greeting: "Hi! I'm Kapitan 📈 Ask me what SPC is, how to read a control chart, or what Cpk means.",
    suggestions: ["What is SPC Studio?", "What is Cpk?", "What are the control chart rules?", "Can I upload my own Excel file?"],
    facts: `
SPC Studio — Statistical Process Control in the browser, built by Ralph Garcia. SPC (statistical process control) uses statistics to check whether a process is stable and whether it meets its specification. It answers three questions: Is it stable? (control charts) Is it capable? (Cp, Cpk, Pp, Ppk) What do we fix first? (Pareto).
Control charts: I-MR chart for individual values, X-bar R chart for subgroups of 2 to 10, and p chart for the proportion defective with varying sample sizes. Limits are the centre line plus or minus 3 sigma, using standard constants (d2, A2, D3, D4).
Signal rules (Western Electric rules plus a trend rule): 1) one point beyond 3 sigma; 2) 2 of 3 points beyond 2 sigma on the same side; 3) 4 of 5 points beyond 1 sigma on the same side; 4) 8 points in a row on the same side of the centre line; 5) 6 points in a row steadily increasing or decreasing. Each signal is explained in plain English, and improvements are marked "better than usual".
Capability: Cp and Cpk use within-subgroup sigma (what the process could do); Pp and Ppk use overall sigma (what it actually delivered); Cpm uses the target. It also shows expected and observed defects per million (PPM), Z.bench and the sigma level (Z.bench + 1.5 shift). Rule of thumb: Cpk of 1.33 or more is capable, 1.00 to 1.33 is marginal, below 1.00 is not capable. One-sided specs (only an upper or lower limit) are supported.
Normality: Anderson-Darling test with a normal probability plot; if p is below 0.05 the PPM estimates should be treated with caution.
Improvement what-if: sliders to move the average or reduce variation and see the new Ppk and defects per million, plus a one-click "centre on target".
Pareto: ranks categories and highlights the vital few that make up about 80% of the problem.
Your Data (upload): upload an Excel or CSV file on the Your Data tab. It guesses the right analysis and columns, reads LSL, USL and Target columns automatically, supports grouping by a column such as Hour or Batch, and can count raw rows for a Pareto. Templates can be downloaded. The file never leaves the browser.
Demo data: lab turnaround time, bottle fill volume, documentation errors and complaint categories — all synthetic. The calculations were checked against SciPy. Printing / saving as PDF is built in.
Open it: [SPC Studio](https://garciaralphlawrence-svg.github.io/SPC-Studio/)`,
  },

  caresight: {
    name: "CareSight",
    url: "https://garciaralphlawrence-svg.github.io/CareSight/",
    greeting: "Hi! I'm Kapitan 🩺 Ask me how CareSight predicts readmissions and no-shows, or how the forecast works.",
    suggestions: ["What does CareSight do?", "Can I upload my own Excel file?", "How accurate are the models?", "Is this real patient data?"],
    facts: `
CareSight — Predictive Hospital Analytics, built by Ralph Garcia. It predicts which discharged patients are likely to be readmitted within 30 days, which outpatient appointments are likely to be no-shows, and forecasts daily hospital admissions for the next 30 days.
Machine learning models: for each prediction it trains a Logistic Regression and a Random Forest (30 decision trees) right in the browser on 80% of the data and tests them on the other 20%; the model with the higher AUC is used. Accuracy (AUC): about 0.79 for readmission and 0.75 for no-shows. The decision threshold is tuned for the best F1 score.
Readmission risk factors used: age, length of stay, admissions in the past 12 months, ER visits, number of discharge medications, abnormal labs, heart failure, kidney disease, COPD, diabetes, hypertension, cancer, follow-up visit booked, department, payer and discharge disposition. The biggest drivers are prior admissions, number of medications, age and length of stay; booking a follow-up visit lowers risk.
No-show prediction uses days booked in advance, SMS reminder, previous no-shows, distance from the hospital, age, clinic, day of week, time slot, payer, new patient and rainy season. SMS reminders and shorter booking lead times reduce no-shows the most.
Volume forecast: daily admissions are forecast with Holt-Winters exponential smoothing (trend + weekly pattern), with a 95% range, checked by a 30-day backtest (about 9% average error). It also suggests how many admitting nurses each day needs.
Your Data (upload): upload your own Excel (.xlsx) or CSV file on the Your Data tab and CareSight retrains the models on it — readmission data (needs a Readmitted Within 30 Days Yes/No column), no-show data (needs a No-Show Yes/No column) or daily admissions (Date + Admissions). Column names don't need to match exactly, blanks are filled automatically, there are downloadable templates, and the file never leaves the browser.
What-If Simulator: change a patient's details (age, conditions, follow-up, medications) and see the predicted risk, the reasons behind it, and suggested actions that would lower it.
Data: all records are synthetic (fake but realistic) — no real patient data. It is a portfolio demo, not a medical device. Everything runs in the browser; nothing is uploaded.
Open it: [CareSight](https://garciaralphlawrence-svg.github.io/CareSight/)`,
  },

  kmm: {
    name: "KMM Travel Co.",
    url: "https://garciaralphlawrence-svg.github.io/KMM/",
    greeting: "Mabuhay! I'm Kapitan 🌴 Ask me about KMM's Philippine tour packages, prices, or booking.",
    suggestions: ["What packages do you offer?", "How much is Boracay?", "How do discounts work?", "How do I book?"],
    facts: `
KMM Travel Co. ("Know Me More") — premium, personalised Philippines-only travel, founded by KM Reyes (founder & CEO). DOT accredited, eco-friendly practices, partners with local guides. Also customises international tours (Asia, Europe, Oceania) on request.
Contact: Metro Manila, PH · +63 961 442 6785 · kmm.knowmemore@gmail.com · Facebook: facebook.com/kmmtravelco · Instagram: @kmmtravel_co
Tour packages (price per person, default nights):
- Boracay Getaway — ₱12,500, 3 nights, White Beach sunset cruise (Bestseller)
- Palawan Adventure — ₱18,000, 4 nights, Underground River & El Nido (Top Rated)
- Baguio City Escape — ₱7,000, 2 nights, cool mountain city
- Cebu & Moalboal — ₱15,800, 3 nights, whale sharks & sardine run
- Siargao Surf & Soul — ₱19,500, 4 nights, Cloud 9 & Sugba Lagoon (Most Loved)
- Ilocos Heritage Tour — ₱11,200, 3 nights, Vigan & sand dunes
Destination search also covers El Nido, Coron, Chocolate Hills (Bohol), Mayon Volcano (Albay), Mount Pulag, Banaue Rice Terraces, Vigan, Intramuros, Kawasan Falls, Batanes and Siquijor.
Dynamic discounts (combined, capped at 35% of the total): 5% for 3–4 travellers or 10% for 5+; 2% per extra night beyond the package's default; 8% for travel dates April–October.
How to book a tour, trip or package with KMM: choose a package in "Popular Destinations", adjust the nights, click Book Now, log in, pick travellers and a date, and confirm. Custom trips: fill in the KMM Concierge Form ("Let's Talk") — destination, group type, budget, stay style, experiences, transport and dining preferences — and a travel specialist follows up by email.
Pages: [Tour packages](https://garciaralphlawrence-svg.github.io/KMM/#packages) · [Custom trip form](https://garciaralphlawrence-svg.github.io/KMM/#contact)`,
  },

  islakeys: {
    name: "IslaKeys",
    url: "https://garciaralphlawrence-svg.github.io/IslaKeys/",
    greeting: "Hi! I'm Kapitan 🔑 Ask me about IslaKeys properties, the client and broker portals, or how buying works.",
    suggestions: ["What properties are featured?", "How do I log in as a demo user?", "What can brokers do?", "Can foreigners buy property?"],
    facts: `
IslaKeys — "Unlock Property in the Philippines". Philippine luxury property advisory that matches buyers (including foreign buyers) with verified, PRC-licensed brokers. Trusted guidance since 2024; 4.9/5 service rating; coverage in Makati, BGC, Cebu, Tagaytay and coastal investment areas.
Contact: hello@islakeys.ph · +63 (2) 1234 5678. Disclaimer: IslaKeys is a facilitation service; transactions are handled by PRC-licensed brokers; the site is informational and not legal advice.
Featured properties: Makati Luxury Condo (Makati CBD), BGC Skyline Condo, Tagaytay Villa (lake views), Palawan Beach House (private beachfront), Cebu Ocean Condo.
Portals (sign up with Client or Broker account type; sign-up has verification and optional preferences: property type, budget ₱1M–₱10M+, location, purpose buy/rent/invest):
- Client dashboard: save listings, send inquiries to brokers, see broker replies, application status tracker (verified → profile submitted → viewing → reservation & due diligence), quick messages and drafts.
- Broker portal: lead queue of buyer inquiries (reply to move leads forward), listing manager with inquiry counts, compliance checklist (PRC license, DHSUD registration, CPD units), follow-up notes.
- Admin dashboard: account totals by role, recent accounts, inquiry activity, contact-form messages, restore demo accounts.
Demo site: ready-made demo accounts (client, broker and admin) are shown on the [Login page](https://garciaralphlawrence-svg.github.io/IslaKeys/login.html), so you can try every portal without signing up.
General buying note: foreigners generally can't own land in the Philippines but can own condominium units within the 40% foreign-ownership limit of a condo project — recommend confirming with a licensed broker or lawyer.
Pages: [Home](https://garciaralphlawrence-svg.github.io/IslaKeys/) · [Login / Sign up](https://garciaralphlawrence-svg.github.io/IslaKeys/login.html)`,
  },

  bizbuddy: {
    name: "Biz Buddy",
    url: "https://garciaralphlawrence-svg.github.io/BizBuddy/",
    greeting: "Hi! I'm Kapitan 💼 Ask me about hiring an executive VA, becoming a VA partner, or the demo dashboards.",
    suggestions: ["What can a VA do for me?", "How do I become a VA?", "How do I try the demo?", "What are the VA requirements?"],
    facts: `
Biz Buddy — executive-grade virtual assistant (VA) partnerships. Places top 1% vetted virtual talent with executive leaders; trusted by scale-ups, partners and private-equity offices. 520+ vetted VAs, 1.2k clients, 98% retention. Offices: New York / London / remote. Contact: hello@bizbuddy.com · +1 (212) 555 9800.
Capabilities: calendar & travel management; email & communications; reporting & analytics (dashboards); stakeholder management; content & documentation (presentations, proposals); operations & process (workflows, vendor coordination).
VA application requirements: reliable laptop and stable internet with a professional remote setup; at least 6 months of VA/admin/support/operations experience preferred; strong written English; confidentiality, time discipline and responsiveness.
How it works (demo app — data is saved in the visitor's browser and can be reset with "Reset demo data"):
- Clients sign up, post tasks (title, description, budget in USD, category: Administrative, Content, Research, Travel, Milestone, optional brief file), accept applicants, chat per task, start/complete/reopen tasks, release payment and rate the VA, browse "Find a VA", see top VA matches, view VA profiles, invite VAs to tasks, schedule calls and send private messages.
- VAs sign up with application details (CV/portfolio links and a requirements checklist), apply to opportunities, work assigned tasks with chat, accept or decline call invitations, take VA courses and download completion certificates, and edit their profile (skills, tools, experience, hourly rate, availability, timezone, verification document).
- Admins see platform stats, enquiries, VA applications (approve/reject/verify, bulk approve), task moderation (edit/delete) and CSV exports of users, tasks and enquiries.
Demo site: ready-made demo logins (client, VA and admin) are shown in the login box on the [Biz Buddy site](https://garciaralphlawrence-svg.github.io/BizBuddy/), so you can try every dashboard without signing up.
Pages: [Home](https://garciaralphlawrence-svg.github.io/BizBuddy/) · [Contact](https://garciaralphlawrence-svg.github.io/BizBuddy/#contact)`,
  },

  fma: {
    name: "Future Minds Academy (FMA)",
    url: "https://futuremindsacademyph.com/",
    greeting: null,
    suggestions: [],
    facts: `
Future Minds Academy of Mandaluyong City — a private Kindergarten to Grade 6 school at 650 Ma. Isabel Bldg., Boni Ave., Barangay Plainview, Mandaluyong City. Phone (02) 7949-7084. Office hours Monday–Friday, 8:00 AM–5:00 PM. Website built by Ralph: admissions information, online application, events and photo gallery.
Website: [futuremindsacademyph.com](https://futuremindsacademyph.com/) · Apply online: [Apply](https://futuremindsacademyph.com/apply)`,
  },
};

export const KNOWLEDGE = Object.entries(SITES)
  .map(([key, s]) => `## ${s.name} (id: ${key}) — ${s.url}\n${s.facts.trim()}`)
  .join('\n\n');
