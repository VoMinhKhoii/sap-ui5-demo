// Master data of the fictional company Northwind Motion GmbH. Every company name here is invented.
// Plant numbers follow SAP demo conventions; nothing points to a real system.

const COMPANY = "Northwind Motion GmbH";

const A_Plant = [
  { Plant: "1010", PlantName: "Hamburg", CityName: "Hamburg", Country: "DE", PlantCategoryText: "Production plant", MainProducts: "E-bikes Urban and Trail", StockTargetValue: 6000000, CO2eBudgetTonnes: 3800, Currency: "EUR" },
  { Plant: "1020", PlantName: "Leipzig", CityName: "Leipzig", Country: "DE", PlantCategoryText: "Production plant", MainProducts: "Cargo e-bikes, frame paint shop", StockTargetValue: 5000000, CO2eBudgetTonnes: 3700, Currency: "EUR" },
  { Plant: "1310", PlantName: "Brno", CityName: "Brno", Country: "CZ", PlantCategoryText: "Production plant", MainProducts: "E-scooters", StockTargetValue: 2800000, CO2eBudgetTonnes: 2400, Currency: "EUR" },
  { Plant: "1410", PlantName: "Porto", CityName: "Porto", Country: "PT", PlantCategoryText: "Production plant", MainProducts: "Wheels and components", StockTargetValue: 2400000, CO2eBudgetTonnes: 1200, Currency: "EUR" },
  { Plant: "1510", PlantName: "Valencia DC", CityName: "Valencia", Country: "ES", PlantCategoryText: "Distribution center", MainProducts: "Distribution and spare parts", StockTargetValue: 1300000, CO2eBudgetTonnes: 400, Currency: "EUR" }
];

// ProductType follows SAP: FERT = finished good, HALB = semi-finished, ROH = raw material / bought-in component.
const P = (Product, ProductDescription, ProductType, ProductGroupText, StandardPrice, ListPrice) => ({
  Product, ProductDescription, ProductType,
  ProductTypeText: { FERT: "Finished product", HALB: "Semi-finished product", ROH: "Component" }[ProductType],
  ProductGroupText, BaseUnit: "PC", StandardPrice, ListPrice: ListPrice || null, Currency: "EUR"
});
const A_Product = [
  P("NM-EB-URBAN", "E-bike Urban", "FERT", "E-bikes", 1300, 1900),
  P("NM-EB-TRAIL", "E-bike Trail", "FERT", "E-bikes", 1550, 2400),
  P("NM-EB-CARGO", "Cargo e-bike", "FERT", "E-bikes", 2350, 3300),
  P("NM-ES-S2", "E-scooter S2", "FERT", "E-scooters", 720, 1020),
  P("NM-SP-BAT48", "Spare battery 48V", "FERT", "Spare parts", 170, 245),
  P("NM-ES-S2-NODECK", "E-scooter S2, unfinished (no deck)", "HALB", "E-scooters", 560),
  P("NM-C-BATPACK", "Li-ion battery pack 48V", "ROH", "Components", 237),
  P("NM-C-BMS", "Battery management board", "ROH", "Components", 38.6),
  P("NM-C-FRAME-URB", "Aluminium frame Urban", "ROH", "Components", 84),
  P("NM-C-DECK-S2", "Scooter deck assembly", "ROH", "Components", 132),
  P("NM-C-MOTOR250", "Hub motor 250W", "ROH", "Components", 106),
  P("NM-C-BRAKE", "Hydraulic disc brake set", "ROH", "Components", 23),
  P("NM-C-DISPLAY", "LCD display unit", "ROH", "Components", 19.8),
  P("NM-C-TYRE275", "Tyre 27.5in puncture-proof", "ROH", "Components", 6.95)
];

const SALES_REPS = { DACH: "Jonas Weber", Benelux: "Sanne de Vries", Nordics: "Erik Lund", France: "Claire Dubois", Iberia: "Lucía Martín", "UK & Ireland": "Oliver Grant" };
const GROUPS = { Dealer: "01", Fleet: "02", "Online retail": "03" };

