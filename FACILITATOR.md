# Facilitator guide: cases, answers, marking

For facilitators and judges only. It contains the answers. Students can technically read it in the
repo, so don't point them here. Every number below comes from the generated data. If you change
`tools/erp/*.js`, rerun `npm run generate-api`: its story checks fail if a case stops working.

**The workshop runs the sustainability scenario only** (3 cases, easy → hard). The sales and supply
chain cases are switched off. To turn them on, add `"sales"` and/or `"supply-chain"` to
`webapp/config.json`, or open the kit with `?scenarios=all` for a quick look.

**Reference solution:** the kit's *Reference Solution* page has one finished answer page per case.
Its queries are in `webapp/solution/queries.js`, in the same format as a team's `data.js`.

## Run of show (45 min + pitches)

| Time | What happens | You do |
| --- | --- | --- |
| 0–5 | Teams pick a case on **Start here**, open **Open my app** in a 2nd tab | Demo: Playground → *Copy for data.js* → *Copy XML* → F5 (60 seconds) |
| 5–20 | Investigate in the **Query Playground** | Walk around. Ask "what does the client believe, and is it true?" |
| 15 | | Announce: "Hint 1 is open now" |
| 20–25 | Decide the story: finding, evidence, action | Push teams that are still exploring to start building |
| 25 | | Announce: "Hint 2 is open now. Start building page 1" |
| 25–40 | Build page 1 (pages 2–3 and a custom shell are stretch goals) | Help with XML errors (F12 → Console) |
| 40–45 | Freeze code | |
| then | 2-minute pitch per team | Mark with the rubric below |

**Reset a team's machine:** `git checkout webapp/workspace` restores the workspace, including `data.js`.

## Marking rubric (100 points)

| Criterion | Points | Full marks | Half marks |
| --- | --- | --- | --- |
| **Insight** | 30 | Names the real cause, rejects the client's assumption with a number | Right area, but no number, or the assumption isn't addressed |
| **Evidence** | 25 | 1–2 charts that prove the point on their own. Right chart type, labelled units, honest scale | Charts are correct but generic (e.g. the level-1 trend) and don't show the cause |
| **Clarity** | 20 | Passes the 3-second test: the finding is the first thing you read, the action is concrete | Everything is there but the reader has to hunt for it |
| **Fiori craft** | 15 | Semantic colours (Good/Critical/Error) used for meaning, consistent cards, works narrow | Default look, colour used decoratively |
| **Ambition** | 10 | Extra pages that serve the story, own shell, list → detail, working filter or drill-down | One extra element |

A team that builds a beautiful dashboard of the *wrong* answer can still score Evidence, Clarity and
Craft, but loses most of Insight. That is the lesson: the data decides, not the client's assumption.

## The cases (sustainability, switched on)

### A. The recycling claim (Easy, Head of Communications)

- **Trap:** the annual report says "every plant recycles at least 90% of its waste". Communications
  thinks it's true because the group average is **91.1%**.
- **Truth:** **Leipzig recycles only 87.5%**. The other four plants are at 92–95%. The average hides
  one plant below the line.
- **Winning query:**
  ```js
  recyclingByPlant: q("ZI_PlantEmissions").groupBy("PlantName")
    .ratio("RecycledWasteTonnes", "WasteTonnes").compute("target", () => 90).withState().sortBy("value"),
  ```
- **Good action:** rewrite the sentence (e.g. "the group recycles 91%; four of five plants are above
  90%") and ask Leipzig for a plan.

### B. The renewable gap (Medium, CSO)

- **Trap:** "The new Hamburg solar roof isn't working well." (Group share: **68.6%** vs. a 75% target.)
- **Truth:** Hamburg's renewable share went **from 78% to 88%** when the roof went live in July.
  Brno is at **31%** because it buys grey electricity. Without Brno the group would be at
  **81%**, above the 75% target. Brno's power purchase agreement starts on **1 November** (on track,
  80%), which fixes it.
- **Winning queries:**
  ```js
  renewableByPlant: q("ZI_PlantEmissions").groupBy("PlantName")
    .ratio("RenewableElectricityMWh", "ElectricityMWh").compute("target", () => 75).withState(),
  hamburgByMonth: q("ZI_PlantEmissions").where("Plant", "1010").byMonth("YearMonth")
    .ratio("RenewableElectricityMWh", "ElectricityMWh"),
  ```
- **Good action:** report the gap as Brno-only and temporary, with the date it closes. A strong team
  also shows the "without Brno" number.


### C. The CO2 overshoot (Harder, CSO)

- **Trap:** "The new Porto wheel line drove emissions up."
- **Truth:** Porto is **under** its budget (1,100 t vs. 1,200 t). Leipzig is **+1,200 t (+32%)**,
  which is more than the whole group overshoot of +980 t. Leipzig was exactly on budget until
  March. From April its budget assumed the new electric paint oven, but the oven project slipped
  (original go-live 1 Apr, now 1 Dec, 45% done). That means about 200 t extra every month.
- **Winning queries:**
  ```js
  co2ByPlant: q("ZI_PlantEmissions").groupBy("PlantName").sum("CO2eTonnes")
    .sum("BudgetCO2eTonnes", "target").withState(false),
  leipzigByMonth: q("ZI_PlantEmissions").where("Plant", "1020").byMonth("YearMonth")
    .sum("CO2eTonnes").sum("BudgetCO2eTonnes", "budget"),
  ```
