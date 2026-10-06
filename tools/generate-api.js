// Generates webapp/api/** from the scenario data below. Edit the data, then run: npm run generate-api
const fs = require("fs");
const path = require("path");
const out = process.argv[2] || path.join(__dirname, "..", "webapp");
const MONTHS = ["Oct 25","Nov 25","Dec 25","Jan 26","Feb 26","Mar 26","Apr 26","May 26","Jun 26","Jul 26","Aug 26","Sep 26"];
const hist = (arr) => MONTHS.slice(-arr.length).map((m, i) => ({ x: i, period: m, value: arr[i] }));
const trend = (actual, plan, py) => MONTHS.map((m, i) => ({ month: m, actual: actual[i], plan: plan[i], previousYear: py[i] }));
const withShare = (rows) => {
  const total = rows.reduce((s, r) => s + r.value, 0);
  return rows.map((r) => ({ ...r, share: Math.round((r.value / total) * 1000) / 10 }));
};

const company = "Northwind Motion GmbH";
const scenarios = {
  "supply-chain": {
    meta: {
      id: "supply-chain", title: "Supply Chain & Warehouse", company, icon: "sap-icon://shipping-status",
      description: "Northwind Motion builds e-bikes and e-scooters in 4 European plants. Battery cells come from Asia, frames from Portugal. Summer 2026 was rough: a key battery supplier slipped and warehouses filled up with half-finished bikes.",
      question: "Help the COO answer: are we going to be able to ship the Christmas season, and where exactly is the bottleneck?",
      currency: "EUR",
      trend: { title: "On-time supplier delivery", subtitle: "Share of PO lines delivered on time, last 12 months", unit: "%", actualLabel: "On-time %", planLabel: "Target" },
      breakdown: { title: "Inventory value by plant", subtitle: "Current stock value vs. plant target", unit: "EUR k" },
      items: { title: "Open purchase orders", subtitle: "Inbound orders still being delivered", columns: { id: "PO number", title: "Material", subtitle: "Supplier", owner: "Buyer", date: "Due date", amount: "PO value", progress: "Delivered", status: "Status" } }
    },
    kpis: [
      { id: "inventoryValue", title: "Inventory Value", subtitle: "All plants, today", value: 18400000, unit: "EUR", target: 16000000, deltaPercent: 6.2, trend: "Up", state: "Critical", icon: "sap-icon://product", higherIsBetter: false, history: hist([15.1, 15.6, 16.3, 17.2, 17.9, 18.4]) },
      { id: "onTimeDelivery", title: "On-time Delivery", subtitle: "Supplier PO lines, Sep 26", value: 92.3, unit: "%", target: 95, deltaPercent: 2.8, trend: "Up", state: "Critical", icon: "sap-icon://shipping-status", higherIsBetter: true, history: hist([94.2, 91.7, 86.4, 84.9, 89.8, 92.3]) },
      { id: "warehouseUtilization", title: "Warehouse Utilization", subtitle: "Average across 5 sites", value: 87, unit: "%", target: 85, deltaPercent: 4.1, trend: "Up", state: "Critical", icon: "sap-icon://building", higherIsBetter: false, history: hist([78, 80, 82, 84, 85, 87]) },
      { id: "stockOuts", title: "Stock-outs", subtitle: "Materials with zero stock", value: 7, unit: "materials", target: 0, deltaPercent: 40, trend: "Up", state: "Error", icon: "sap-icon://alert", higherIsBetter: false, history: hist([2, 3, 6, 9, 5, 7]) }
    ],
    trend: trend(
      [94.1, 95.3, 92.8, 93.5, 94.9, 95.6, 94.2, 91.7, 86.4, 84.9, 89.8, 92.3],
      [95, 95, 95, 95, 95, 95, 95, 95, 95, 95, 95, 95],
      [93.0, 93.8, 91.2, 92.4, 93.1, 94.0, 94.5, 94.8, 93.9, 93.2, 94.1, 94.6]
    ),
    breakdown: withShare([
      { name: "Hamburg", value: 6200, target: 6000, state: "Critical" },
      { name: "Leipzig", value: 4800, target: 5000, state: "Good" },
      { name: "Brno", value: 3900, target: 2800, state: "Error" },
      { name: "Porto", value: 2300, target: 2400, state: "Good" },
      { name: "Valencia DC", value: 1200, target: 1300, state: "Good" }
    ]),
    items: [
      { id: "4500017321", title: "Li-ion battery pack 48V", subtitle: "Shenzhen Cell Tech Co.", owner: "Anna Novak", date: "2026-09-28", amount: 284000, currency: "EUR", quantity: 1200, progress: 35, status: "Delayed", state: "Error" },
      { id: "4500017334", title: "Battery management board", subtitle: "Shenzhen Cell Tech Co.", owner: "Anna Novak", date: "2026-10-04", amount: 96500, currency: "EUR", quantity: 2500, progress: 10, status: "Delayed", state: "Error" },
      { id: "4500017356", title: "Aluminium frame 'Urban'", subtitle: "Ciclo Metais Lda.", owner: "João Pereira", date: "2026-10-09", amount: 151200, currency: "EUR", quantity: 1800, progress: 70, status: "In transit", state: "Warning" },
      { id: "4500017360", title: "Hub motor 250W", subtitle: "Bavaria Drive Systems AG", owner: "Lena Fischer", date: "2026-10-12", amount: 212000, currency: "EUR", quantity: 2000, progress: 90, status: "In transit", state: "Information" },
      { id: "4500017372", title: "Hydraulic disc brake set", subtitle: "Alpine Components GmbH", owner: "Lena Fischer", date: "2026-10-15", amount: 48300, currency: "EUR", quantity: 2100, progress: 100, status: "Delivered", state: "Success" },
      { id: "4500017388", title: "LCD display unit", subtitle: "Taipei Smart Display Ltd.", owner: "Anna Novak", date: "2026-10-20", amount: 63400, currency: "EUR", quantity: 3200, progress: 50, status: "In transit", state: "Information" },
      { id: "4500017395", title: "Tyre 27.5\" puncture-proof", subtitle: "RubberWorks Kft.", owner: "Tomás Horák", date: "2026-10-22", amount: 27800, currency: "EUR", quantity: 4000, progress: 0, status: "Ordered", state: "None" },
      { id: "4500017402", title: "Scooter deck assembly", subtitle: "Ciclo Metais Lda.", owner: "João Pereira", date: "2026-10-30", amount: 118900, currency: "EUR", quantity: 900, progress: 20, status: "Delayed", state: "Warning" }
    ],
    alerts: [
      { type: "Error", title: "Battery supply at risk", description: "Shenzhen Cell Tech confirmed only 35% of PO 4500017321. Production line 2 in Hamburg stops in 9 days without new cells.", date: "2026-10-05" },
      { type: "Warning", title: "Brno warehouse over capacity", description: "Brno holds EUR 3.9M of stock vs. a EUR 2.8M target, mostly unfinished scooters waiting for decks.", date: "2026-10-04" },
      { type: "Warning", title: "7 materials out of stock", description: "Stock-outs doubled since August. Top item: battery management board (2,500 pcs open).", date: "2026-10-03" },
      { type: "Success", title: "Brakes delivered early", description: "Alpine Components delivered all 2,100 brake sets 3 days ahead of schedule.", date: "2026-10-01" }
    ]
  },

  sales: {
    meta: {
      id: "sales", title: "Sales & Order-to-Cash", company, icon: "sap-icon://sales-order",
      description: "Northwind Motion sells e-bikes and scooters to dealers and fleet customers across Europe. Revenue is seasonal (spring and summer peak) and a few large fleet deals make or break the year.",
      question: "Help the Head of Sales answer: will we hit the annual plan, which regions are lagging, and who owes us money?",
      currency: "EUR",
      trend: { title: "Monthly revenue", subtitle: "Actual vs. plan, EUR thousand", unit: "EUR k", actualLabel: "Revenue", planLabel: "Plan" },
      breakdown: { title: "Revenue by region", subtitle: "Fiscal year to date vs. regional plan", unit: "EUR k" },
      items: { title: "Open sales orders", subtitle: "Largest orders not yet fully delivered or paid", columns: { id: "Order", title: "Customer", subtitle: "Product", owner: "Sales rep", date: "Delivery date", amount: "Net value", progress: "Fulfilled", status: "Status" } }
    },
    kpis: [
      { id: "revenueYtd", title: "Revenue YTD", subtitle: "Fiscal year Oct 25 - Sep 26", value: 48600000, unit: "EUR", target: 50000000, deltaPercent: 8.4, trend: "Up", state: "Critical", icon: "sap-icon://lead", higherIsBetter: true, history: hist([5.1, 5.9, 6.4, 6.0, 4.8, 4.2]) },
      { id: "openOrders", title: "Open Orders", subtitle: "Not yet delivered", value: 1284, unit: "orders", target: 1200, deltaPercent: 3.5, trend: "Up", state: "Neutral", icon: "sap-icon://sales-order", higherIsBetter: true, history: hist([1102, 1180, 1251, 1310, 1240, 1284]) },
      { id: "dso", title: "Days Sales Outstanding", subtitle: "How long customers take to pay", value: 47, unit: "days", target: 40, deltaPercent: 9.3, trend: "Up", state: "Error", icon: "sap-icon://customer-financial-fact-sheet", higherIsBetter: false, history: hist([39, 40, 42, 43, 45, 47]) },
      { id: "grossMargin", title: "Gross Margin", subtitle: "Fiscal year to date", value: 31.4, unit: "%", target: 30, deltaPercent: 1.2, trend: "Up", state: "Good", icon: "sap-icon://loan", higherIsBetter: true, history: hist([29.8, 30.4, 31.0, 31.6, 31.2, 31.4]) }
    ],
    trend: trend(
      [2900, 3400, 4100, 2600, 2800, 3700, 5100, 5900, 6400, 6000, 4800, 4200],
      [3000, 3300, 4000, 2800, 3000, 3900, 5200, 6000, 6500, 6300, 5300, 4700],
      [2600, 3000, 3700, 2400, 2500, 3300, 4600, 5300, 5800, 5600, 4500, 3900]
    ),
    breakdown: withShare([
      { name: "DACH", value: 19800, target: 19500, state: "Good" },
      { name: "Benelux", value: 9400, target: 9000, state: "Good" },
      { name: "Nordics", value: 7300, target: 7500, state: "Critical" },
      { name: "France", value: 6900, target: 8200, state: "Error" },
      { name: "Iberia", value: 3400, target: 3800, state: "Critical" },
      { name: "UK & Ireland", value: 1800, target: 2000, state: "Critical" }
    ]),
    items: [
      { id: "SO-90014521", title: "CityRide Fleet SAS", subtitle: "E-scooter S2, 600 units", owner: "Claire Dubois", date: "2026-10-15", amount: 612000, currency: "EUR", quantity: 600, progress: 40, status: "Payment overdue", state: "Error" },
      { id: "SO-90014537", title: "Fahrrad König GmbH", subtitle: "E-bike Urban, 220 units", owner: "Jonas Weber", date: "2026-10-08", amount: 418000, currency: "EUR", quantity: 220, progress: 100, status: "Delivered", state: "Success" },
      { id: "SO-90014549", title: "Velo Amsterdam B.V.", subtitle: "Cargo e-bike, 90 units", owner: "Sanne de Vries", date: "2026-10-12", amount: 297000, currency: "EUR", quantity: 90, progress: 75, status: "Partially delivered", state: "Information" },
      { id: "SO-90014553", title: "Nordic Pedal AB", subtitle: "E-bike Trail, 140 units", owner: "Erik Lund", date: "2026-10-18", amount: 266000, currency: "EUR", quantity: 140, progress: 0, status: "Blocked: credit limit", state: "Error" },
      { id: "SO-90014560", title: "Bicicletas Sol S.L.", subtitle: "E-bike Urban, 85 units", owner: "Lucía Martín", date: "2026-10-21", amount: 161500, currency: "EUR", quantity: 85, progress: 20, status: "In production", state: "Warning" },
      { id: "SO-90014566", title: "Wiener Radwerk", subtitle: "Spare batteries, 400 units", owner: "Jonas Weber", date: "2026-10-25", amount: 98000, currency: "EUR", quantity: 400, progress: 0, status: "Waiting for stock", state: "Warning" },
      { id: "SO-90014571", title: "LondonLoop Ltd.", subtitle: "E-scooter S2, 120 units", owner: "Oliver Grant", date: "2026-11-02", amount: 122400, currency: "EUR", quantity: 120, progress: 0, status: "Confirmed", state: "None" },
      { id: "SO-90014579", title: "Fahrrad König GmbH", subtitle: "E-bike Trail, 60 units", owner: "Jonas Weber", date: "2026-11-05", amount: 114000, currency: "EUR", quantity: 60, progress: 0, status: "Confirmed", state: "None" }
    ],
    alerts: [
      { type: "Error", title: "EUR 612k overdue at CityRide Fleet", description: "Invoice 1800031 is 38 days overdue. CityRide is our biggest customer in France.", date: "2026-10-05" },
      { type: "Error", title: "Order blocked by credit check", description: "Nordic Pedal AB exceeded its credit limit by EUR 84k. Order SO-90014553 cannot ship.", date: "2026-10-04" },
      { type: "Warning", title: "France 16% below plan", description: "France is EUR 1.3M behind plan for the fiscal year. Pipeline for Q1 is thin.", date: "2026-10-02" },
      { type: "Success", title: "Gross margin above target", description: "Margin is 31.4% vs. 30% target thanks to higher share of premium Trail bikes.", date: "2026-10-01" }
    ]
  },

  sustainability: {
    meta: {
      id: "sustainability", title: "Sustainability & Carbon", company, icon: "sap-icon://e-care",
      description: "Northwind Motion committed to cutting CO2e emissions 50% by 2030 (vs. 2023). Every plant reports energy, emissions and waste monthly. Investors now ask for this data next to the financials.",
      question: "Help the Chief Sustainability Officer answer: are we on track for the 2030 target, and which plant or initiative needs attention?",
      currency: "EUR",
      trend: { title: "Monthly CO2e emissions", subtitle: "Scope 1 + 2, tonnes, actual vs. reduction path", unit: "t CO2e", actualLabel: "Emissions", planLabel: "Reduction path" },
      breakdown: { title: "Emissions by plant", subtitle: "Fiscal year to date vs. plant budget, tonnes CO2e", unit: "t CO2e" },
      items: { title: "Decarbonization initiatives", subtitle: "Projects funded in the 2026 sustainability budget", columns: { id: "Project", title: "Initiative", subtitle: "Plant", owner: "Owner", date: "Go-live", amount: "Budget", progress: "Progress", status: "Status" } }
    },
    kpis: [
      { id: "co2Ytd", title: "CO2e Emissions YTD", subtitle: "Scope 1 + 2, tonnes", value: 12480, unit: "t", target: 11500, deltaPercent: -6.8, trend: "Down", state: "Critical", icon: "sap-icon://e-care", higherIsBetter: false, history: hist([1080, 1010, 1040, 1150, 1120, 990]) },
      { id: "renewableShare", title: "Renewable Energy", subtitle: "Share of electricity", value: 68, unit: "%", target: 75, deltaPercent: 5.0, trend: "Up", state: "Critical", icon: "sap-icon://weather-proofing", higherIsBetter: true, history: hist([61, 63, 64, 66, 67, 68]) },
      { id: "wasteRecycled", title: "Waste Recycled", subtitle: "Share of production waste", value: 91, unit: "%", target: 90, deltaPercent: 1.1, trend: "Up", state: "Good", icon: "sap-icon://journey-change", higherIsBetter: true, history: hist([88, 89, 90, 90, 91, 91]) },
      { id: "energyIntensity", title: "Energy Intensity", subtitle: "MWh per 100 vehicles built", value: 14.2, unit: "MWh", target: 15, deltaPercent: -3.4, trend: "Down", state: "Good", icon: "sap-icon://energy-saving-lightbulb", higherIsBetter: false, history: hist([15.6, 15.1, 14.9, 14.6, 14.4, 14.2]) }
    ],
    trend: trend(
      [1120, 1180, 1260, 1240, 1150, 1060, 980, 1010, 1040, 1150, 1120, 990],
      [1080, 1070, 1060, 1050, 1040, 1030, 1020, 1010, 1000, 990, 980, 970],
      [1250, 1290, 1360, 1340, 1260, 1170, 1090, 1080, 1100, 1120, 1110, 1090]
    ),
    breakdown: withShare([
      { name: "Hamburg", value: 3600, target: 3800, state: "Good" },
      { name: "Leipzig", value: 4900, target: 3700, state: "Error" },
      { name: "Brno", value: 2400, target: 2400, state: "Good" },
      { name: "Porto", value: 1100, target: 1200, state: "Good" },
      { name: "Valencia DC", value: 480, target: 400, state: "Critical" }
    ]),
    items: [
      { id: "ESG-2026-01", title: "Rooftop solar 2.1 MWp", subtitle: "Hamburg", owner: "Mia Schulz", date: "2026-06-30", amount: 1850000, currency: "EUR", quantity: 1, progress: 100, status: "Live", state: "Success" },
      { id: "ESG-2026-02", title: "Replace gas paint-shop oven", subtitle: "Leipzig", owner: "Paul Richter", date: "2026-09-30", amount: 2400000, currency: "EUR", quantity: 1, progress: 45, status: "Delayed", state: "Error" },
      { id: "ESG-2026-03", title: "Green power purchase agreement", subtitle: "Brno", owner: "Petra Dvořák", date: "2026-11-01", amount: 0, currency: "EUR", quantity: 1, progress: 80, status: "On track", state: "Information" },
      { id: "ESG-2026-04", title: "Heat recovery on compressors", subtitle: "Porto", owner: "Rui Costa", date: "2026-12-15", amount: 320000, currency: "EUR", quantity: 1, progress: 60, status: "On track", state: "Information" },
      { id: "ESG-2026-05", title: "Electric forklift fleet", subtitle: "Valencia DC", owner: "Elena Ruiz", date: "2026-10-31", amount: 540000, currency: "EUR", quantity: 24, progress: 25, status: "At risk", state: "Warning" },
      { id: "ESG-2026-06", title: "Battery cell recycling loop", subtitle: "Hamburg", owner: "Mia Schulz", date: "2027-03-31", amount: 1200000, currency: "EUR", quantity: 1, progress: 15, status: "On track", state: "Information" },
      { id: "ESG-2026-07", title: "LED lighting retrofit", subtitle: "Leipzig", owner: "Paul Richter", date: "2026-08-31", amount: 210000, currency: "EUR", quantity: 1, progress: 100, status: "Live", state: "Success" }
    ],
    alerts: [
      { type: "Error", title: "Leipzig 32% over emission budget", description: "The gas-fired paint oven replacement slipped by 6 months. Leipzig alone explains the whole group overshoot.", date: "2026-10-05" },
      { type: "Warning", title: "Renewable share below 75% target", description: "Brno still buys grey electricity until the power purchase agreement starts in November.", date: "2026-10-03" },
      { type: "Warning", title: "Forklift delivery at risk", description: "Only 6 of 24 electric forklifts delivered to Valencia DC. Diesel units still in use.", date: "2026-10-02" },
      { type: "Success", title: "Hamburg solar plant live", description: "The 2.1 MWp rooftop installation covers 18% of Hamburg's electricity since July.", date: "2026-07-01" }
    ]
  }
};

