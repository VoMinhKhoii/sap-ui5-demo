// Tests for webapp/util/q.js against the generated ERP data. Also proves each case can be solved with q().
// Run: node tools/test-q.js
const fs = require("fs");
const path = require("path");
const assert = require("assert");

let factory;
global.sap = { ui: { define: (deps, f) => { factory = f; } } };
require("../webapp/util/q.js");
const { create } = factory();

const dir = path.join(__dirname, "..", "webapp", "api", "erp");
const index = JSON.parse(fs.readFileSync(path.join(dir, "index.json"), "utf8"));
const db = {};
index.entities.forEach((e) => { db[e.name] = JSON.parse(fs.readFileSync(path.join(dir, e.name + ".json"), "utf8")).value; });
const q = create(db, index.relations);

let failed = 0;
function test(name, fn) {
  try { fn(); console.log("ok    " + name); } catch (e) { failed++; console.log("FAIL  " + name + "\n      " + e.message); }
}
const throwsLike = (fn, re) => assert.throws(fn, (e) => re.test(e.message) || assert.fail("message was: " + e.message));

// ---- API
test("groupBy + sum gives the breakdown shape", () => {
  const r = q("A_SalesOrderItem").join("A_SalesOrder").join("A_Customer").groupBy("SalesRegion").sum("NetAmount").sortBy("value", "desc").resolve();
  assert.deepStrictEqual(Object.keys(r[0]).sort(), ["SalesRegion", "count", "name", "share", "value"]);
  assert.strictEqual(r.length, 6);
  assert.ok(Math.abs(r.reduce((s, x) => s + x.share, 0) - 100) < 0.5);
});
test("byMonth gives 12 sorted months with labels", () => {
  const r = q("A_BillingDocument").byMonth("BillingDocumentDate").sum("TotalNetAmount").resolve();
  assert.strictEqual(r.length, 12);
  assert.strictEqual(r[0].month, "Oct 25");
  assert.strictEqual(r[11].period, "2026-09");
  assert.ok(!("share" in r[0]) && !("_items" in r[0]));
});
test("byMonth fills months up to the end of the table", () => {
  const r = q("A_BillingDocument").join("A_Customer").where("CustomerName", "Kiloverde Fleet SAS").byMonth("BillingDocumentDate").sum("TotalNetAmount").resolve();
  assert.strictEqual(r[r.length - 1].month, "Sep 26");
  assert.strictEqual(r[r.length - 1].value, 0);
});
test("aggregate without groupBy returns a number", () => {
  assert.strictEqual(typeof q("A_BillingDocument").sum("TotalNetAmount").resolve(), "number");
  assert.strictEqual(q("A_Plant").count().resolve(), 5);
});
test("second aggregate gets its own name, conditional aggregates work", () => {
  const r = q("ZI_PlantEmissions").join("A_Plant").byMonth("YearMonth")
    .sum("CO2eTonnes", "Leipzig", (x) => x.PlantName === "Leipzig").sum("CO2eTonnes", "Others", (x) => x.PlantName !== "Leipzig").resolve();
  assert.ok("Leipzig" in r[0] && "Others" in r[0]);
});
test("withState adds state, valueState, deltaPercent", () => {
  const r = q("ZI_PlantEmissions").join("A_Plant").groupBy("PlantName").sum("CO2eTonnes").sum("BudgetCO2eTonnes", "target").withState(false).resolve();
  const leipzig = r.find((x) => x.name === "Leipzig");
  assert.strictEqual(leipzig.state, "Error");
  assert.strictEqual(leipzig.valueState, "Error");
  assert.strictEqual(leipzig.deltaPercent, 32.4);
});
test("where with value, operator and function", () => {
  assert.ok(q("A_SalesOrder").where("TotalNetAmount", ">", 300000).resolve().every((o) => o.TotalNetAmount > 300000));
  assert.ok(q("A_Customer").where("Country", "FR").resolve().length === 5);
  assert.ok(q("A_Customer").where((c) => c.SalesRegion === "Nordics").resolve().length === 5);
});
test("join keeps colliding fields with a prefix", () => {
  const r = q("A_PurchaseOrderItem").join("A_Plant").join("A_PurchaseOrder").join("A_Supplier").first().resolve();
  assert.ok("Country" in r && "Supplier_Country" in r && "SupplierName" in r && "PlantName" in r);
});
test("include adds child rows", () => {
  const c = q("A_Customer").where("CustomerName", "Kiloverde Fleet SAS").include("A_BillingDocument", "invoices").first().resolve();
  assert.ok(Array.isArray(c.invoices) && c.invoices.length > 3);
});
test("helpful errors", () => {
  throwsLike(() => q("A_SalesOrders"), /Did you mean "A_SalesOrder"/);
  throwsLike(() => q("A_Customer").groupBy("Region").sum("CreditLimitAmount").resolve(), /Did you mean "SalesRegion"/);
  throwsLike(() => q("A_Customer").join("A_SalesOrder").resolve(), /use \.include/);
  throwsLike(() => q("A_Plant").sum("StockTargetValue").sum("CO2eBudgetTonnes").resolve(), /single value/);
});
test("queries are lazy and reusable", () => {
  const base = q("A_Customer").where("SalesRegion", "DACH");
  assert.strictEqual(base.count().resolve(), 8);
  assert.strictEqual(base.where("Country", "AT").count().resolve(), 2);
});

