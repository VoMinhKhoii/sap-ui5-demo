// Sustainability: monthly emissions/energy/waste per plant (custom CDS view) and decarbonization initiatives.
// Planted story: the Leipzig paint-oven replacement was due 1 Apr 2026 and slipped. Leipzig's budget assumed the
// oven from April, so Leipzig alone explains the group CO2 overshoot. Brno buys grey electricity until its power
// purchase agreement starts in November, which alone keeps the group renewable share under 75%.
// Leipzig is also the only plant that recycles less than 90% of its waste (the group average is above 90%).
const { R, FY, round, sum } = require("./util");
const { A_Plant } = require("./master");
const plantName = (id) => A_Plant.find((p) => p.Plant === id).PlantName;

const SEASON = [1120, 1180, 1260, 1240, 1150, 1060, 980, 1010, 1040, 1150, 1120, 990];
const S = SEASON.map((v) => v / sum(SEASON));
const ACTUAL = { 1010: 3600, 1020: 4900, 1310: 2400, 1410: 1100, 1510: 480 };
const BUDGET = { 1010: 3800, 1020: 3700, 1310: 2400, 1410: 1200, 1510: 400 };
const PRIOR = { 1010: 4000, 1020: 4950, 1310: 2550, 1410: 1250, 1510: 520 };
const SCOPE1_SHARE = { 1010: 0.35, 1020: 0.75, 1310: 0.3, 1410: 0.4, 1510: 0.6 };
const ELECTRICITY = { 1010: 750, 1020: 670, 1310: 580, 1410: 250, 1510: 85 };
const GAS = { 1010: 300, 1020: 950, 1310: 220, 1410: 60, 1510: 0 };
const WASTE = { 1010: [40, 0.93], 1020: [55, 0.875], 1310: [30, 0.925], 1410: [25, 0.94], 1510: [10, 0.95] }; // only Leipzig recycles < 90%
const renewable = (plant, i) => ({ 1010: i >= 9 ? 0.88 : 0.78, 1020: 0.79, 1310: 0.31, 1410: 0.85, 1510: 0.9 })[plant];
const vehicles = (plant, i) => ({ 1010: 1700 + i * 25, 1020: 260, 1310: i >= 8 ? 560 : 700, 1410: 0, 1510: 0 })[plant];

function scaleTo(values, total) {
  const f = total / sum(values);
  const scaled = values.map((v) => round(v * f));
  scaled[scaled.length - 1] += total - sum(scaled); // keep the exact total
  return scaled;
}

function buildSustainability() {
  const ZI_PlantEmissions = [];
  Object.keys(ACTUAL).forEach((plant) => {
    let actual = S.map((s, i) => s * (plant === "1010" && i >= 9 ? 0.93 : 1) * R.float(0.97, 1.03)); // solar from July
    actual = scaleTo(actual, ACTUAL[plant]);
    let budget;
    if (plant === "1020") {
      // Budget assumed the electric oven from April: pre-April budget = actual, then a lot lower.
      const pre = actual.slice(0, 6);
      const post = scaleTo(S.slice(6), BUDGET[plant] - sum(pre));
      budget = pre.concat(post);
    } else {
      budget = scaleTo(S, BUDGET[plant]);
    }
    const prior = scaleTo(S.map((s) => s * R.float(0.97, 1.03)), PRIOR[plant]);
    FY.forEach((month, i) => {
      const winter = i <= 5 ? 1.1 : 0.92;
      const electricity = round(ELECTRICITY[plant] * winter * R.float(0.96, 1.04));
      const gas = round(GAS[plant] * (plant === "1020" ? 1 : winter) * R.float(0.95, 1.05));
      const scope1 = round(actual[i] * SCOPE1_SHARE[plant]);
      const [waste, recycleRate] = WASTE[plant];
      const wasteT = round(waste * R.float(0.9, 1.1), 1);
      ZI_PlantEmissions.push({
        Plant: plant, PlantName: plantName(plant), YearMonth: month,
        CO2eTonnes: actual[i], Scope1CO2eTonnes: scope1, Scope2CO2eTonnes: actual[i] - scope1,
        BudgetCO2eTonnes: budget[i], PriorYearCO2eTonnes: prior[i],
        ElectricityMWh: electricity, RenewableElectricityMWh: round(electricity * renewable(plant, i)),
        NaturalGasMWh: gas, VehiclesProduced: Math.round(vehicles(plant, i) * R.float(0.97, 1.03)),
        WasteTonnes: wasteT, RecycledWasteTonnes: round(wasteT * recycleRate * R.float(0.98, 1.02), 1)
      });
    });
  });

  const I = (n, InitiativeName, Plant, ResponsiblePerson, OriginalGoLiveDate, PlannedGoLiveDate, BudgetAmount, ProgressPercent, StatusText, ExpectedCO2eSavingTonnesPerMonth) => ({
    Initiative: "ESG-2026-0" + n, InitiativeName, Plant, PlantName: plantName(Plant), ResponsiblePerson, OriginalGoLiveDate, PlannedGoLiveDate,
    BudgetAmount, Currency: "EUR", ProgressPercent, StatusText, ExpectedCO2eSavingTonnesPerMonth
  });
  const ZI_SustainabilityInitiative = [
    I(1, "Rooftop solar 2.1 MWp", "1010", "Mia Schulz", "2026-06-30", "2026-06-30", 1850000, 100, "Live", 45),
    I(2, "Replace gas paint-shop oven", "1020", "Paul Richter", "2026-04-01", "2026-12-01", 2400000, 45, "Delayed", 200),
    I(3, "Green power purchase agreement", "1310", "Petra Dvořák", "2026-11-01", "2026-11-01", 0, 80, "On track", 110),
    I(4, "Heat recovery on compressors", "1410", "Rui Costa", "2026-12-15", "2026-12-15", 320000, 60, "On track", 8),
    I(5, "Electric forklift fleet", "1510", "Elena Ruiz", "2026-09-30", "2026-10-31", 540000, 25, "At risk", 6),
    I(6, "Battery cell recycling loop", "1010", "Mia Schulz", "2027-03-31", "2027-03-31", 1200000, 15, "On track", 12),
    I(7, "LED lighting retrofit", "1020", "Paul Richter", "2026-08-31", "2026-08-31", 210000, 100, "Live", 9)
  ];
  return { ZI_PlantEmissions, ZI_SustainabilityInitiative };
}

module.exports = { buildSustainability };
