// Supply chain: purchase orders + items, current stock per plant, stock value history.
// Planted story: Lanmo Cellworks (battery packs) delivered late in Jun-Aug and still owes 65% of a 1,200-pack PO;
// Hamburg has battery packs for 9 days. Brno is far over its stock target because scooters wait for decks
// from Ciclometal, whose deck PO is late too. Norrlöv (second battery source) delivers on time.
const { R, TODAY, FY, addDays, daysBetween, randomDay, round, sum } = require("./util");
const m = require("./master");

const supplier = (name) => m.A_Supplier.find((s) => s.SupplierName.startsWith(name)).Supplier;
const price = (id) => m.A_Product.find((p) => p.Product === id).StandardPrice;

// [material, plant, supplier, monthly quantity]
const SOURCING = [
  ["NM-C-BATPACK", "1010", "Lanmo", 1300], ["NM-C-BATPACK", "1020", "Lanmo", 260], ["NM-C-BATPACK", "1310", "Lanmo", 700],
  ["NM-C-BATPACK", "1010", "Norrlöv", 250], ["NM-C-BMS", "1010", "Lanmo", 1400], ["NM-C-BMS", "1310", "Lanmo", 700],
  ["NM-C-FRAME-URB", "1010", "Ciclometal", 700], ["NM-C-DECK-S2", "1310", "Ciclometal", 700],
  ["NM-C-MOTOR250", "1010", "Ilzwerk", 1100], ["NM-C-MOTOR250", "1020", "Ilzwerk", 250],
  ["NM-C-BRAKE", "1010", "Brakehorn", 1100], ["NM-C-BRAKE", "1020", "Brakehorn", 250], ["NM-C-BRAKE", "1410", "Brakehorn", 400],
  ["NM-C-DISPLAY", "1010", "Lumadisplay", 1100], ["NM-C-DISPLAY", "1310", "Lumadisplay", 700],
  ["NM-C-TYRE275", "1010", "Gumiwerk", 2200], ["NM-C-TYRE275", "1020", "Gumiwerk", 500], ["NM-C-TYRE275", "1410", "Gumiwerk", 800]
];
const LEAD_DAYS = { Lanmo: 60, "Norrlöv": 21, Ciclometal: 28, Ilzwerk: 21, Brakehorn: 14, Lumadisplay: 45, Gumiwerk: 21 };
// Share of PO lines delivered late per month (Oct 25 .. Sep 26)
const LATE_SHARE = {
  Lanmo: [0.05, 0, 0.1, 0.1, 0.05, 0, 0.1, 0.3, 0.75, 0.8, 0.4, 0.2],
  "Norrlöv": [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], // the reliable second source
  Ciclometal: [0.05, 0.05, 0.1, 0.05, 0.05, 0.05, 0.05, 0.1, 0.2, 0.25, 0.2, 0.15],
  default: [0.05, 0.04, 0.08, 0.06, 0.04, 0.03, 0.04, 0.05, 0.06, 0.06, 0.05, 0.04]
};

// Open (not completely delivered) POs today: the level-1 "items" of the supply-chain scenario come from these.
const OPEN_POS = [
  { material: "NM-C-BATPACK", plant: "1010", supplier: "Lanmo", qty: 1200, due: "2026-09-28", received: 0.35, story: "batteryLate" },
  { material: "NM-C-BMS", plant: "1010", supplier: "Lanmo", qty: 2500, due: "2026-10-04", received: 0.1 },
  { material: "NM-C-DECK-S2", plant: "1310", supplier: "Ciclometal", qty: 900, due: "2026-09-30", received: 0.2, story: "deckLate" },
  { material: "NM-C-FRAME-URB", plant: "1010", supplier: "Ciclometal", qty: 1800, due: "2026-10-09", received: 0.7 },
  { material: "NM-C-MOTOR250", plant: "1010", supplier: "Ilzwerk", qty: 2000, due: "2026-10-12", received: 0.9 },
  { material: "NM-C-DISPLAY", plant: "1310", supplier: "Lumadisplay", qty: 3200, due: "2026-10-20", received: 0.5 },
  { material: "NM-C-TYRE275", plant: "1020", supplier: "Gumiwerk", qty: 4000, due: "2026-10-22", received: 0 },
  // Delivered early, shortly before today:
  { material: "NM-C-BRAKE", plant: "1020", supplier: "Brakehorn", qty: 2100, due: "2026-10-05", received: 1, grDate: "2026-10-02" },
  { material: "NM-C-BATPACK", plant: "1010", supplier: "Norrlöv", qty: 300, due: "2026-10-08", received: 1, grDate: "2026-10-01" }
];