const C = (n, CustomerName, group, Country, CityName, SalesRegion) => ({
  Customer: String(17100000 + n), CustomerName, CustomerGroup: GROUPS[group], CustomerGroupText: group,
  Country, CityName, SalesRegion, SalesRep: SALES_REPS[SalesRegion],
  CustomerPaymentTerms: group === "Fleet" ? "NT45" : "NT30", CreditLimitAmount: 0, Currency: "EUR"
});
const A_Customer = [
  C(1, "Pedalfuchs Handels GmbH", "Dealer", "DE", "Munich", "DACH"),
  C(2, "Spurwerk Mobil AG", "Fleet", "DE", "Berlin", "DACH"),
  C(3, "Kettenglanz Radsport KG", "Dealer", "DE", "Cologne", "DACH"),
  C(4, "Voltspeiche Online GmbH", "Online retail", "DE", "Hamburg", "DACH"),
  C(5, "Stadtflotte Mobility GmbH", "Fleet", "DE", "Frankfurt", "DACH"),
  C(6, "Donaurad Vertrieb GmbH", "Dealer", "AT", "Linz", "DACH"),
  C(7, "Pedalhaus Wien GmbH", "Dealer", "AT", "Vienna", "DACH"),
  C(8, "Gipfelrad AG", "Dealer", "CH", "Zurich", "DACH"),
  C(11, "Trapkracht B.V.", "Dealer", "NL", "Utrecht", "Benelux"),
  C(12, "Grachtwiel Fleet B.V.", "Fleet", "NL", "Amsterdam", "Benelux"),
  C(13, "Fietsenkade Online B.V.", "Online retail", "NL", "Rotterdam", "Benelux"),
  C(14, "Velokern BV", "Dealer", "BE", "Ghent", "Benelux"),
  C(15, "Moselrad S.à r.l.", "Dealer", "LU", "Luxembourg", "Benelux"),
  C(21, "Fjordtrail AB", "Dealer", "SE", "Gothenburg", "Nordics"),
  C(22, "Kvarnhjul AB", "Dealer", "SE", "Uppsala", "Nordics"),
  C(23, "Sundcykel ApS", "Dealer", "DK", "Copenhagen", "Nordics"),
  C(24, "Vintervei Flåte AS", "Fleet", "NO", "Oslo", "Nordics"),
  C(25, "Saimaan Pyöräpiste Oy", "Dealer", "FI", "Lappeenranta", "Nordics"),
  C(31, "Kiloverde Fleet SAS", "Fleet", "FR", "Paris", "France"),
  C(32, "Cyclorade SARL", "Dealer", "FR", "Lyon", "France"),
  C(33, "Pédalune SAS", "Online retail", "FR", "Lille", "France"),
  C(34, "Vélobrume SARL", "Dealer", "FR", "Nantes", "France"),
  C(35, "Gravillon Cycles SARL", "Dealer", "FR", "Bordeaux", "France"),
  C(41, "Rodavia S.L.", "Dealer", "ES", "Madrid", "Iberia"),
  C(42, "Biciazahar Levante S.L.", "Dealer", "ES", "Valencia", "Iberia"),
  C(43, "Tranvelo Urbano S.L.", "Fleet", "ES", "Barcelona", "Iberia"),
  C(44, "Ciclotâmega Lda.", "Dealer", "PT", "Porto", "Iberia"),
  C(51, "Larkspoke Mobility Ltd", "Fleet", "GB", "London", "UK & Ireland"),
  C(52, "Thistlecog Cycles Ltd", "Dealer", "GB", "Edinburgh", "UK & Ireland"),
  C(53, "Liffeyspoke Ltd", "Dealer", "IE", "Dublin", "UK & Ireland")
];

const S = (n, SupplierName, Country, CityName, SupplierCategoryText, PurchasingGroupName) => ({
  Supplier: String(17300000 + n), SupplierName, Country, CityName, SupplierCategoryText, PurchasingGroupName
});
const A_Supplier = [
  S(1, "Lanmo Cellworks Co., Ltd.", "CN", "Shenzhen", "Battery cells and electronics", "Anna Novak"),
  S(2, "Norrlöv Batterier AB", "SE", "Skellefteå", "Battery cells and electronics", "Tomás Horák"),
  S(3, "Ciclometal Indústria Lda.", "PT", "Águeda", "Frames and structural parts", "João Pereira"),
  S(4, "Ilzwerk Antriebe GmbH", "DE", "Landshut", "Drive systems", "Lena Fischer"),
  S(5, "Brakehorn Components GmbH", "AT", "Graz", "Brakes", "Lena Fischer"),
  S(6, "Lumadisplay Ltd.", "TW", "Taichung", "Displays", "Anna Novak"),
  S(7, "Gumiwerk Kft.", "HU", "Győr", "Tyres", "Tomás Horák")
];

const REGIONS = ["DACH", "Benelux", "Nordics", "France", "Iberia", "UK & Ireland"];

module.exports = { COMPANY, A_Plant, A_Product, A_Customer, A_Supplier, REGIONS, SALES_REPS };
