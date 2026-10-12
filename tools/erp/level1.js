// Level 1 ("ready to bind") endpoints per scenario, computed FROM the raw ERP entities so the numbers always agree.
// Shape per scenario: { meta, kpis[4], trend[12], breakdown[], items[], alerts[4] } (see CLAUDE.md "Data contract").
const { TODAY, FY, addDays, monthOf, monthLabel, monthEnd, round, sum } = require("./util");
const m = require("./master");

const LAST6 = FY.slice(-6);

function kpiState(value, target, higherIsBetter) {
  if (target === null || target === undefined) return "Neutral";
  if (target === 0) return value > 0 === !higherIsBetter ? "Error" : "Good";
  const good = higherIsBetter ? value >= target : value <= target;
  if (good) return "Good";
  return Math.abs(value - target) / target <= 0.1 ? "Critical" : "Error";
}

function kpi(id, title, subtitle, value, unit, target, higherIsBetter, icon, history) {
  const first = history[0], last = history[history.length - 1];
  return {
    id, title, subtitle, value, unit, target, deltaPercent: first ? round((last - first) / first * 100, 1) : 0,
    trend: last >= first ? "Up" : "Down", state: kpiState(value, target, higherIsBetter), icon, higherIsBetter,
    history: history.map((v, i) => ({ x: i, period: monthLabel(LAST6[i]), value: v }))
  };
}

const severity = { Error: 0, Warning: 1, Information: 2, None: 3, Success: 4 };
const bySeverity = (a, b) => severity[a.state] - severity[b.state] || b.amount - a.amount;
const fmtM = (v) => (v / 1e6).toFixed(1).replace(/\.0$/, "") + "M";
const fmtK = (v) => Math.round(v / 1000) + "k";
const pct = (a, b) => round(a / b * 100, 1);
const plantName = (id) => m.A_Plant.find((p) => p.Plant === id).PlantName;
const productName = (id) => m.A_Product.find((p) => p.Product === id).ProductDescription;

