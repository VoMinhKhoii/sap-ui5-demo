// Generates webapp/api/** from the fictional Northwind Motion ERP. Run: npm run generate-api
//
//   api/erp/<Entity>.json    raw S/4HANA-style entities (OData V4 envelope { "@odata.context", value: [...] })
//   api/erp/index.json       entity docs, fields and relations (used by the API Explorer and q())
//   api/<scenario>/*.json    "level 1": ready-to-bind meta, kpis, trend, breakdown, items, alerts, computed from the raw data
//   api/cases.json           the case files teams pick from
//
// The data is random but seeded, so every run produces the same files. The stories are planted in tools/erp/*.js
// and checked at the bottom of this file: if a change breaks a story, the generator fails.
const fs = require("fs");
const path = require("path");
const master = require("./erp/master");
const { buildSales } = require("./erp/sales");
const { buildSupply } = require("./erp/supply");
const { buildSustainability } = require("./erp/sustainability");
const level1 = require("./erp/level1");
const { ENTITIES, RELATIONS } = require("./erp/metadata");
const { buildCases, M, K } = require("./erp/cases");
const { TODAY } = require("./erp/util");

const out = process.argv[2] || path.join(__dirname, "..", "webapp");
const company = master.COMPANY;

// ---- Build (order matters: the random generator is shared)
const sales = buildSales();
const supply = buildSupply();
const sus = buildSustainability();
const erp = {
  A_Plant: master.A_Plant, A_Product: master.A_Product, A_Customer: sales.A_Customer, A_Supplier: master.A_Supplier,
  A_SalesOrder: sales.A_SalesOrder, A_SalesOrderItem: sales.A_SalesOrderItem, A_BillingDocument: sales.A_BillingDocument, ZI_SalesPlan: sales.ZI_SalesPlan,
  A_PurchaseOrder: supply.A_PurchaseOrder, A_PurchaseOrderItem: supply.A_PurchaseOrderItem, A_MaterialStock: supply.A_MaterialStock, ZI_StockValueHistory: supply.ZI_StockValueHistory,
  ZI_PlantEmissions: sus.ZI_PlantEmissions, ZI_SustainabilityInitiative: sus.ZI_SustainabilityInitiative
};
const input = Object.assign({ planted: Object.assign({}, sales.planted, supply.planted) }, erp);
const computed = { sales: level1.sales(input), "supply-chain": level1.supply(input), sustainability: level1.sustainability(input) };
const facts = {};
Object.entries(computed).forEach(([id, c]) => { facts[id] = c.facts; });

// ---- Scenario texts (level 1)
const META = {
  "supply-chain": {
    title: "Supply Chain & Warehouse", icon: "sap-icon://shipping-status",
    description: "Northwind Motion builds e-bikes and e-scooters in 4 European plants. Battery packs come from Asia, frames from Portugal. Summer 2026 was rough: a key battery supplier slipped and warehouses filled up with half-finished scooters.",
    question: "Help the COO answer: are we going to be able to ship the Christmas season, and where exactly is the bottleneck?",
    trend: { title: "On-time supplier delivery", subtitle: "Share of PO lines delivered on time, by due month", unit: "%", actualLabel: "On-time %", planLabel: "Target" },
    breakdown: { title: "Inventory value by plant", subtitle: "Current stock value vs. plant target", unit: "EUR k" },
    items: { title: "Open purchase orders", subtitle: "Inbound orders still being delivered", columns: { id: "PO number", title: "Material", subtitle: "Supplier", owner: "Buyer", date: "Due date", amount: "PO value", progress: "Received", status: "Status" } }
  },
  sales: {
    title: "Sales & Order-to-Cash", icon: "sap-icon://sales-order",
    description: "Northwind Motion sells e-bikes and scooters to dealers and fleet customers across Europe. Revenue is seasonal (spring and summer peak) and a few large fleet deals make or break the year.",
    question: "Help the Head of Sales answer: will we hit the annual plan, which regions are lagging, and who owes us money?",
    trend: { title: "Monthly revenue", subtitle: "Billed revenue vs. plan, EUR thousand", unit: "EUR k", actualLabel: "Revenue", planLabel: "Plan" },
    breakdown: { title: "Revenue by region", subtitle: "Fiscal year vs. regional plan, EUR thousand", unit: "EUR k" },
    items: { title: "Open sales orders", subtitle: "Orders that need attention or are not yet delivered", columns: { id: "Order", title: "Customer", subtitle: "Product", owner: "Sales rep", date: "Delivery date", amount: "Net value", progress: "Delivered", status: "Status" } }
  },
  sustainability: {
    title: "Sustainability & Carbon", icon: "sap-icon://e-care",
    description: "Northwind Motion committed to cutting CO2e emissions 50% by 2030 (vs. 2023). Every plant reports energy, emissions and waste monthly. Investors now ask for this data next to the financials.",
    question: "Help the Chief Sustainability Officer answer: are we on track for the 2030 target, and which plant or initiative needs attention?",
    trend: { title: "Monthly CO2e emissions", subtitle: "Scope 1 + 2, tonnes, actual vs. budget", unit: "t CO2e", actualLabel: "Emissions", planLabel: "Budget" },
    breakdown: { title: "Emissions by plant", subtitle: "Fiscal year vs. plant budget, tonnes CO2e", unit: "t CO2e" },
    items: { title: "Decarbonization initiatives", subtitle: "Projects funded in the 2026 sustainability budget", columns: { id: "Project", title: "Initiative", subtitle: "Plant", owner: "Owner", date: "Go-live", amount: "Budget", progress: "Progress", status: "Status" } }
  }
};

