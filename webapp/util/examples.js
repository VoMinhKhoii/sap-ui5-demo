sap.ui.define([], function () {
  "use strict";

  // Starter queries for the Query Playground, per scenario. They show the techniques, not the answers to the cases.
  // "plants" also feeds the List → detail layout (gallery preview and the workspace's data.js).
  return [
    { id: "emissionsByMonth", scenario: "sustainability", title: "CO2e per month, all plants",
      code: "q(\"ZI_PlantEmissions\")\n  .byMonth(\"YearMonth\")\n  .sum(\"CO2eTonnes\")" },
    { id: "emissionsVsBudget", scenario: "sustainability", title: "CO2e per month vs. budget",
      code: "q(\"ZI_PlantEmissions\")\n  .byMonth(\"YearMonth\")\n  .sum(\"CO2eTonnes\")\n  .sum(\"BudgetCO2eTonnes\", \"budget\")" },
    { id: "scopesByPlant", scenario: "sustainability", title: "Scope 1 and Scope 2 per plant",
      code: "q(\"ZI_PlantEmissions\")\n  .groupBy(\"PlantName\")\n  .sum(\"Scope1CO2eTonnes\", \"scope1\")\n  .sum(\"Scope2CO2eTonnes\", \"scope2\")" },
    { id: "vehiclesByPlant", scenario: "sustainability", title: "Vehicles built per plant",
      code: "q(\"ZI_PlantEmissions\")\n  .where(\"VehiclesProduced\", \">\", 0)\n  .groupBy(\"PlantName\")\n  .sum(\"VehiclesProduced\")" },
    { id: "electricitySplit", scenario: "sustainability", title: "Electricity per month: Hamburg vs. the rest",
      code: "q(\"ZI_PlantEmissions\")\n  .byMonth(\"YearMonth\")\n  .sum(\"ElectricityMWh\", \"Hamburg\", (r) => r.PlantName === \"Hamburg\")\n  .sum(\"ElectricityMWh\", \"Others\", (r) => r.PlantName !== \"Hamburg\")" },
    { id: "recyclingVsTarget", scenario: "sustainability", title: "Recycling rate per plant vs. a 90% target",
      code: "q(\"ZI_PlantEmissions\")\n  .groupBy(\"PlantName\")\n  .ratio(\"RecycledWasteTonnes\", \"WasteTonnes\")\n  .compute(\"target\", () => 90)\n  .withState()" },
    { id: "initiativesByStatus", scenario: "sustainability", title: "Initiatives per status",
      code: "q(\"ZI_SustainabilityInitiative\")\n  .groupBy(\"StatusText\")\n  .count()" },
    { id: "initiatives", scenario: "sustainability", title: "Initiatives as a table",
      code: "q(\"ZI_SustainabilityInitiative\")\n  .select(\"InitiativeName\", \"PlantName\", \"PlannedGoLiveDate\", \"ProgressPercent\", \"StatusText\")\n  .sortBy(\"PlannedGoLiveDate\")" },
    { id: "totalCo2", scenario: "sustainability", title: "One number: CO2e this year",
      code: "q(\"ZI_PlantEmissions\")\n  .sum(\"CO2eTonnes\")" },
    { id: "plants", scenario: "sustainability", preview: true, title: "Plants with their months and initiatives (for List → detail)",
      code: "q(\"A_Plant\")\n  .include(\"ZI_PlantEmissions\", \"months\")\n  .include(\"ZI_SustainabilityInitiative\", \"initiatives\")\n  .compute(\"CO2eTonnes\", (p) => p.months.reduce((s, m) => s + m.CO2eTonnes, 0))" },

    { id: "revenueByMonth", scenario: "sales", title: "Revenue per month",
      code: "q(\"A_BillingDocument\")\n  .byMonth(\"BillingDocumentDate\")\n  .sum(\"TotalNetAmount\")" },
    { id: "revenueVsPlan", scenario: "sales", title: "Revenue vs. plan per month",
      code: "q(\"A_BillingDocument\")\n  .byMonth(\"BillingDocumentDate\")\n  .sum(\"TotalNetAmount\")\n  .merge(q(\"ZI_SalesPlan\").byMonth(\"YearMonth\").sum(\"PlanAmount\"), \"plan\")" },
    { id: "ordersByGroup", scenario: "sales", title: "Orders per customer group",
      code: "q(\"A_SalesOrder\")\n  .join(\"A_Customer\")\n  .groupBy(\"CustomerGroupText\")\n  .count()" },
    { id: "topProducts", scenario: "sales", title: "Top 5 products by revenue",
      code: "q(\"A_SalesOrderItem\")\n  .join(\"A_Product\")\n  .groupBy(\"ProductDescription\")\n  .sum(\"NetAmount\")\n  .sortBy(\"value\", \"desc\")\n  .top(5)" },
    { id: "openOrderValue", scenario: "sales", title: "One number: value of open orders",
      code: "q(\"A_SalesOrder\")\n  .where(\"OverallSDProcessStatus\", \"!=\", \"C\")\n  .sum(\"TotalNetAmount\")" },

    { id: "stockByType", scenario: "supply-chain", title: "Stock value per product type",
      code: "q(\"A_MaterialStock\")\n  .join(\"A_Product\")\n  .groupBy(\"ProductTypeText\")\n  .sum(\"StockValue\")" },
    { id: "onTimeByMonth", scenario: "supply-chain", title: "On-time delivery % per month",
      code: "q(\"A_PurchaseOrderItem\")\n  .where(\"IsCompletelyDelivered\", true)\n  .byMonth(\"ScheduleLineDeliveryDate\")\n  .percent(\"OnTimeDelivery\")" },
    { id: "bigOrders", scenario: "supply-chain", title: "Largest purchase orders (table)",
      code: "q(\"A_PurchaseOrderItem\")\n  .join(\"A_Product\")\n  .select(\"PurchaseOrder\", \"ProductDescription\", \"Plant\", \"NetAmount\", \"DeliveryStatusText\")\n  .sortBy(\"NetAmount\", \"desc\")\n  .top(10)" },

    { id: "onePlant", scenario: "all", title: "One record: a plant",
      code: "q(\"A_Plant\")\n  .where(\"PlantName\", \"Hamburg\")\n  .first()" }
  ];
});