test("merge adds a plan column by month", () => {
  const r = q("A_BillingDocument").byMonth("BillingDocumentDate").sum("TotalNetAmount").merge(q("ZI_SalesPlan").byMonth("YearMonth").sum("PlanAmount"), "plan").resolve();
  assert.ok(r.every((m) => m.plan > 0));
});
test("every Playground example runs", () => {
  require("../webapp/util/examples.js");
  const examples = factory();
  examples.forEach((ex) => {
    const result = q.run(ex.code);
    assert.ok(result !== null && result !== undefined, ex.id);
  });
});

// ---- Every case can be answered with q()
test("case cash-leak: one customer holds most overdue money", () => {
  const r = q("A_BillingDocument").where("PaymentStatusText", "Overdue").join("A_Customer").groupBy("CustomerName").sum("OpenAmount").sortBy("value", "desc").resolve();
  assert.strictEqual(r[0].name, "Kiloverde Fleet SAS");
  assert.ok(r[0].share > 50, "share " + r[0].share);
});
test("case plan-gap: France is furthest below plan, Nordics close", () => {
  const actual = q("A_BillingDocument").join("A_Customer").groupBy("SalesRegion").sum("TotalNetAmount").resolve();
  const plan = q("ZI_SalesPlan").groupBy("SalesRegion").sum("PlanAmount").resolve();
  const pct = (r) => actual.find((a) => a.name === r).value / plan.find((p) => p.name === r).value * 100;
  const worst = actual.map((a) => a.name).sort((a, b) => pct(a) - pct(b))[0];
  assert.strictEqual(worst, "France");
  assert.ok(pct("Nordics") > 95);
  const kvAfterJune = q("A_SalesOrder").join("A_Customer").where("CustomerName", "Kiloverde Fleet SAS").where("SalesOrderDate", ">", "2026-06-30")
    .where("DeliveryBlockReason", "").count().resolve();
  assert.strictEqual(kvAfterJune, 0);
});
test("case christmas-risk: battery packs run out first at Hamburg, Norrlöv is on time", () => {
  const cover = q("A_MaterialStock").where("Plant", "1010").where((s) => s.DaysOfCover !== null && s.StockQuantity > 0).sortBy("DaysOfCover").first().resolve();
  assert.strictEqual(cover.Material, "NM-C-BATPACK");
  const onTime = q("A_PurchaseOrderItem").where("IsCompletelyDelivered", true).join("A_PurchaseOrder").join("A_Supplier").groupBy("SupplierName").percent("OnTimeDelivery").resolve();
  const by = (n) => onTime.find((o) => o.name.startsWith(n)).value;
  assert.ok(by("Norrlöv") > 90 && by("Lanmo") < 85, "Norrlöv " + by("Norrlöv") + " Lanmo " + by("Lanmo"));
});
test("case full-warehouse: Brno is furthest over target, mostly HALB", () => {
  const r = q("A_MaterialStock").join("A_Plant").groupBy("PlantName").sum("StockValue").max("StockTargetValue", "target").withState(false).sortBy("deltaPercent", "desc").resolve();
  assert.strictEqual(r[0].name, "Brno");
  const mix = q("A_MaterialStock").where("Plant", "1310").join("A_Product").groupBy("ProductTypeText").sum("StockValue").sortBy("value", "desc").resolve();
  assert.strictEqual(mix[0].name, "Semi-finished product");
});
test("case co2-overshoot: Leipzig over budget only from April", () => {
  const r = q("ZI_PlantEmissions").where("Plant", "1020").byMonth("YearMonth").sum("CO2eTonnes").sum("BudgetCO2eTonnes", "target").resolve();
  assert.ok(r.slice(0, 6).every((m) => m.value === m.target));
  assert.ok(r.slice(6).every((m) => m.value > m.target * 1.5));
});
test("case recycling-claim: only Leipzig recycles less than 90%", () => {
  const r = q("ZI_PlantEmissions").groupBy("PlantName").ratio("RecycledWasteTonnes", "WasteTonnes").resolve();
  assert.deepStrictEqual(r.filter((x) => x.value < 90).map((x) => x.name), ["Leipzig"]);
});
test("case renewable-gap: Brno is the only plant far below 75%", () => {
  const r = q("ZI_PlantEmissions").join("A_Plant").groupBy("PlantName").ratio("RenewableElectricityMWh", "ElectricityMWh").resolve();
  assert.deepStrictEqual(r.filter((x) => x.value < 75).map((x) => x.name), ["Brno"]);
});

// ---- The reference solution's queries run and give the documented answers
test("reference solution (webapp/solution/queries.js)", () => {
  require("../webapp/solution/queries.js");
  const results = {};
  const defs = factory()(q);
  Object.keys(defs).forEach((k) => { results[k] = defs[k].resolve(); });
  assert.strictEqual(results.recyclingByPlant[0].name, "Leipzig");
  assert.ok(results.recyclingLeipzig < 90 && results.recyclingGroup > 90);
  assert.strictEqual(results.renewableByPlant[0].name, "Brno");
  assert.ok(results.renewableGroup < 75 && results.renewableWithoutBrno > 75);
  assert.ok(results.co2Leipzig.value - results.co2Leipzig.target >= results.co2Group.value - results.co2Group.target);
  assert.strictEqual(results.leipzigOven.StatusText, "Delayed");
});

console.log(failed ? failed + " failed" : "all passed");
process.exitCode = failed ? 1 : 0;