// ---- Story checks: fail loudly if a data change breaks a planted story
const checks = [];
const check = (ok, text) => checks.push((ok ? "ok    " : "FAIL  ") + text);
const s = facts.sales, sc = facts["supply-chain"], su = facts.sustainability;
const overdueByCustomer = {};
erp.A_BillingDocument.filter((b) => b.PaymentStatusText === "Overdue").forEach((b) => { overdueByCustomer[b.SoldToParty] = (overdueByCustomer[b.SoldToParty] || 0) + b.OpenAmount; });
const kvId = erp.A_Customer.find((c) => c.CustomerName === "Kiloverde Fleet SAS").Customer;
const kvShare = overdueByCustomer[kvId] / s.overdueTotal * 100;
check(s.revenuePct >= 95 && s.revenuePct < 99, `sales: revenue at ${s.revenuePct}% of plan (95-99)`);
check(s.franceGapPct >= 12, `sales: France ${s.franceGapPct}% under plan (>= 12)`);
check(s.nordicsPct >= 95, `sales: Nordics at ${s.nordicsPct}% of plan, close to plan (red herring)`);
check(s.kiloverdeDays === 38 && s.kiloverdeOverdue === 612000, `sales: Kiloverde EUR ${s.kiloverdeOverdue} overdue for ${s.kiloverdeDays} days`);
check(kvShare >= 50, `sales: Kiloverde is ${kvShare.toFixed(0)}% of all overdue money (>= 50)`);
check(Math.round(s.fjordOverLimit) === 84000, `sales: Fjordtrail EUR ${Math.round(s.fjordOverLimit)} over credit limit`);
check(s.overdueTotal > s.overdueStart * 3, `sales: overdue receivables rose from ${K(s.overdueStart)} to ${K(s.overdueTotal)}`);
check(sc.brnoOverPct >= 30 && sc.brnoNoDeckShare >= 50, `supply: Brno ${sc.brnoOverPct}% over target, ${sc.brnoNoDeckShare}% unfinished scooters`);
check(sc.hamburgOverPct <= 5, `supply: Hamburg only ${sc.hamburgOverPct}% over target (red herring)`);
check(sc.onTimeJun < 90 && sc.onTimeJul < 90, `supply: on-time dip Jun ${sc.onTimeJun}% / Jul ${sc.onTimeJul}%`);
check(Math.round(sc.batteryCover) === 9 && sc.batteryReceivedPct === 35, `supply: battery PO ${sc.batteryReceivedPct}% received, ${sc.batteryCover} days of cover`);
const hamburgCover = erp.A_MaterialStock.filter((x) => x.Plant === "1010" && x.DaysOfCover !== null).sort((a, b) => a.DaysOfCover - b.DaysOfCover);
check(hamburgCover[0].Material === "NM-C-BATPACK" && hamburgCover[1].Material === "NM-C-BMS" && hamburgCover[0].StockQuantity > 0, `supply: Hamburg runs out of battery packs first (${hamburgCover[0].DaysOfCover} d), then BMS boards (${hamburgCover[1].DaysOfCover} d)`);
check(sc.stockOuts === 7, `supply: ${sc.stockOuts} stock-outs`);
check(su.leipzigOver >= su.overshoot, `sustainability: Leipzig +${su.leipzigOver} t >= group overshoot +${su.overshoot} t`);
check(su.porto <= su.portoBudget, `sustainability: Porto ${su.porto} t within budget ${su.portoBudget} t (red herring)`);
check(su.renewable < 75 && su.withoutBrno >= 75, `sustainability: renewable ${su.renewable}%, ${su.withoutBrno}% without Brno`);
check(su.hamburgRenewable >= 75, `sustainability: Hamburg renewable ${su.hamburgRenewable}% (red herring)`);
const recycling = master.A_Plant.map((p) => {
  const rows = erp.ZI_PlantEmissions.filter((r) => r.Plant === p.Plant);
  return [p.PlantName, rows.reduce((t, r) => t + r.RecycledWasteTonnes, 0) / rows.reduce((t, r) => t + r.WasteTonnes, 0) * 100];
});
const below90 = recycling.filter((r) => r[1] < 90).map((r) => r[0]);
check(su.recycled >= 90 && below90.join() === "Leipzig", `sustainability: group recycles ${su.recycled}%, only ${below90.join(", ")} below 90%`);