// Stock today. [material, plant, value share | fixed qty, safety stock, avg daily usage]
const PLANT_STOCK_VALUE = { 1010: 6200000, 1020: 4800000, 1310: 3900000, 1410: 2300000, 1510: 1200000 };
const STOCK = {
  1010: [["NM-EB-URBAN", 0.42, 300, 45], ["NM-EB-TRAIL", 0.38, 200, 30], ["NM-C-BATPACK", { qty: 540 }, 800, 60], ["NM-C-BMS", { qty: 700 }, 1000, 65],
    ["NM-C-FRAME-URB", 0.06, 600, 32], ["NM-C-MOTOR250", 0.08, 500, 50], ["NM-C-BRAKE", 0.02, 500, 50], ["NM-C-DISPLAY", 0.012, 500, 50], ["NM-C-TYRE275", 0.008, 1500, 100]],
  1020: [["NM-EB-CARGO", 0.82, 60, 11], ["NM-C-BATPACK", 0.06, 150, 12], ["NM-C-BMS", { qty: 0 }, 200, 12], ["NM-C-MOTOR250", 0.07, 150, 12],
    ["NM-C-BRAKE", 0.03, 150, 12], ["NM-C-DISPLAY", { qty: 0 }, 150, 12], ["NM-C-TYRE275", 0.02, 400, 24]],
  1310: [["NM-ES-S2", 0.3, 400, 32], ["NM-ES-S2-NODECK", 0.6, 0, 0], ["NM-C-DECK-S2", { qty: 0 }, 400, 32], ["NM-C-BMS", { qty: 0 }, 300, 32],
    ["NM-C-BATPACK", 0.07, 400, 32], ["NM-C-DISPLAY", 0.03, 300, 32]],
  1410: [["NM-C-FRAME-URB", 0.55, 500, 30], ["NM-C-BRAKE", 0.45, 400, 18], ["NM-C-TYRE275", { qty: 0 }, 1000, 36]],
  1510: [["NM-EB-URBAN", 0.35, 80, 6], ["NM-EB-TRAIL", 0.3, 60, 4], ["NM-ES-S2", 0.2, 100, 8], ["NM-EB-CARGO", { qty: 0 }, 20, 1], ["NM-SP-BAT48", { qty: 0 }, 200, 14]]
};
// Stock value history multipliers (Oct 25 .. Sep 26), 1.0 = today. Brno fills up from June when decks are missing.
const HISTORY = {
  1010: [0.9, 0.91, 0.88, 0.9, 0.92, 0.93, 0.94, 0.95, 0.96, 0.98, 0.99, 1],
  1020: [1.02, 1.03, 1, 1.01, 1.02, 1.01, 1, 0.99, 1, 1.01, 1, 1],
  1310: [0.7, 0.71, 0.69, 0.71, 0.72, 0.72, 0.73, 0.75, 0.8, 0.87, 0.94, 1],
  1410: [0.95, 0.97, 0.94, 0.96, 0.97, 0.98, 0.99, 1, 1.01, 1, 0.99, 1],
  1510: [0.85, 0.9, 1.05, 0.8, 0.82, 0.9, 0.98, 1.02, 1.05, 1.03, 1, 1]
};

