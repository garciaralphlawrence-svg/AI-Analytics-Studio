// Built-in demo datasets. Generated with a seeded RNG, so every visitor sees
// the same numbers, with realistic seasonality, mix and noise baked in.

function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const pickW = (r, items) => {
  const total = items.reduce((a, it) => a + it[1], 0);
  let x = r() * total;
  for (const [v, w] of items) { if ((x -= w) <= 0) return v; }
  return items[items.length - 1][0];
};
const iso = (d) => d.toISOString().slice(0, 10);
const dayOf = (start, i) => { const d = new Date(start); d.setUTCDate(d.getUTCDate() + i); return d; };
const round2 = (x) => Math.round(x * 100) / 100;

function coffee() {
  const r = rng(11);
  const branches = [['Makati', 1.3], ['BGC', 1.4], ['Quezon City', 1.1], ['Cebu IT Park', 0.9], ['Davao', 0.7]];
  const products = [
    ['Spanish Latte', 'Coffee', 165, 1.6], ['Caffè Latte', 'Coffee', 150, 1.4], ['Americano', 'Coffee', 120, 1.1],
    ['Cold Brew', 'Coffee', 175, 0.9], ['Matcha Latte', 'Non-Coffee', 170, 0.8], ['Chocolate', 'Non-Coffee', 140, 0.5],
    ['Ensaymada', 'Pastry', 85, 0.9], ['Basque Cheesecake', 'Pastry', 195, 0.6],
  ];
  // Customers rate some items higher; service quality improves through the year.
  const ratingBias = { 'Spanish Latte': 0.35, 'Basque Cheesecake': 0.3, 'Cold Brew': 0.15, 'Matcha Latte': 0.1, 'Americano': -0.2, 'Chocolate': -0.3 };
  const channels = [['Dine-in', 4], ['Takeout', 3], ['GrabFood', 2], ['foodpanda', 1.4]];
  const rows = [];
  const start = Date.UTC(2025, 0, 1);
  for (let day = 0; day < 365; day++) {
    const d = dayOf(start, day);
    const month = d.getUTCMonth();
    // Rainy season lifts delivery and hot drinks; December rush; summer lifts cold brew.
    const season = 1 + 0.25 * Math.sin(((month - 2) / 12) * 2 * Math.PI) + (month === 11 ? 0.35 : 0);
    const weekend = [0, 6].includes(d.getUTCDay()) ? 1.25 : 1;
    const orders = Math.round((7 + r() * 4) * season * weekend);
    for (let o = 0; o < orders; o++) {
      const branch = pickW(r, branches);
      const p = products[Math.floor(pickW(r, products.map((x, i) => [i, x[3]])))];
      const channel = pickW(r, month >= 5 && month <= 9 ? [['Dine-in', 3], ['Takeout', 2.5], ['GrabFood', 3], ['foodpanda', 2]] : channels);
      const qty = 1 + Math.floor(r() * r() * 4);
      const delivery = channel === 'GrabFood' || channel === 'foodpanda' ? 1.12 : 1;
      rows.push({
        date: iso(d), branch, product: p[0], category: p[1], channel, quantity: qty,
        unit_price: round2(p[2] * delivery), revenue: round2(qty * p[2] * delivery),
        rating: Math.max(1, Math.min(5, round2(3.55 + r() * 1.1 + (ratingBias[p[0]] || 0) + month * 0.025 + (branch === 'BGC' ? 0.15 : branch === 'Davao' ? -0.15 : 0) - (channel === 'foodpanda' ? 0.3 : 0)))),
      });
    }
  }
  return { name: 'Kape Co. Coffee Sales 2025', rows };
}

function property() {
  const r = rng(22);
  const cities = [['Makati', 260000, 1.4], ['BGC Taguig', 290000, 1.5], ['Pasig', 190000, 1.1], ['Quezon City', 150000, 1.3], ['Cebu City', 140000, 1], ['Tagaytay', 95000, 0.6], ['Palawan', 110000, 0.4]];
  const types = [['Condo', 5], ['House & Lot', 2.2], ['Townhouse', 1.4], ['Lot', 0.8], ['Villa', 0.5]];
  const brokers = ['A. Santos', 'M. Reyes', 'J. Dela Cruz', 'P. Villanueva', 'K. Lim', 'R. Mendoza'];
  const rows = [];
  const start = Date.UTC(2024, 0, 1);
  for (let i = 0; i < 860; i++) {
    const c = cities[Math.floor(pickW(r, cities.map((x, k) => [k, x[2]])))];
    const type = pickW(r, types);
    const beds = type === 'Lot' ? 0 : type === 'Condo' ? pickW(r, [[0, 1], [1, 4], [2, 3], [3, 1]]) : 2 + Math.floor(r() * 4);
    const area = Math.round(type === 'Lot' ? 120 + r() * 600 : type === 'Condo' ? 24 + beds * 22 + r() * 30 : 80 + beds * 35 + r() * 120);
    const premium = type === 'Villa' ? 1.4 : type === 'Lot' ? 0.45 : type === 'House & Lot' ? 0.85 : 1;
    const ppsqm = Math.round(c[1] * premium * (0.8 + r() * 0.45));
    const listed = dayOf(start, Math.floor(r() * 640));
    const status = pickW(r, [['Available', 5], ['Reserved', 1.5], ['Sold', 3]]);
    rows.push({
      listed_date: iso(listed), city: c[0], property_type: type, bedrooms: beds, floor_area_sqm: area,
      price_php: ppsqm * area, price_per_sqm: ppsqm, status,
      days_on_market: status === 'Available' ? Math.round(20 + r() * 200) : Math.round(10 + r() * 120 * (ppsqm > 250000 ? 1.4 : 1)),
      inquiries: Math.round(r() * 25 * (c[0] === 'BGC Taguig' || c[0] === 'Makati' ? 1.5 : 1)), broker: brokers[Math.floor(r() * brokers.length)],
    });
  }
  return { name: 'IslaKeys Property Listings', rows };
}