// ---- Write
const api = path.join(out, "api");
const write = (file, data) => {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(data, null, 2) + "\n");
};
fs.rmSync(path.join(api), { recursive: true, force: true });

const typeOf = (rows, field) => {
  const v = rows.map((r) => r[field]).find((x) => x !== null && x !== undefined);
  return typeof v === "boolean" ? "Boolean" : typeof v === "number" ? "Number" : /^\d{4}-\d{2}-\d{2}$/.test(v) ? "Date" : "String";
};
const erpIndex = { company, today: TODAY, entities: [], relations: RELATIONS };
Object.entries(erp).forEach(([name, rows]) => {
  write(path.join(api, "erp", name + ".json"), { "@odata.context": "$metadata#" + name, value: rows });
  const doc = ENTITIES[name];
  erpIndex.entities.push({
    name, title: doc.title, area: doc.area, scenarios: doc.scenarios, description: doc.description, key: doc.key, count: rows.length,
    path: "/api/erp/" + name + ".json",
    fields: Object.keys(rows[0]).map((f) => ({ name: f, type: typeOf(rows, f), description: doc.fields[f] || (/Currency$/.test(f) ? "Currency of the amounts" : /Unit$/.test(f) ? "Unit of measure (PC = piece)" : ""), example: rows[0][f] }))
  });
});
write(path.join(api, "erp", "index.json"), erpIndex);

for (const [id, c] of Object.entries(computed)) {
  const meta = Object.assign({ id, company, currency: "EUR" }, META[id]);
  write(path.join(api, id, "meta.json"), meta);
  ["kpis", "trend", "breakdown", "items", "alerts"].forEach((ep) => write(path.join(api, id, ep + ".json"), c.data[ep]));
}
write(path.join(api, "cases.json"), buildCases(facts));
write(path.join(api, "index.json"), {
  company,
  baseUrl: "/api",
  scenarios: Object.entries(META).map(([id, mt]) => ({ id, title: mt.title, icon: mt.icon, description: mt.description, question: mt.question })),
  endpoints: [
    { path: "/api/{scenario}/meta.json", returns: "Object", description: "Titles, labels and the business question for the scenario." },
    { path: "/api/{scenario}/kpis.json", returns: "Array", description: "4 headline numbers: value, unit, target, deltaPercent (change over the last 6 months), trend (Up/Down), state (Good/Critical/Error/Neutral) and a 6-month history." },
    { path: "/api/{scenario}/trend.json", returns: "Array", description: "12 months: month, actual, plan, previousYear." },
    { path: "/api/{scenario}/breakdown.json", returns: "Array", description: "One row per plant/region: name, value, target, share (%), state." },
    { path: "/api/{scenario}/items.json", returns: "Array", description: "Business records for a table: id, title, subtitle, owner, date, amount, currency, quantity, progress (0-100), status, state." },
    { path: "/api/{scenario}/alerts.json", returns: "Array", description: "Things that need attention: type (Error/Warning/Information/Success), title, description, date." }
  ]
});

// breakdown.share is computed here so every scenario has it
for (const id of Object.keys(computed)) {
  const file = path.join(api, id, "breakdown.json");
  const rows = JSON.parse(fs.readFileSync(file, "utf8"));
  const total = rows.reduce((t, r) => t + r.value, 0);
  write(file, rows.map((r) => Object.assign({}, r, { share: Math.round(r.value / total * 1000) / 10 })));
}

console.log(Object.entries(erp).map(([n, r]) => `${n} ${r.length}`).join(" · "));
console.log(checks.join("\n"));
if (process.argv.includes("--facts")) console.log(JSON.stringify(facts, null, 2), "\nKiloverde share of overdue:", kvShare.toFixed(1) + "%", M(s.overdueTotal), K(overdueByCustomer[kvId]));
if (checks.some((c) => c.startsWith("FAIL"))) {
  console.error("A planted story no longer holds. Adjust tools/erp/*.js");
  process.exitCode = 1;
}
