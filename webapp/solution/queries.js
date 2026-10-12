sap.ui.define([], function () {
  "use strict";

  /*
   * REFERENCE SOLUTION: the data.js a team could write for the three sustainability cases.
   * Same format as webapp/workspace/data.js, so it can be copied there as-is.
   * The page that uses it is webapp/view/Solution.view.xml.
   */
  return function (q) {
    return {
      // ---- Case 1: The recycling claim. Is "every plant recycles at least 90%" true?
      recyclingByPlant: q("ZI_PlantEmissions")
        .groupBy("PlantName")
        .ratio("RecycledWasteTonnes", "WasteTonnes")
        .compute("target", () => 90)
        .withState()
        .sortBy("value"),
      recyclingGroup: q("ZI_PlantEmissions")
        .ratio("RecycledWasteTonnes", "WasteTonnes"),
      recyclingLeipzig: q("ZI_PlantEmissions")
        .where("PlantName", "Leipzig")
        .ratio("RecycledWasteTonnes", "WasteTonnes"),

      // ---- Case 2: The renewable gap. Which plant keeps us below 75%?
      renewableByPlant: q("ZI_PlantEmissions")
        .groupBy("PlantName")
        .ratio("RenewableElectricityMWh", "ElectricityMWh")
        .compute("target", () => 75)
        .withState()
        .sortBy("value"),
      renewableGroup: q("ZI_PlantEmissions")
        .ratio("RenewableElectricityMWh", "ElectricityMWh"),
      renewableWithoutBrno: q("ZI_PlantEmissions")
        .where("PlantName", "!=", "Brno")
        .ratio("RenewableElectricityMWh", "ElectricityMWh"),
      hamburgRenewableByMonth: q("ZI_PlantEmissions")
        .where("PlantName", "Hamburg")
        .byMonth("YearMonth")
        .ratio("RenewableElectricityMWh", "ElectricityMWh"),
      brnoProject: q("ZI_SustainabilityInitiative")
        .where("PlantName", "Brno")
        .first(),

      // ---- Case 3: The CO2 overshoot. Which plant caused it, and since when?
      co2ByPlant: q("ZI_PlantEmissions")
        .groupBy("PlantName")
        .sum("CO2eTonnes")
        .sum("BudgetCO2eTonnes", "target")
        .withState(false),
      co2Group: q("ZI_PlantEmissions")
        .compute("Group", () => "All plants")
        .groupBy("Group")
        .sum("CO2eTonnes")
        .sum("BudgetCO2eTonnes", "target")
        .first(),
      co2Leipzig: q("ZI_PlantEmissions")
        .where("PlantName", "Leipzig")
        .groupBy("PlantName")
        .sum("CO2eTonnes")
        .sum("BudgetCO2eTonnes", "target")
        .first(),
      leipzigByMonth: q("ZI_PlantEmissions")
        .where("PlantName", "Leipzig")
        .byMonth("YearMonth")
        .sum("CO2eTonnes")
        .sum("BudgetCO2eTonnes", "budget"),
      leipzigOven: q("ZI_SustainabilityInitiative")
        .where("PlantName", "Leipzig")
        .where("StatusText", "Delayed")
        .first()
    };
  };
});
