// Documentation of the ERP entities: shown in the API Explorer and used by the q() helper for automatic joins.
// "scenarios" says which scenario uses a table; webapp/config.json switches scenarios on and off.
// Field names follow SAP S/4HANA APIs where they are readable. ZI_ views are custom CDS views (Z = customer namespace).

const ENTITIES = {
  A_Plant: {
    scenarios: ["sales", "supply-chain", "sustainability"],
    title: "Plants", area: "Master data", key: "Plant",
    description: "The 4 factories and the distribution center, with their stock target and CO2 budget.",
    fields: { Plant: "Plant ID (1010 = Hamburg ...)", PlantName: "Short name", CityName: "City", Country: "Country code", PlantCategoryText: "Production plant or Distribution center", MainProducts: "What the plant makes", StockTargetValue: "Target stock value in EUR", CO2eBudgetTonnes: "CO2e budget for the fiscal year, tonnes" }
  },
  A_Product: {
    scenarios: ["sales", "supply-chain"],
    title: "Products", area: "Master data", key: "Product",
    description: "Finished bikes and scooters (FERT), semi-finished goods (HALB) and bought-in components (ROH).",
    fields: { Product: "Product ID", ProductDescription: "Name", ProductType: "FERT / HALB / ROH", ProductTypeText: "Readable product type", ProductGroupText: "E-bikes, E-scooters, Spare parts, Components", StandardPrice: "Cost per piece in EUR (what it costs us)", ListPrice: "Dealer price per piece in EUR (finished products only)" }
  },
  A_Customer: {
    scenarios: ["sales"],
    title: "Customers", area: "Master data", key: "Customer",
    description: "30 business customers: bike dealers, fleet operators and online shops in 6 sales regions.",
    fields: { Customer: "Customer ID (business partner)", CustomerName: "Company name", CustomerGroup: "01 Dealer, 02 Fleet, 03 Online retail", Country: "Country code", CityName: "City", CustomerGroupText: "Dealer, Fleet or Online retail", SalesRegion: "DACH, Benelux, Nordics, France, Iberia, UK & Ireland", SalesRep: "Responsible sales rep", CustomerPaymentTerms: "NT30 = pay within 30 days, NT45 = 45 days", CreditLimitAmount: "Max. open invoices + open orders in EUR" }
  },
  A_Supplier: {
    scenarios: ["supply-chain"],
    title: "Suppliers", area: "Master data", key: "Supplier",
    description: "7 component suppliers in Europe and Asia.",
    fields: { Supplier: "Supplier ID", SupplierName: "Company name", Country: "Country code", CityName: "City", SupplierCategoryText: "What they supply", PurchasingGroupName: "Responsible buyer" }
  },
  A_SalesOrder: {
    scenarios: ["sales"],
    title: "Sales orders", area: "Sales", key: "SalesOrder",
    description: "Every customer order of the fiscal year plus the open order book. Values are the sum of the items.",
    fields: { SalesOrder: "Order number", SalesOrderType: "OR = standard order", SalesOrganization: "Selling unit (1010 = Northwind Motion)", DistributionChannel: "10 = direct sales", SoldToParty: "Customer ID → A_Customer", SalesOrderDate: "Date the order was placed", RequestedDeliveryDate: "Date the customer wants it", TotalNetAmount: "Net order value in EUR", OverallSDProcessStatus: "A = open, B = in process, C = completed", OverallSDProcessStatusText: "Readable status", OverallTotalDeliveryStatus: "A = not delivered, B = partially, C = fully", OverallTotalDeliveryStatusText: "Not delivered / Partially delivered / Fully delivered", DeliveryBlockReason: "Block code (01 = credit, Z1 = payment overdue, empty = none)", DeliveryBlockReasonText: "Why the order may not ship (empty = no block)" }
  },
  A_SalesOrderItem: {
    scenarios: ["sales"],
    title: "Sales order items", area: "Sales", key: "SalesOrder,SalesOrderItem",
    description: "The lines of each sales order: which product, how many, at what value.",
    fields: { SalesOrder: "Order number → A_SalesOrder", SalesOrderItem: "Line number (10, 20 ...)", Material: "Product ID → A_Product", SalesOrderItemText: "Product name", RequestedQuantity: "Ordered pieces", DeliveredQuantity: "Pieces delivered so far", NetAmount: "Net line value in EUR", ProductionPlant: "Plant that ships it → A_Plant" }
  },
  A_BillingDocument: {
    scenarios: ["sales"],
    title: "Invoices", area: "Sales", key: "BillingDocument",
    description: "One invoice per delivered order. Revenue = billed amounts. ClearingDate is empty while the customer has not paid.",
    fields: { BillingDocument: "Invoice number", BillingDocumentType: "F2 = invoice", SalesOrder: "Order number → A_SalesOrder", SoldToParty: "Customer ID → A_Customer", BillingDocumentDate: "Invoice date (counts as revenue in this month)", NetDueDate: "Payment due date", TotalNetAmount: "Invoice amount in EUR", ClearingDate: "Date the customer paid (null = not paid yet)", PaymentStatusText: "Paid, Open or Overdue (as of 5 Oct 2026)", DaysOverdue: "Days past the due date, 0 if not overdue", OpenAmount: "Amount still to be paid in EUR" }
  },
  ZI_SalesPlan: {
    scenarios: ["sales"],
    title: "Sales plan", area: "Sales", key: "SalesRegion,YearMonth",
    description: "Custom view: monthly revenue plan and prior-year revenue per sales region.",
    fields: { SalesRegion: "Region (matches A_Customer.SalesRegion)", YearMonth: "Month, e.g. 2026-06", PlanAmount: "Planned revenue in EUR", PriorYearAmount: "Revenue in the same month last year, EUR" }
  },
  A_PurchaseOrder: {
    scenarios: ["supply-chain"],
    title: "Purchase orders", area: "Supply chain", key: "PurchaseOrder",
    description: "Orders we placed with suppliers (header). The items hold material, plant, dates and quantities.",
    fields: { PurchaseOrder: "PO number", PurchaseOrderType: "NB = standard PO", Supplier: "Supplier ID → A_Supplier", PurchasingOrganization: "Buying unit", PurchaseOrderDate: "Date we ordered", PurchasingGroupName: "Buyer" }
  },
  A_PurchaseOrderItem: {
    scenarios: ["supply-chain"],
    title: "Purchase order items", area: "Supply chain", key: "PurchaseOrder,PurchaseOrderItem",
    description: "What we ordered from whom, when it was due and when it actually arrived.",
    fields: { PurchaseOrder: "PO number → A_PurchaseOrder", Material: "Component → A_Product", Plant: "Receiving plant → A_Plant", PurchaseOrderItem: "Line number", OrderQuantity: "Ordered pieces", NetPriceAmount: "Price per piece in EUR", NetAmount: "Line value in EUR", ScheduleLineDeliveryDate: "Agreed delivery date", GoodsReceiptDate: "Date it arrived (last receipt, null = nothing arrived)", ReceivedQuantity: "Pieces received so far", IsCompletelyDelivered: "true when everything arrived", OnTimeDelivery: "true = on time, false = late, null = not due yet", DaysLate: "Days after the agreed date", DeliveryStatusText: "Delivered, In transit, Delayed or Ordered" }
  },
  A_MaterialStock: {
    scenarios: ["supply-chain"],
    title: "Stock", area: "Supply chain", key: "Material,Plant",
    description: "Stock per material and plant today (5 Oct 2026).",
    fields: { Material: "Product ID → A_Product", Plant: "Plant → A_Plant", StorageLocation: "Storage location in the plant", StockQuantity: "Pieces in stock", StockValue: "Stock value in EUR (quantity x cost)", SafetyStockQuantity: "Minimum we want to keep", AvgDailyUsageQuantity: "Pieces used or sold per day", DaysOfCover: "How many days the stock lasts (null if no usage)" }
  },
  ZI_StockValueHistory: {
    scenarios: ["supply-chain"],
    title: "Stock value history", area: "Supply chain", key: "Plant,YearMonth",
    description: "Custom view: stock value per plant at each month end.",
    fields: { Plant: "Plant → A_Plant", PlantName: "Plant name (Hamburg, Leipzig …)", YearMonth: "Month, e.g. 2026-06", StockValue: "Stock value in EUR", StockTargetValue: "Target stock value in EUR" }
  },
  ZI_PlantEmissions: {
    scenarios: ["sustainability"],
    title: "Plant emissions & energy", area: "Sustainability", key: "Plant,YearMonth",
    description: "Custom view: monthly CO2e, energy, production and waste per plant.",
    fields: { Plant: "Plant → A_Plant", PlantName: "Plant name (Hamburg, Leipzig …)", YearMonth: "Month, e.g. 2026-06", CO2eTonnes: "Scope 1 + 2 emissions, tonnes", Scope1CO2eTonnes: "Direct emissions (gas, diesel)", Scope2CO2eTonnes: "Emissions from bought electricity", BudgetCO2eTonnes: "Monthly CO2e budget", PriorYearCO2eTonnes: "Same month last year", ElectricityMWh: "Electricity used", RenewableElectricityMWh: "Part of it from renewable sources", NaturalGasMWh: "Gas used", VehiclesProduced: "Bikes and scooters built", WasteTonnes: "Production waste", RecycledWasteTonnes: "Part of it recycled" }
  },
  ZI_SustainabilityInitiative: {
    scenarios: ["sustainability"],
    title: "Sustainability initiatives", area: "Sustainability", key: "Initiative",
    description: "Custom view: decarbonization projects in the 2026 budget.",
    fields: { Initiative: "Project ID", InitiativeName: "Name", Plant: "Plant → A_Plant", PlantName: "Plant name (Hamburg, Leipzig …)", ResponsiblePerson: "Owner", OriginalGoLiveDate: "Go-live date when approved", PlannedGoLiveDate: "Go-live date today", BudgetAmount: "Budget in EUR", ProgressPercent: "0-100", StatusText: "Live, On track, At risk, Delayed", ExpectedCO2eSavingTonnesPerMonth: "CO2e saved per month once live" }
  }
};