const api = path.join(out, "api");
const ENDPOINTS = ["meta", "kpis", "trend", "breakdown", "items", "alerts"];
fs.mkdirSync(api, { recursive: true });
for (const [id, data] of Object.entries(scenarios)) {
  fs.mkdirSync(path.join(api, id), { recursive: true });
  for (const ep of ENDPOINTS) {
    fs.writeFileSync(path.join(api, id, ep + ".json"), JSON.stringify(data[ep], null, 2) + "\n");
  }
}
fs.writeFileSync(path.join(api, "index.json"), JSON.stringify({
  company,
  baseUrl: "/api",
  scenarios: Object.values(scenarios).map((s) => ({ id: s.meta.id, title: s.meta.title, icon: s.meta.icon, description: s.meta.description, question: s.meta.question })),
  endpoints: [
    { path: "/api/{scenario}/meta.json", returns: "Object", description: "Titles, labels and the business question for the scenario." },
    { path: "/api/{scenario}/kpis.json", returns: "Array", description: "4 headline numbers: value, unit, target, trend (Up/Down), state (Good/Critical/Error/Neutral) and a 6-month history." },
    { path: "/api/{scenario}/trend.json", returns: "Array", description: "12 months: month, actual, plan, previousYear." },
    { path: "/api/{scenario}/breakdown.json", returns: "Array", description: "One row per plant/region: name, value, target, share (%), state." },
    { path: "/api/{scenario}/items.json", returns: "Array", description: "Business records for a table: id, title, subtitle, owner, date, amount, currency, quantity, progress (0-100), status, state." },
    { path: "/api/{scenario}/alerts.json", returns: "Array", description: "Things that need attention: type (Error/Warning/Information/Success), title, description, date." }
  ]
}, null, 2) + "\n");
console.log("ok");