// ---------------------------------------------------------------- Sales
function sales(e) {
  const cust = (id) => e.A_Customer.find((c) => c.Customer === id);
  const bills = e.A_BillingDocument;
  const revenueIn = (month) => sum(bills.filter((b) => monthOf(b.BillingDocumentDate) === month), (b) => b.TotalNetAmount);
  const planIn = (month, field) => sum(e.ZI_SalesPlan.filter((p) => p.YearMonth === month), (p) => p[field]);
  const revenue = sum(bills, (b) => b.TotalNetAmount);
  const plan = sum(e.ZI_SalesPlan, (p) => p.PlanAmount);

  // Overdue receivables at a day: invoices past their due date and not paid by then
  const overdueAt = (day) => sum(bills.filter((b) => b.NetDueDate < day && (!b.ClearingDate || b.ClearingDate > day)), (b) => b.TotalNetAmount);
  const overdueHistory = LAST6.map((mo) => round(overdueAt(monthEnd(mo)) / 1000));
  const overdueNow = sum(bills.filter((b) => b.PaymentStatusText === "Overdue"), (b) => b.OpenAmount);
  overdueHistory[5] = round(overdueNow / 1000);

  const billedOrders = new Set(bills.map((b) => b.SalesOrder));
  const items = e.A_SalesOrderItem.filter((i) => billedOrders.has(i.SalesOrder));
  const cost = (i) => i.RequestedQuantity * m.A_Product.find((p) => p.Product === i.Material).StandardPrice;
  const billDate = {};
  bills.forEach((b) => { billDate[b.SalesOrder] = b.BillingDocumentDate; });
  const marginIn = (list) => pct(sum(list, (i) => i.NetAmount) - sum(list, cost), sum(list, (i) => i.NetAmount));
  const margin = marginIn(items);
  const marginHistory = LAST6.map((mo) => marginIn(items.filter((i) => monthOf(billDate[i.SalesOrder]) === mo)));

  const isOpenAt = (o, day) => o.SalesOrderDate <= day && !(billDate[o.SalesOrder] && billDate[o.SalesOrder] <= day);
  const openOrders = e.A_SalesOrder.filter((o) => o.OverallSDProcessStatus !== "C");
  const openHistory = LAST6.map((mo) => e.A_SalesOrder.filter((o) => isOpenAt(o, monthEnd(mo))).length);
  openHistory[5] = openOrders.length;

  const regionRevenue = (r) => sum(bills.filter((b) => cust(b.SoldToParty).SalesRegion === r), (b) => b.TotalNetAmount);
  const regionPlan = (r) => sum(e.ZI_SalesPlan.filter((p) => p.SalesRegion === r), (p) => p.PlanAmount);

  // Items: open or problematic orders
  const stockOf = (mat, plant) => (e.A_MaterialStock.find((s) => s.Material === mat && s.Plant === plant) || {}).StockQuantity;
  const p = e.planted;
  const orderItems = (so) => e.A_SalesOrderItem.filter((i) => i.SalesOrder === so);
  const row = (o, status, state) => {
    const its = orderItems(o.SalesOrder);
    const qty = sum(its, (i) => i.RequestedQuantity);
    const c = cust(o.SoldToParty);
    return {
      id: o.SalesOrder, title: c.CustomerName, subtitle: its[0].SalesOrderItemText + ", " + its[0].RequestedQuantity + " units" + (its.length > 1 ? " + more" : ""),
      owner: c.SalesRep, date: o.RequestedDeliveryDate, amount: o.TotalNetAmount, currency: "EUR", quantity: qty,
      progress: Math.round(sum(its, (i) => i.DeliveredQuantity) / qty * 100), status, state
    };
  };
  const itemRows = [row(p.kiloverdeOverdue, "Payment overdue", "Error")];
  openOrders.forEach((o) => {
    if (o.DeliveryBlockReason === "01") itemRows.push(row(o, "Blocked: credit limit", "Error"));
    else if (o.DeliveryBlockReason) itemRows.push(row(o, "On hold: " + o.DeliveryBlockReasonText.toLowerCase(), "Warning"));
    else if (orderItems(o.SalesOrder).some((i) => stockOf(i.Material, i.ProductionPlant) === 0)) itemRows.push(row(o, "Waiting for stock", "Warning"));
    else if (o.OverallSDProcessStatus === "B") itemRows.push(row(o, "Partially delivered", "Information"));
    else itemRows.push(row(o, "Confirmed", "None"));
  });
  itemRows.sort(bySeverity);

  const france = { actual: regionRevenue("France"), plan: regionPlan("France") };
  const kvInv = p.kiloverdeInvoice;
  const fjord = cust(p.fjordtrailBlocked.SoldToParty);
  const fjordExposure = sum(bills.filter((b) => b.SoldToParty === fjord.Customer), (b) => b.OpenAmount) +
    sum(e.A_SalesOrder.filter((o) => o.SoldToParty === fjord.Customer && o.OverallSDProcessStatus !== "C"), (o) => o.TotalNetAmount);

  const facts = {
    revenue, plan, revenuePct: pct(revenue, plan), margin, overdueTotal: overdueNow, overdueStart: overdueHistory[0] * 1000,
    kiloverdeOverdue: kvInv.OpenAmount, kiloverdeDays: kvInv.DaysOverdue, kiloverdeInvoice: kvInv.BillingDocument,
    franceGapPct: round((france.plan - france.actual) / france.plan * 100), franceGap: france.plan - france.actual,
    fjordOverLimit: fjordExposure - fjord.CreditLimitAmount, fjordOrder: p.fjordtrailBlocked.SalesOrder,
    nordicsPct: pct(regionRevenue("Nordics"), regionPlan("Nordics"))
  };

  return {
    facts,
    data: {
      kpis: [
        kpi("revenueYtd", "Revenue YTD", "Billed, fiscal year Oct 25 - Sep 26", round(revenue), "EUR", plan, true, "sap-icon://lead", LAST6.map((mo) => round(revenueIn(mo) / 1e6, 1))),
        kpi("openOrders", "Open Orders", "Not yet fully delivered", openOrders.length, "orders", null, true, "sap-icon://sales-order", openHistory),
        kpi("overdueReceivables", "Overdue Receivables", "Unpaid invoices past their due date", round(overdueNow), "EUR", 250000, false, "sap-icon://customer-financial-fact-sheet", overdueHistory),
        kpi("grossMargin", "Gross Margin", "Billed sales, fiscal year to date", margin, "%", 30, true, "sap-icon://loan", marginHistory)
      ],
      trend: FY.map((mo) => ({ month: monthLabel(mo), actual: round(revenueIn(mo) / 1000), plan: round(planIn(mo, "PlanAmount") / 1000), previousYear: round(planIn(mo, "PriorYearAmount") / 1000) })),
      breakdown: m.REGIONS.map((r) => ({ name: r, value: round(regionRevenue(r) / 1000), target: round(regionPlan(r) / 1000), state: kpiState(regionRevenue(r), regionPlan(r), true) })),
      items: itemRows.slice(0, 8),
      alerts: [
        { type: "Error", title: "EUR " + fmtK(kvInv.OpenAmount) + " overdue at Kiloverde Fleet SAS", description: "Invoice " + kvInv.BillingDocument + " is " + kvInv.DaysOverdue + " days overdue. Kiloverde is our biggest customer in France and has not placed an order since June.", date: TODAY },
        { type: "Error", title: "Order blocked by credit check", description: "Fjordtrail AB is EUR " + fmtK(facts.fjordOverLimit) + " over its credit limit. Order " + facts.fjordOrder + " cannot ship.", date: addDays(TODAY, -1) },
        { type: "Warning", title: "France " + facts.franceGapPct + "% below plan", description: "France is EUR " + fmtM(facts.franceGap) + " behind plan for the fiscal year. Pipeline for Q1 is thin.", date: addDays(TODAY, -3) },
        { type: margin >= 30 ? "Success" : "Warning", title: "Gross margin " + (margin >= 30 ? "above" : "below") + " target", description: "Margin is " + margin + "% vs. 30% target, helped by a higher share of premium Trail bikes.", date: addDays(TODAY, -4) }
      ]
    }
  };
}

