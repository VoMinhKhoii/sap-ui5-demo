sap.ui.define([], function () {
  "use strict";

  /*
   * YOUR DATA. Every entry below becomes a path you can bind in your pages:
   *   emissionsByMonth: q(...)   →   data="{/emissionsByMonth}" in a chart, items="{/emissionsByMonth}" in a list
   *
   * 1. Try a query in the kit's Query Playground (tab 1) until the result looks right.
   * 2. Click "Copy for data.js" and paste it between the 🧩 markers below.
   * 3. Save, press F5 in your app. Broken query? A message tells you which one and why.
   *
   * q("Entity")                       start from an ERP table (see the API Explorer for all of them)
   *   .join("A_Plant")                add fields of a related table (key is found automatically)
   *   .where("PlantName", "Brno")     keep matching rows   ·  .where("CO2eTonnes", ">", 400)  ·  .where(r => ...)
   *   .groupBy("PlantName")           one row per value    →  { name, value, count, share }
   *   .byMonth("YearMonth")           one row per month    →  { month: "Jun 26", period, value }
   *   .sum("CO2eTonnes")              also avg, min, max, count(), percent("Field"), ratio("A", "B")
   *   .sum("BudgetCO2eTonnes", "target")   a second number under its own name
   *   .withState()                    adds state (Good/Critical/Error) from value vs. target
   *   .sortBy("value", "desc").top(5)
   *   .first()                        one row as an object  →  {/myQuery/PlantName}
   * Without groupBy/byMonth, sum/count/... return one number  →  {/myQuery}
   */
  return function (q) {
    return {
      // Example: CO2e per month. Bind a chart to {/emissionsByMonth} with {month} and {value}.
      emissionsByMonth: q("ZI_PlantEmissions")
        .byMonth("YearMonth")
        .sum("CO2eTonnes"),

      // Used by the "List → detail" page layout in the gallery.
      plants: q("A_Plant")
        .include("ZI_PlantEmissions", "months")
        .include("ZI_SustainabilityInitiative", "initiatives")
        .compute("CO2eTonnes", (p) => p.months.reduce((s, m) => s + m.CO2eTonnes, 0)),

      // 🧩 YOUR QUERIES START

      // 🧩 YOUR QUERIES END
    };
  };
});