function travel() {
  const r = rng(33);
  const pkgs = [['Boracay Getaway', 'Visayas', 12500, 3, 2.2], ['Palawan Adventure', 'Luzon', 18000, 4, 1.8], ['Baguio City Escape', 'Luzon', 7000, 2, 1.5],
    ['Cebu & Moalboal', 'Visayas', 15800, 3, 1.2], ['Siargao Surf & Soul', 'Mindanao', 19500, 4, 1.3], ['Ilocos Heritage Tour', 'Luzon', 11200, 3, 0.8]];
  const channels = [['Website', 3], ['Facebook', 2.5], ['Instagram', 2], ['Walk-in', 0.6], ['Referral', 1]];
  const rows = [];
  const start = Date.UTC(2025, 0, 1);
  for (let i = 0; i < 1650; i++) {
    const d = dayOf(start, Math.floor(r() * 365));
    const month = d.getUTCMonth();
    const p = pkgs[Math.floor(pickW(r, pkgs.map((x, k) => [k, x[4] * (month >= 2 && month <= 4 ? (x[1] === 'Luzon' && x[0].includes('Baguio') ? 1.6 : 1.4) : 1)])))];
    const travelers = pickW(r, [[1, 1.2], [2, 4], [3, 1.4], [4, 1.6], [5, 0.8], [6, 0.5]]);
    const nights = p[3] + pickW(r, [[0, 6], [1, 2], [2, 1]]);
    const gross = p[2] * travelers;
    let disc = travelers >= 5 ? 0.1 : travelers >= 3 ? 0.05 : 0;
    disc += (nights - p[3]) * 0.02;
    const travelMonth = (month + 1 + Math.floor(r() * 3)) % 12;
    if (travelMonth >= 3 && travelMonth <= 9) disc += 0.08;
    disc = Math.min(disc, 0.35);
    const status = pickW(r, [['Confirmed', 9], ['Cancelled', 1]]);
    rows.push({
      booking_date: iso(d), package: p[0], region: p[1], channel: pickW(r, channels),
      customer_type: travelers === 1 ? 'Solo' : travelers === 2 ? pickW(r, [['Couple', 3], ['Friends', 1]]) : pickW(r, [['Family', 3], ['Friends', 2], ['Corporate', 1]]),
      travelers, nights, gross_php: gross, discount_php: Math.round(gross * disc), net_php: Math.round(gross * (1 - disc)), status,
    });
  }
  return { name: 'KMM Travel Bookings 2025', rows };
}

function school() {
  const r = rng(44);
  const levels = [['Kinder', 32000, 1.2], ['Grade 1', 38000, 1], ['Grade 2', 38000, 1], ['Grade 3', 40000, 0.95], ['Grade 4', 42000, 0.9], ['Grade 5', 42000, 0.85], ['Grade 6', 44000, 0.8]];
  const cities = [['Mandaluyong', 5], ['Pasig', 2], ['San Juan', 1.2], ['Makati', 1], ['Quezon City', 0.8]];
  const rows = [];
  for (let i = 0; i < 1240; i++) {
    const year = 2021 + Math.floor(pickW(r, [[0, 0.8], [1, 0.9], [2, 1], [3, 1.15], [4, 1.3]]));
    const lv = levels[Math.floor(pickW(r, levels.map((x, k) => [k, x[2]])))];
    const scholar = r() < 0.14;
    const attendance = Math.min(100, round2(86 + r() * 14 - (r() < 0.08 ? 12 : 0)));
    const avg = Math.min(99, round2(78 + r() * 14 + (attendance - 90) * 0.35 + (scholar ? 4 : 0)));
    rows.push({
      enrollment_date: iso(new Date(Date.UTC(year, pickW(r, [[4, 1], [5, 3], [6, 2], [7, 0.4]]), 1 + Math.floor(r() * 28)))),
      school_year: `${year}-${year + 1}`, grade_level: lv[0], section: ['Sampaguita', 'Narra', 'Molave', 'Ilang-Ilang'][Math.floor(r() * 4)],
      gender: r() < 0.5 ? 'Female' : 'Male', city: pickW(r, cities),
      tuition_php: Math.round(lv[1] * (1 + (year - 2021) * 0.05) * (scholar ? 0.5 : 1)), scholarship: scholar ? 'Yes' : 'No',
      average_grade: avg, attendance_rate: attendance, status: avg < 80 && r() < 0.5 ? 'For Remediation' : 'Promoted',
    });
  }
  return { name: 'School Enrollment & Performance', rows };
}

export const SAMPLES = [
  { id: 'coffee', icon: '☕', title: 'Coffee Shop Sales', blurb: '~3,600 orders · 5 branches · 2025', make: coffee },
  { id: 'property', icon: '🏙️', title: 'Property Listings', blurb: '860 listings · Metro Manila to Palawan', make: property },
  { id: 'travel', icon: '🌴', title: 'Travel Bookings', blurb: '1,650 bookings · 6 tour packages', make: travel },
  { id: 'school', icon: '🎓', title: 'School Enrollment', blurb: '1,240 students · 5 school years', make: school },
];