// ---------------------------------------------------------------- Supply chain
const PREVIOUS_YEAR_ON_TIME = [93.0, 93.8, 91.2, 92.4, 93.1, 94.0, 94.5, 94.8, 93.9, 93.2, 94.1, 94.6]; // from the legacy system, no raw data

function supply(e) {
  const items = e.A_PurchaseOrderItem;
  const header = (po) => e.A_PurchaseOrder.find((h) => h.PurchaseOrder === po);
  const supplierOf = (po) => m.A_Supplier.find((s) => s.Supplier === header(po).Supplier);
  const onTimeIn = (mo) => {
    const done = items.filter((i) => monthOf(i.ScheduleLineDeliveryDate) === mo && i.IsCompletelyDelivered);
    return pct(done.filter((i) => i.OnTimeDelivery).length, done.length);
  };
  const lateAt = (day) => items.filter((i) => i.ScheduleLineDeliveryDate < day && !(i.IsCompletelyDelivered && i.GoodsReceiptDate <= day)).length;
  const stock = e.A_MaterialStock;
  const stockValue = sum(stock, (s) => s.StockValue);
  const stockTarget = sum(m.A_Plant, (p) => p.StockTargetValue);
  const plantStock = (plant) => sum(stock.filter((s) => s.Plant === plant), (s) => s.StockValue);
  const historyTotal = LAST6.map((mo) => round(sum(e.ZI_StockValueHistory.filter((h) => h.YearMonth === mo), (h) => h.StockValue) / 1e6, 1));
  const stockOuts = stock.filter((s) => s.StockQuantity === 0);
  const late = items.filter((i) => i.DeliveryStatusText === "Delayed");

  const stateOf = (i) => i.DeliveryStatusText === "Delivered" ? "Success" : i.DeliveryStatusText === "Delayed" ? "Error"
    : i.DeliveryStatusText === "Ordered" ? "None" : i.ScheduleLineDeliveryDate <= addDays(TODAY, 5) ? "Warning" : "Information";
  const recent = items.filter((i) => !i.IsCompletelyDelivered || i.GoodsReceiptDate > addDays(TODAY, -7));
  const itemRows = recent.map((i) => ({
    id: i.PurchaseOrder, title: productName(i.Material), subtitle: supplierOf(i.PurchaseOrder).SupplierName, owner: header(i.PurchaseOrder).PurchasingGroupName,
    date: i.ScheduleLineDeliveryDate, amount: i.NetAmount, currency: "EUR", quantity: i.OrderQuantity,
    progress: Math.round(i.ReceivedQuantity / i.OrderQuantity * 100), status: i.DeliveryStatusText + (i.IsCompletelyDelivered && !i.DaysLate && i.GoodsReceiptDate < i.ScheduleLineDeliveryDate ? " early" : ""), state: stateOf(i)
  })).sort(bySeverity);

  const battery = e.planted.batteryLate;
  const batteryCover = stock.find((s) => s.Material === "NM-C-BATPACK" && s.Plant === "1010").DaysOfCover;
  const brno = plantStock("1310");
  const brnoNoDeck = stock.find((s) => s.Material === "NM-ES-S2-NODECK").StockValue;
  const facts = {
    stockValue, stockTarget, brno, brnoTarget: 2800000, brnoOverPct: round((brno - 2800000) / 2800000 * 100), brnoNoDeckShare: pct(brnoNoDeck, brno),
    hamburg: plantStock("1010"), hamburgOverPct: round((plantStock("1010") - 6000000) / 6000000 * 100),
    onTimeJun: onTimeIn("2026-06"), onTimeJul: onTimeIn("2026-07"), onTimeSep: onTimeIn("2026-09"),
    batteryPo: battery.PurchaseOrder, batteryReceivedPct: Math.round(battery.ReceivedQuantity / battery.OrderQuantity * 100), batteryCover,
    stockOuts: stockOuts.length, lateLines: late.length
  };
  const onTimeHistory = LAST6.map(onTimeIn);
  const stockOutHistory = [2, 3, 6, 9, 5, stockOuts.length]; // snapshot data only exists for today

  return {
    facts,
    data: {
      kpis: [
        kpi("inventoryValue", "Inventory Value", "All plants, today", round(stockValue), "EUR", stockTarget, false, "sap-icon://product", historyTotal),
        kpi("onTimeDelivery", "On-time Delivery", "Supplier PO lines, Sep 26", onTimeHistory[5], "%", 95, true, "sap-icon://shipping-status", onTimeHistory),
        kpi("lateDeliveries", "Late PO Lines", "Open lines past their due date", late.length, "lines", 0, false, "sap-icon://past", LAST6.map((mo) => lateAt(monthEnd(mo)))),
        kpi("stockOuts", "Stock-outs", "Material/plant pairs with zero stock", stockOuts.length, "materials", 0, false, "sap-icon://alert", stockOutHistory)
      ],
      trend: FY.map((mo, i) => ({ month: monthLabel(mo), actual: onTimeIn(mo), plan: 95, previousYear: PREVIOUS_YEAR_ON_TIME[i] })),
      breakdown: m.A_Plant.map((p) => ({ name: p.PlantName, value: round(plantStock(p.Plant) / 1000), target: round(p.StockTargetValue / 1000), state: kpiState(plantStock(p.Plant), p.StockTargetValue, false) })),
      items: itemRows.slice(0, 8),
      alerts: [
        { type: "Error", title: "Battery supply at risk", description: "Lanmo Cellworks delivered only " + facts.batteryReceivedPct + "% of PO " + battery.PurchaseOrder + ". Hamburg has battery packs for " + Math.round(batteryCover) + " days.", date: TODAY },
        { type: "Warning", title: "Brno " + facts.brnoOverPct + "% over stock target", description: "Brno holds EUR " + fmtM(brno) + " of stock vs. a EUR 2.8M target, mostly unfinished scooters waiting for decks.", date: addDays(TODAY, -1) },
        { type: "Warning", title: stockOuts.length + " materials out of stock", description: "Zero stock at " + [...new Set(stockOuts.map((s) => plantName(s.Plant)))].join(", ") + ". Battery management boards are missing at " + stockOuts.filter((s) => s.Material === "NM-C-BMS").length + " plants.", date: addDays(TODAY, -2) },
        { type: "Success", title: "Brakes delivered early", description: "Brakehorn Components delivered all 2,100 brake sets to Leipzig 3 days ahead of schedule.", date: "2026-10-02" }
      ]
    }
  };
}

