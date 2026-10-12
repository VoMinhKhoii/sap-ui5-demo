// Sales & order-to-cash: sales orders, items, billing documents (invoices) and the sales plan.
// Planted story: Kiloverde Fleet SAS has a EUR 612k invoice 38 days overdue (more than half of all overdue money) and stopped ordering after June,
// which is why France is far below plan. Fjordtrail AB has an order blocked by the credit check.
const { R, TODAY, FY, addDays, daysBetween, randomDay, round, sum } = require("./util");
const m = require("./master");

const REGION_ACTUAL = { DACH: 19.8e6, Benelux: 9.4e6, Nordics: 7.3e6, France: 6.9e6, Iberia: 3.4e6, "UK & Ireland": 1.8e6 };
const REGION_PLAN = { DACH: 19.5e6, Benelux: 9.0e6, Nordics: 7.5e6, France: 8.2e6, Iberia: 3.8e6, "UK & Ireland": 2.0e6 };
const PRIOR_FACTOR = { DACH: 0.92, Benelux: 0.9, Nordics: 0.95, France: 1.02, Iberia: 0.86, "UK & Ireland": 0.9 };
const ACTUAL_PATTERN = [2900, 3400, 4100, 2600, 2800, 3700, 5100, 5900, 6400, 6000, 4800, 4200];
const PLAN_PATTERN = [3000, 3300, 4000, 2800, 3000, 3900, 5200, 6000, 6500, 6300, 5300, 4700];
const LAST_BILLING_DAY = "2026-09-30";
const PAYMENT_DRIFT_DAYS_PER_MONTH = 0.25; // customers pay a little later through the year

// [material, weight, minQty, maxQty]
const MIX = {
  Dealer: [["NM-EB-URBAN", 45, 10, 50], ["NM-EB-TRAIL", 35, 8, 40], ["NM-EB-CARGO", 10, 4, 15], ["NM-SP-BAT48", 10, 20, 80]],
  Fleet: [["NM-ES-S2", 70, 60, 300], ["NM-EB-URBAN", 20, 20, 100], ["NM-EB-CARGO", 10, 10, 40]],
  "Online retail": [["NM-EB-URBAN", 50, 15, 60], ["NM-EB-TRAIL", 30, 10, 40], ["NM-SP-BAT48", 20, 30, 120]]
};
const DISCOUNT = { Dealer: 0, Fleet: 0.04, "Online retail": 0 };
const CUSTOMER_WEIGHT = { Dealer: 2, Fleet: 3, "Online retail": 1.5 };
const PLANT_OF = { "NM-EB-URBAN": "1010", "NM-EB-TRAIL": "1010", "NM-EB-CARGO": "1020", "NM-ES-S2": "1310", "NM-SP-BAT48": "1510" };

const product = (id) => m.A_Product.find((p) => p.Product === id);
const customerByName = (name) => m.A_Customer.find((c) => c.CustomerName === name);

function newOrder(customer, orderDate, requestedDate, lines, discount) {
  const disc = discount === undefined ? DISCOUNT[customer.CustomerGroupText] : discount;
  const items = lines.map(([material, qty], i) => ({
    SalesOrderItem: String((i + 1) * 10),
    Material: material,
    SalesOrderItemText: product(material).ProductDescription,
    RequestedQuantity: qty,
    RequestedQuantityUnit: "PC",
    DeliveredQuantity: 0,
    NetAmount: round(qty * product(material).ListPrice * (1 - disc), 2),
    TransactionCurrency: "EUR",
    ProductionPlant: PLANT_OF[material]
  }));
  return {
    order: {
      SalesOrder: "", SalesOrderType: "OR", SalesOrganization: "1010", DistributionChannel: "10",
      SoldToParty: customer.Customer, SalesOrderDate: orderDate, RequestedDeliveryDate: requestedDate,
      TotalNetAmount: round(sum(items, (i) => i.NetAmount), 2), TransactionCurrency: "EUR",
      OverallSDProcessStatus: "A", OverallSDProcessStatusText: "Open",
      OverallTotalDeliveryStatus: "A", OverallTotalDeliveryStatusText: "Not delivered",
      DeliveryBlockReason: "", DeliveryBlockReasonText: ""
    },
    items,
    customer,
    billingDate: null
  };
}

function setDelivered(o, ratio) {
  o.items.forEach((i) => { i.DeliveredQuantity = Math.round(i.RequestedQuantity * ratio); });
  if (ratio >= 1) {
    Object.assign(o.order, { OverallSDProcessStatus: "C", OverallSDProcessStatusText: "Completed", OverallTotalDeliveryStatus: "C", OverallTotalDeliveryStatusText: "Fully delivered" });
  } else if (ratio > 0) {
    Object.assign(o.order, { OverallSDProcessStatus: "B", OverallSDProcessStatusText: "In process", OverallTotalDeliveryStatus: "B", OverallTotalDeliveryStatusText: "Partially delivered" });
  }
}