function buildSupply() {
  const lines = [];
  // ---- Regular, completed POs
  FY.forEach((month, mi) => {
    const bySupplier = {};
    SOURCING.forEach(([material, plant, sup, monthlyQty]) => {
      const n = R.chance(0.4) ? 2 : 1;
      for (let k = 0; k < n; k++) {
        const due = randomDay(month, "2026-09-25");
        const line = { material, plant, supplier: sup, qty: Math.round(monthlyQty / n * R.float(0.85, 1.15) / 10) * 10, due };
        (bySupplier[sup] = bySupplier[sup] || []).push(line);
        lines.push(line);
      }
    });
    Object.entries(bySupplier).forEach(([sup, group]) => {
      const share = (LATE_SHARE[sup] || LATE_SHARE.default)[mi];
      // Story suppliers get an exact share of late lines; the others are late at random.
      const late = LATE_SHARE[sup] ? new Set(R.shuffle(group).slice(0, Math.round(share * group.length))) : new Set(group.filter(() => R.chance(share * 1.4)));
      group.forEach((line) => {
        const delay = late.has(line) ? (sup === "Lanmo" && mi >= 7 ? R.int(14, 40) : R.int(2, 12)) : -R.int(0, 4);
        line.grDate = addDays(line.due, delay);
        if (line.grDate > "2026-10-01") line.grDate = "2026-10-01";
        line.received = 1;
      });
    });
  });
  OPEN_POS.forEach((p) => lines.push(Object.assign({}, p)));

  // ---- Headers: PO date = due date minus lead time; numbers in chronological order
  lines.forEach((l) => { l.poDate = addDays(l.due, -LEAD_DAYS[l.supplier] - R.int(0, 5)); });
  lines.sort((a, b) => (a.poDate + a.material).localeCompare(b.poDate + b.material));
  const A_PurchaseOrder = [], A_PurchaseOrderItem = [];
  lines.forEach((l, i) => {
    const po = String(4500017001 + i);
    const sup = m.A_Supplier.find((s) => s.Supplier === supplier(l.supplier));
    A_PurchaseOrder.push({
      PurchaseOrder: po, PurchaseOrderType: "NB", Supplier: sup.Supplier, PurchaseOrderDate: l.poDate,
      PurchasingOrganization: "1010", PurchasingGroupName: sup.PurchasingGroupName, DocumentCurrency: "EUR"
    });
    const netPrice = round(price(l.material) * R.float(0.97, 1.03), 2);
    const receivedQty = Math.round(l.qty * l.received);
    const complete = l.received >= 1;
    const lateNow = !complete && l.due < TODAY;
    const status = complete ? "Delivered" : lateNow ? "Delayed" : receivedQty > 0 ? "In transit" : "Ordered";
    A_PurchaseOrderItem.push({
      PurchaseOrder: po, PurchaseOrderItem: "10", Material: l.material, Plant: l.plant,
      OrderQuantity: l.qty, PurchaseOrderQuantityUnit: "PC", NetPriceAmount: netPrice, NetAmount: round(netPrice * l.qty, 2), DocumentCurrency: "EUR",
      ScheduleLineDeliveryDate: l.due, GoodsReceiptDate: receivedQty > 0 ? (l.grDate || addDays(l.due, -R.int(3, 10))) : null,
      ReceivedQuantity: receivedQty, IsCompletelyDelivered: complete,
      OnTimeDelivery: complete ? l.grDate <= l.due : lateNow ? false : null,
      DaysLate: complete ? Math.max(0, daysBetween(l.due, l.grDate)) : lateNow ? daysBetween(l.due, TODAY) : 0,
      DeliveryStatusText: status
    });
    if (l.story) l.item = A_PurchaseOrderItem[A_PurchaseOrderItem.length - 1];
  });

  // ---- Stock today
  const A_MaterialStock = [];
  Object.entries(STOCK).forEach(([plant, rows]) => {
    const fixedValue = sum(rows.filter((r) => typeof r[1] === "object"), (r) => r[1].qty * price(r[0]));
    const shareTotal = sum(rows.filter((r) => typeof r[1] === "number"), (r) => r[1]);
    rows.forEach(([material, share, safety, usage]) => {
      const qty = typeof share === "object" ? share.qty : Math.round((PLANT_STOCK_VALUE[plant] - fixedValue) * share / shareTotal / price(material));
      A_MaterialStock.push({
        Material: material, Plant: plant, StorageLocation: "0001", StockQuantity: qty, MaterialBaseUnit: "PC",
        StockValue: round(qty * price(material), 2), Currency: "EUR", SafetyStockQuantity: safety, AvgDailyUsageQuantity: usage,
        DaysOfCover: usage ? round(qty / usage, 1) : null
      });
    });
  });

  // ---- Monthly stock value per plant
  const ZI_StockValueHistory = [];
  m.A_Plant.forEach((p) => {
    const today = sum(A_MaterialStock.filter((s) => s.Plant === p.Plant), (s) => s.StockValue);
    FY.forEach((month, i) => ZI_StockValueHistory.push({
      Plant: p.Plant, PlantName: p.PlantName, YearMonth: month,
      StockValue: round(today * HISTORY[p.Plant][i] * (i === 11 ? 1 : R.float(0.99, 1.01)), -3),
      StockTargetValue: p.StockTargetValue, Currency: "EUR"
    }));
  });

  const planted = {};
  lines.filter((l) => l.story).forEach((l) => { planted[l.story] = l.item; });
  return { A_PurchaseOrder, A_PurchaseOrderItem, A_MaterialStock, ZI_StockValueHistory, planted };
}

module.exports = { buildSupply };