- **Good action:** a board decision to accelerate the oven project (or a temporary electric oven
  lease), and an honest investor message that the overshoot has one cause and a known end date.


## Cases behind the flag (sales and supply chain)

### 1. The cash leak (sales, CFO)

- **Trap:** "Everyone pays slower, so tighten payment terms for all customers."
- **Truth:** one customer holds most of the overdue money. Kiloverde Fleet SAS owes **EUR 612k**,
  **38 days** overdue, which is **64%** of the EUR 964k that is overdue. The other names are small:
  Spurwerk 142k, Fjordtrail 121k, Velokern 89k. Kiloverde also has a **EUR 306k order on hold**
  (delivery block "Customer payment overdue").
- **Winning queries:**
  ```js
  overdueByCustomer: q("A_BillingDocument").where("PaymentStatusText", "Overdue")
    .join("A_Customer").groupBy("CustomerName").sum("OpenAmount").sortBy("value", "desc"),
  overdueByMonth: q("A_BillingDocument").where("PaymentStatusText", "!=", "Paid")
    .byMonth("NetDueDate").sum("OpenAmount"),
  ```
- **Good action:** escalate Kiloverde (collections call, keep the delivery block, payment plan), and
  don't change terms for everyone.
- **Bonus:** a list → detail page of customers with their invoices.

### 2. The plan gap (sales, Head of Sales)

- **Trap:** "The Nordics cost us the plan", because a Nordic dealer was just credit-blocked.
- **Truth:** the Nordics are only **−2.7%**. **France is −15.8%** (EUR 6.9M vs. 8.2M) and is the
  furthest behind. France tracked the plan until March, then fell 25% short every month from April.
  Kiloverde, France's biggest customer, has billed nothing since July, because its orders stopped
  after the payment problem (see case 1). Iberia (−10.6%) and the UK (−9.8%) are also behind, but
  they are small.
- **Winning queries:**
  ```js
  regionVsPlan: q("A_BillingDocument").join("A_Customer").groupBy("SalesRegion").sum("TotalNetAmount")
    .merge(q("ZI_SalesPlan").groupBy("SalesRegion").sum("PlanAmount"), "target").withState(),
  franceByMonth: q("A_BillingDocument").join("A_Customer").where("SalesRegion", "France")
    .byMonth("BillingDocumentDate").sum("TotalNetAmount")
    .merge(q("ZI_SalesPlan").where("SalesRegion", "France").byMonth("YearMonth").sum("PlanAmount"), "plan"),
  ```
- **Good action:** a recovery plan for France (resolve Kiloverde, rebuild the Q1 pipeline), and leave
  the Nordics alone.

### 3. Christmas at risk (supply chain, COO)

- **Trap:** "Aluminium frames are the bottleneck." A frame PO is still open.
- **Truth:** frames are fine: **138 days of cover** at Hamburg, and the open PO is 70% delivered and
  in transit. The line stops because of **Lanmo Cellworks**: battery packs last **9 days**, BMS
  boards **11 days**. Lanmo delivered only **35%** of PO 4500017282 (1,200 packs, due 28 Sep). Its
  on-time rate is **76%**, against about 94% for every other supplier. The second battery source,
  **Norrlöv Batterier, is 100% on time**.
- **Winning queries:**
  ```js
  hamburgCover: q("A_MaterialStock").where("Plant", "1010").join("A_Product")
    .select("ProductDescription", "StockQuantity", "DaysOfCover").sortBy("DaysOfCover"),
  supplierOnTime: q("A_PurchaseOrderItem").where("IsCompletelyDelivered", true).join("A_PurchaseOrder")
    .join("A_Supplier").groupBy("SupplierName").percent("OnTimeDelivery").sortBy("value"),
  ```
- **Good action:** shift battery volume to Norrlöv now, expedite or air-freight the Lanmo backlog,
  and escalate with Lanmo.

### 4. The full warehouse (supply chain, CFO)

- **Trap:** "Cut Hamburg's stock by 10%, it's our biggest warehouse."
- **Truth:** Hamburg is only **+3%** over its own target. **Brno is +39%** (EUR 3.9M vs. 2.8M), and
  **60%** of Brno's stock is *unfinished scooters without a deck* (ProductType HALB). Brno started
  filling up in **June**, when deck deliveries from Ciclometal slipped. The current deck PO is 20%
  delivered and late, and deck stock is zero.
- **Winning queries:**
  ```js
  stockVsTarget: q("A_MaterialStock").join("A_Plant").groupBy("PlantName").sum("StockValue")
    .max("StockTargetValue", "target").withState(false),
  brnoMix: q("A_MaterialStock").where("Plant", "1310").join("A_Product").groupBy("ProductDescription").sum("StockValue"),
  brnoHistory: q("ZI_StockValueHistory").where("Plant", "1310").byMonth("YearMonth").sum("StockValue"),
  ```
- **Good action:** get decks (expedite Ciclometal, find a second source) and finish the scooters to
  turn EUR 2.3M of half-finished stock into sellable goods. Cutting Hamburg would hurt Christmas.

## If a team is stuck

- **Blank page or red error dialog:** the dialog names the failing query and suggests the right
  field name. F12 → Console shows XML errors with the line.
- **"My chart is empty":** the path in `data="{/name}"` must match the name in `data.js`. Did they
  press F5 in the app tab after saving?
- **Lost in the data:** send them back to the client's assumption and ask them to test it with one
  query, e.g. "group by plant and compare with the budget".
