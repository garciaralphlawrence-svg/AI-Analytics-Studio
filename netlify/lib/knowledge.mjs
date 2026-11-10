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
Portfolio website by Ralph Garcia. Contact form on the portfolio: [Contact](https://garciaralphlawrence-svg.github.io/Ralph-Portfolio/#contact)
Projects list: UERM QMS; Future Minds Academy website + school management system; AI Analytics Studio; KMM Travel & Tours; IslaKeys; Biz Buddy; PredScan; EASTELLA (agentic information software documentation); Algebot (algebra chatbot documentation).`,
  },

  studio: {
    name: "AI Analytics Studio",
    url: "https://garciaralphlawrence-svg.github.io/AI-Analytics-Studio/",
    greeting: "Hi! I'm Kapitan 👋 Drop in a spreadsheet and I'll build the dashboard — or ask me how it works.",
    suggestions: ["How does this work?", "Is my data safe?", "What files can I upload?", "Try a sample dataset"],
    facts: `
AI Analytics Studio — built by Ralph Garcia. Upload any Excel (.xlsx/.xls) or CSV file, or pick a sample dataset, and it instantly builds an interactive dashboard: KPI cards, trend lines, category breakdowns and a data table, all generated automatically from the column types it detects (numbers, dates, categories, text).
Then the AI analyst (Claude) explores the data and writes an executive dashboard: a title and summary, the most important charts, 4–5 numeric insights, and suggested follow-up questions.
"Ask your data": type a question in plain English (e.g. "Which region had the highest revenue in Q2?") and the AI answers with exact numbers and a chart. Every number is computed on the full dataset by a query engine — the AI never guesses from a sample.
Privacy & data safety (is my data safe or secure?): files are parsed in the browser; for AI analysis the rows are sent to the secure backend only to compute aggregates; nothing is stored. Up to 20,000 rows and 60 columns.
Sample datasets: Coffee shop sales, Philippine real-estate listings, Travel bookings, School enrollment.
Extras: dark/light theme, presentation mode, export the dashboard to PDF/print, CSV download of any chart's data.
Tech: vanilla JavaScript, Apache ECharts, SheetJS, Netlify Functions, Claude (Anthropic) with tool use.
It is the hub of Kapitan AI Suite, together with the AI Resibo Maker (receipts) and Kapitan Chat (ChatGPT-style assistant). Sales from the Resibo Maker open here as a dashboard with one click.
Open it: [AI Analytics Studio](https://garciaralphlawrence-svg.github.io/AI-Analytics-Studio/)`,
  },

  resibo: {
    name: "AI Resibo Maker",
    url: "https://garciaralphlawrence-svg.github.io/AI-Analytics-Studio/receipts/",
    greeting: "Hi! I'm Kapitan 🧾 Describe a sale and I'll help you make the resibo — or ask how it works.",
    suggestions: ["How do I make a receipt?", "Does it compute senior discount?", "Can it scan a paper receipt?", "Is this a BIR official receipt?"],
    facts: `
AI Resibo Maker (part of Kapitan AI Suite, built by Ralph Garcia). Describe a sale the way you'd tell a cashier — typed or spoken, in English, Filipino or Taglish (e.g. "2 spanish latte tig-165, 1 ensaymada 85, gcash, si Juan") — and the AI fills in the receipt: customer, items, quantities, prices, payment method (Cash, GCash, Maya, Card, Bank Transfer), cash received and discounts. Everything stays editable before issuing.
Money is computed exactly by the app, not the AI: prices are VAT-inclusive; the receipt shows VATable sales and 12% VAT. Senior Citizen and PWD discounts follow the law: VAT is removed first, then 20% off (e.g. ₱750 of items → ₱535.71 due), and the receipt has a line for the OSCA/PWD ID and signature. Promo % discounts and change for cash payments are supported.
Issue the receipt to give it a number (e.g. KC-000001), then print it or save as PDF (80mm receipt layout), download it as an image, or share it from a phone. Business name, address, TIN, prefix and footer are set in Business settings.
Receipt scanner: take a photo of any paper receipt and the AI reads the merchant, date, items, VAT and total into an expense record for review.
"Analyze my sales with AI" sends all issued receipts to AI Analytics Studio, which builds a sales dashboard automatically (there's a "Load 160 sample receipts" button for demos). Scanned expenses can be analyzed the same way.
Not a BIR Official Receipt or Sales Invoice: those require a BIR Authority to Print or an accredited POS. Data is saved in the browser only.
Open it: [AI Resibo Maker](https://garciaralphlawrence-svg.github.io/AI-Analytics-Studio/receipts/)`,
  },

  aichat: {
    name: "Kapitan Chat",
    url: "https://garciaralphlawrence-svg.github.io/AI-Analytics-Studio/chat/",
    greeting: null,
    suggestions: [],
    facts: `
Kapitan Chat (part of Kapitan AI Suite) is a ChatGPT-style assistant built by Ralph Garcia on Claude: conversations saved in a sidebar, answers that stream in live with formatted text and code, stop and regenerate, voice input, and image upload so it can describe photos or read documents. It needs a demo access code from Ralph so his AI credits can't be misused by strangers.
Open it: [Kapitan Chat](https://garciaralphlawrence-svg.github.io/AI-Analytics-Studio/chat/)`,
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
How to book: choose a package in "Popular Destinations", adjust the nights, click Book Now, log in, pick travellers and a date, and confirm. Custom trips: fill in the KMM Concierge Form ("Let's Talk") — destination, group type, budget, stay style, experiences, transport and dining preferences — and a travel specialist follows up by email.
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
Demo accounts (this is a demo site): Admin admin@islakeys.ph / admin12345 · Client client.test@islakeys.ph / client123 · Broker broker.test@islakeys.ph / broker123.
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
Demo logins (shown in the login box): Client client@bizbuddy.com / client123 · VA va@bizbuddy.com / va12345 · Admin admin@bizbuddy.com / admin123.
Pages: [Home](https://garciaralphlawrence-svg.github.io/BizBuddy/) · [Contact](https://garciaralphlawrence-svg.github.io/BizBuddy/#contact)`,
  },

  fma: {
    name: "Future Minds Academy (FMA)",
    url: "https://futuremindsacademyph.com/",
    greeting: null,
    suggestions: [],
    facts: `
Future Minds Academy of Mandaluyong City — a private Kindergarten to Grade 6 school at 650 Ma. Isabel Bldg., Boni Ave., Barangay Plainview, Mandaluyong City. Phone (02) 7949-7084. Office hours Monday–Friday, 8:00 AM–5:00 PM. Website built by Ralph: public site with admissions, online application, events and gallery, plus a full school management system (student, teacher, grade-approver and admin portals, grading workflow, attendance kiosk, audit logs) on Next.js, TypeScript, PostgreSQL and Prisma.
Website: [futuremindsacademyph.com](https://futuremindsacademyph.com/) · Apply online: [Apply](https://futuremindsacademyph.com/apply)`,
  },
};

export const KNOWLEDGE = Object.entries(SITES)
  .map(([key, s]) => `## ${s.name} (id: ${key}) — ${s.url}\n${s.facts.trim()}`)
  .join('\n\n');