// field on the left entity → key of the right entity. Used by q().join("A_Customer") to find the key automatically.
const RELATIONS = [
  ["A_SalesOrder", "SoldToParty", "A_Customer", "Customer"],
  ["A_SalesOrderItem", "SalesOrder", "A_SalesOrder", "SalesOrder"],
  ["A_SalesOrderItem", "Material", "A_Product", "Product"],
  ["A_SalesOrderItem", "ProductionPlant", "A_Plant", "Plant"],
  ["A_BillingDocument", "SoldToParty", "A_Customer", "Customer"],
  ["A_BillingDocument", "SalesOrder", "A_SalesOrder", "SalesOrder"],
  ["A_PurchaseOrder", "Supplier", "A_Supplier", "Supplier"],
  ["A_PurchaseOrderItem", "PurchaseOrder", "A_PurchaseOrder", "PurchaseOrder"],
  ["A_PurchaseOrderItem", "Material", "A_Product", "Product"],
  ["A_PurchaseOrderItem", "Plant", "A_Plant", "Plant"],
  ["A_MaterialStock", "Material", "A_Product", "Product"],
  ["A_MaterialStock", "Plant", "A_Plant", "Plant"],
  ["ZI_StockValueHistory", "Plant", "A_Plant", "Plant"],
  ["ZI_PlantEmissions", "Plant", "A_Plant", "Plant"],
  ["ZI_SustainabilityInitiative", "Plant", "A_Plant", "Plant"]
].map(([from, field, to, key]) => ({ from, field, to, key }));

module.exports = { ENTITIES, RELATIONS };