// ---------------------------------------------------------------- Sustainability
function sustainability(e) {
  const rows = e.ZI_PlantEmissions;
  const inMonth = (mo, f) => sum(rows.filter((r) => r.YearMonth === mo), (r) => r[f]);
  const ofPlant = (plant, f) => sum(rows.filter((r) => r.Plant === plant), (r) => r[f]);
  const total = (f) => sum(rows, (r) => r[f]);
  const co2 = total("CO2eTonnes"), budget = total("BudgetCO2eTonnes"), prior = total("PriorYearCO2eTonnes");
  const renewable = pct(total("RenewableElectricityMWh"), total("ElectricityMWh"));
  const recycled = pct(total("RecycledWasteTonnes"), total("WasteTonnes"));
  const intensity = round((total("ElectricityMWh") + total("NaturalGasMWh")) / total("VehiclesProduced") * 100, 1);
  const intensityIn = (mo) => round((inMonth(mo, "ElectricityMWh") + inMonth(mo, "NaturalGasMWh")) / inMonth(mo, "VehiclesProduced") * 100, 1);
  const leipzig = { actual: ofPlant("1020", "CO2eTonnes"), budget: ofPlant("1020", "BudgetCO2eTonnes") };
  const brnoRenewable = pct(ofPlant("1310", "RenewableElectricityMWh"), ofPlant("1310", "ElectricityMWh"));
  const withoutBrno = pct(total("RenewableElectricityMWh") - ofPlant("1310", "RenewableElectricityMWh"), total("ElectricityMWh") - ofPlant("1310", "ElectricityMWh"));
  const stateOf = { Live: "Success", Delayed: "Error", "At risk": "Warning", "On track": "Information" };

  const facts = {
    co2, budget, prior, overshoot: co2 - budget, leipzigOver: leipzig.actual - leipzig.budget, leipzigOverPct: round((leipzig.actual - leipzig.budget) / leipzig.budget * 100),
    porto: ofPlant("1410", "CO2eTonnes"), portoBudget: ofPlant("1410", "BudgetCO2eTonnes"),
    renewable, brnoRenewable, withoutBrno, hamburgRenewable: pct(ofPlant("1010", "RenewableElectricityMWh"), ofPlant("1010", "ElectricityMWh")),
    recycled, intensity
  };
  return {
    facts,
    data: {
      kpis: [
        kpi("co2Ytd", "CO2e Emissions YTD", "Scope 1 + 2, tonnes", co2, "t", budget, false, "sap-icon://e-care", LAST6.map((mo) => inMonth(mo, "CO2eTonnes"))),
        kpi("renewableShare", "Renewable Energy", "Share of electricity, fiscal year", renewable, "%", 75, true, "sap-icon://weather-proofing", LAST6.map((mo) => pct(inMonth(mo, "RenewableElectricityMWh"), inMonth(mo, "ElectricityMWh")))),
        kpi("wasteRecycled", "Waste Recycled", "Share of production waste", recycled, "%", 90, true, "sap-icon://journey-change", LAST6.map((mo) => pct(inMonth(mo, "RecycledWasteTonnes"), inMonth(mo, "WasteTonnes")))),
        kpi("energyIntensity", "Energy Intensity", "MWh per 100 vehicles built", intensity, "MWh", 150, false, "sap-icon://energy-saving-lightbulb", LAST6.map(intensityIn))
      ],
      trend: FY.map((mo) => ({ month: monthLabel(mo), actual: inMonth(mo, "CO2eTonnes"), plan: inMonth(mo, "BudgetCO2eTonnes"), previousYear: inMonth(mo, "PriorYearCO2eTonnes") })),
      breakdown: m.A_Plant.map((p) => ({ name: p.PlantName, value: ofPlant(p.Plant, "CO2eTonnes"), target: ofPlant(p.Plant, "BudgetCO2eTonnes"), state: kpiState(ofPlant(p.Plant, "CO2eTonnes"), ofPlant(p.Plant, "BudgetCO2eTonnes"), false) })),
      items: e.ZI_SustainabilityInitiative.map((i) => ({
        id: i.Initiative, title: i.InitiativeName, subtitle: plantName(i.Plant), owner: i.ResponsiblePerson, date: i.PlannedGoLiveDate,
        amount: i.BudgetAmount, currency: "EUR", quantity: 1, progress: i.ProgressPercent, status: i.StatusText, state: stateOf[i.StatusText]
      })),
      alerts: [
        { type: "Error", title: "Leipzig " + facts.leipzigOverPct + "% over emission budget", description: "The gas-fired paint oven was due to be replaced in April and slipped to December. Leipzig alone explains the whole group overshoot.", date: TODAY },
        { type: "Warning", title: "Renewable share below 75% target", description: "Group share is " + renewable + "%. Brno still buys grey electricity until its power purchase agreement starts in November.", date: addDays(TODAY, -2) },
        { type: "Warning", title: "Forklift delivery at risk", description: "Only 6 of 24 electric forklifts delivered to Valencia DC. Diesel units still in use.", date: addDays(TODAY, -3) },
        { type: "Success", title: "Hamburg solar plant live", description: "The 2.1 MWp rooftop installation has been running since July and lifted Hamburg's renewable share to 88%.", date: "2026-07-01" }
      ]
    }
  };
}

module.exports = { sales, supply, sustainability };