function randomLines(group) {
  const mix = MIX[group];
  const first = R.weighted(mix, (x) => x[1]);
  const lines = [[first[0], R.int(first[2], first[3])]];
  if (R.chance(0.3)) {
    const second = R.weighted(mix.filter((x) => x[0] !== first[0]), (x) => x[1]);
    lines.push([second[0], R.int(second[2], second[3])]);
  }
  return lines;
}

function buildSales() {
  const orders = [];
  const kiloverde = customerByName("Kiloverde Fleet SAS");
  const fjordtrail = customerByName("Fjordtrail AB");

  // ---- Plan + monthly targets per region
  const ZI_SalesPlan = [];
  const target = {};
  const planSum = sum(PLAN_PATTERN), actualSum = sum(ACTUAL_PATTERN);
  for (const region of m.REGIONS) {
    const plan = PLAN_PATTERN.map((p) => REGION_PLAN[region] * p / planSum);
    FY.forEach((month, i) => ZI_SalesPlan.push({
      SalesRegion: region, YearMonth: month,
      PlanAmount: round(plan[i], -3),
      PriorYearAmount: round(plan[i] * PRIOR_FACTOR[region] * R.float(0.96, 1.04), -3),
      Currency: "EUR"
    }));
    if (region === "France") {
      // On plan until March, then the biggest customer stops ordering.
      const first = plan.slice(0, 6).map((p) => p * R.float(0.98, 1.03));
      const rest = REGION_ACTUAL.France - sum(first);
      const secondPlan = sum(plan.slice(6));
      target[region] = first.concat(plan.slice(6).map((p) => rest * p / secondPlan));
    } else {
      target[region] = ACTUAL_PATTERN.map((a) => REGION_ACTUAL[region] * a / actualSum);
    }
  }

  // ---- Planted: Kiloverde's big scooter order, delivered and billed end of July, never paid.
  const kvBig = newOrder(kiloverde, "2026-06-08", "2026-07-14", [["NM-ES-S2", 600]], 0);
  kvBig.billingDate = "2026-07-14";
  kvBig.planted = "kiloverdeOverdue";
  setDelivered(kvBig, 1);
  orders.push(kvBig);
  target.France[9] -= kvBig.order.TotalNetAmount;

  // ---- Delivered + billed orders that fill each region/month target
  for (const region of m.REGIONS) {
    FY.forEach((month, i) => {
      let candidates = m.A_Customer.filter((c) => c.SalesRegion === region);
      if (region === "France" && i >= 9) candidates = candidates.filter((c) => c !== kiloverde); // stopped ordering after June
      let acc = 0;
      const goal = target[region][i];
      while (acc < goal * 0.99) {
        const customer = R.weighted(candidates, (c) => CUSTOMER_WEIGHT[c.CustomerGroupText]);
        let lines = randomLines(customer.CustomerGroupText);
        let o = newOrder(customer, "", "", lines);
        const remaining = goal - acc;
        if (o.order.TotalNetAmount > remaining * 1.02) {
          const f = remaining / o.order.TotalNetAmount;
          lines = lines.map(([mat, q]) => [mat, Math.max(1, Math.round(q * f))]);
          o = newOrder(customer, "", "", lines);
        }
        const billing = randomDay(month, LAST_BILLING_DAY);
        o.billingDate = billing;
        o.order.RequestedDeliveryDate = addDays(billing, -R.int(0, 2));
        o.order.SalesOrderDate = addDays(billing, -R.int(12, 40));
        setDelivered(o, 1);
        orders.push(o);
        acc += o.order.TotalNetAmount;
      }
    });
  }

  // ---- Open order book (delivery after today)
  const OPEN = { DACH: 10, Benelux: 6, Nordics: 5, France: 4, Iberia: 4, "UK & Ireland": 2 };
  for (const region of m.REGIONS) {
    const candidates = m.A_Customer.filter((c) => c.SalesRegion === region && c !== kiloverde && c !== fjordtrail);
    for (let n = 0; n < OPEN[region]; n++) {
      const customer = R.weighted(candidates, (c) => CUSTOMER_WEIGHT[c.CustomerGroupText]);
      const orderDate = addDays("2026-08-20", R.int(0, 44));
      let requested = addDays(orderDate, R.int(25, 55));
      if (requested <= TODAY) requested = addDays(TODAY, R.int(3, 20));
      const o = newOrder(customer, orderDate, requested, randomLines(customer.CustomerGroupText));
      if (orderDate < "2026-09-15" && R.chance(0.35)) setDelivered(o, R.float(0.2, 0.8));
      orders.push(o);
    }
  }
  const kvOpen = newOrder(kiloverde, "2026-08-18", "2026-10-15", [["NM-ES-S2", 300]], 0);
  Object.assign(kvOpen.order, { DeliveryBlockReason: "Z1", DeliveryBlockReasonText: "Customer payment overdue" });
  kvOpen.planted = "kiloverdeOnHold";
  const fjBlocked = newOrder(fjordtrail, "2026-09-22", "2026-10-18", [["NM-EB-TRAIL", 140]]);
  Object.assign(fjBlocked.order, { DeliveryBlockReason: "01", DeliveryBlockReasonText: "Credit limit exceeded" });
  fjBlocked.planted = "fjordtrailBlocked";
  const phSpare = newOrder(customerByName("Pedalhaus Wien GmbH"), "2026-09-10", "2026-10-25", [["NM-SP-BAT48", 400]]);
  phSpare.planted = "spareBatteries";
  orders.push(kvOpen, fjBlocked, phSpare);

  // ---- Numbers in chronological order, like a real system
  orders.sort((a, b) => (a.order.SalesOrderDate + a.order.SoldToParty).localeCompare(b.order.SalesOrderDate + b.order.SoldToParty));
  orders.forEach((o, i) => {
    o.order.SalesOrder = String(5000001 + i);
    o.items.forEach((it) => { it.SalesOrder = o.order.SalesOrder; });
  });

  // ---- Billing documents (one invoice per delivered order) + payments
  const billed = orders.filter((o) => o.billingDate).sort((a, b) => a.billingDate.localeCompare(b.billingDate));
  const A_BillingDocument = billed.map((o, i) => {
    const c = o.customer;
    const group = c.CustomerGroupText;
    const due = addDays(o.billingDate, group === "Fleet" ? 45 : 30);
    const monthIndex = FY.indexOf(o.billingDate.slice(0, 7));
    let delay = group === "Online retail" ? R.int(-25, -10) : group === "Fleet" ? R.int(-8, 4) : R.int(-8, 3);
    delay += Math.round(monthIndex * PAYMENT_DRIFT_DAYS_PER_MONTH);
    if (c === fjordtrail && o.billingDate >= "2026-06-01") delay += R.int(25, 40); // slow payer: pushes it over its credit limit
    else if (group !== "Online retail" && R.chance(0.07)) delay += R.int(12, 30); // the usual few late payments
    let clearing = addDays(due, delay);
    if (clearing <= o.billingDate) clearing = addDays(o.billingDate, R.int(1, 5));
    if (o.planted === "kiloverdeOverdue" || clearing > TODAY) clearing = null;
    const overdue = !clearing && due < TODAY;
    return {
      BillingDocument: String(90000001 + i), BillingDocumentType: "F2", SalesOrder: o.order.SalesOrder, SoldToParty: c.Customer,
      BillingDocumentDate: o.billingDate, NetDueDate: due, TotalNetAmount: o.order.TotalNetAmount, TransactionCurrency: "EUR",
      ClearingDate: clearing,
      PaymentStatusText: clearing ? "Paid" : overdue ? "Overdue" : "Open",
      DaysOverdue: overdue ? daysBetween(due, TODAY) : 0,
      OpenAmount: clearing ? 0 : o.order.TotalNetAmount
    };
  });

  // ---- Credit limits: about 3 months of business; Fjordtrail is EUR 84k over with the blocked order.
  const openOrderValue = (cust) => sum(orders.filter((o) => !o.billingDate && o.customer === cust), (o) => o.order.TotalNetAmount);
  const openAr = (cust) => sum(A_BillingDocument.filter((b) => b.SoldToParty === cust.Customer), (b) => b.OpenAmount);
  const A_Customer = m.A_Customer.map((c) => {
    const yearly = sum(A_BillingDocument.filter((b) => b.SoldToParty === c.Customer), (b) => b.TotalNetAmount);
    let limit = Math.max(100000, round(yearly / 4, -4));
    if (c === fjordtrail) limit = openAr(c) + openOrderValue(c) - 84000;
    if (c === kiloverde) limit = 1500000;
    return Object.assign({}, c, { CreditLimitAmount: round(limit, 2) });
  });

  const A_SalesOrder = orders.map((o) => o.order);
  const A_SalesOrderItem = [].concat(...orders.map((o) => o.items.map((it) => Object.assign({ SalesOrder: o.order.SalesOrder }, it))));
  const planted = {};
  orders.filter((o) => o.planted).forEach((o) => { planted[o.planted] = o.order; });
  planted.kiloverdeInvoice = A_BillingDocument.find((b) => b.SalesOrder === planted.kiloverdeOverdue.SalesOrder);

  return { A_Customer, A_SalesOrder, A_SalesOrderItem, A_BillingDocument, ZI_SalesPlan, planted };
}

module.exports = { buildSales };
