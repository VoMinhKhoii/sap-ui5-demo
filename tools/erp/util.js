// Shared helpers for the ERP data generator: a seeded random generator (same data on every run) and date math.
let state = 20261005;
function rnd() {
  // mulberry32
  state |= 0; state = (state + 0x6d2b79f5) | 0;
  let t = Math.imul(state ^ (state >>> 15), 1 | state);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const R = {
  float: (a, b) => a + rnd() * (b - a),
  int: (a, b) => Math.floor(a + rnd() * (b - a + 1)),
  pick: (arr) => arr[Math.floor(rnd() * arr.length)],
  chance: (p) => rnd() < p,
  weighted: (items, weightOf) => {
    const total = items.reduce((s, it) => s + weightOf(it), 0);
    let x = rnd() * total;
    for (const it of items) { x -= weightOf(it); if (x <= 0) return it; }
    return items[items.length - 1];
  },
  shuffle: (arr) => {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  }
};

const TODAY = "2026-10-05";
// Fiscal year Oct 2025 - Sep 2026
const FY = ["2025-10", "2025-11", "2025-12", "2026-01", "2026-02", "2026-03", "2026-04", "2026-05", "2026-06", "2026-07", "2026-08", "2026-09"];
const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const toDate = (iso) => new Date(iso + "T00:00:00Z");
const iso = (d) => d.toISOString().slice(0, 10);
const addDays = (s, n) => { const d = toDate(s); d.setUTCDate(d.getUTCDate() + n); return iso(d); };
const daysBetween = (a, b) => Math.round((toDate(b) - toDate(a)) / 86400000);
const monthOf = (s) => s.slice(0, 7);
const monthLabel = (key) => MONTH_NAMES[Number(key.slice(5, 7)) - 1] + " " + key.slice(2, 4);
const daysInMonth = (key) => new Date(Date.UTC(Number(key.slice(0, 4)), Number(key.slice(5, 7)), 0)).getUTCDate();
const dayInMonth = (key, day) => key + "-" + String(day).padStart(2, "0");
const randomDay = (key, maxIso) => {
  let d = dayInMonth(key, R.int(1, daysInMonth(key)));
  if (maxIso && d > maxIso) d = maxIso;
  return d;
};
const monthEnd = (key) => dayInMonth(key, daysInMonth(key));
const round = (n, d = 0) => { const f = Math.pow(10, d); return Math.round(n * f) / f; };
const sum = (arr, fn) => arr.reduce((s, x) => s + (fn ? fn(x) : x), 0);

module.exports = { R, TODAY, FY, toDate, iso, addDays, daysBetween, monthOf, monthLabel, daysInMonth, dayInMonth, randomDay, monthEnd, round, sum };
