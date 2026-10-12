# UI5 XML cheat sheet (for people who know HTML)

## 1. Tags are controls

```xml
<Button text="Save" type="Emphasized" press=".onActionPress" />
```

| HTML habit | UI5 XML |
| --- | --- |
| `<div>` | `<VBox>` (stacks children vertically) or `<HBox>` (side by side) |
| `<h1>` | `<Title text="..." level="H1" />` |
| `<p>` / `<span>` | `<Text text="..." />` |
| `<table>` | `<Table>` with `<columns>` and `<items>` |
| `class="..."` | still `class="..."`, e.g. spacing helpers `sapUiSmallMargin`, `sapUiTinyMarginTop` |
| `onclick` | `press=".myFunction"` (the dot means "in my controller") |

Text goes into an **attribute** (`text="..."`), not between tags.

## 2. Prefixes pick the library

```xml
<f:Card>                     <!-- sap.f.Card -->
<card:NumericHeader>         <!-- sap.f.cards.NumericHeader -->
<layout:Grid>                <!-- sap.ui.layout.Grid -->
<mc:RadialMicroChart>        <!-- sap.suite.ui.microchart.RadialMicroChart -->
<viz:VizFrame>               <!-- sap.viz.ui5.controls.VizFrame (charts) -->
<Button>                     <!-- no prefix = sap.m -->
```

Your page files in `webapp/workspace/view/` already declare all of these at the top. Keep them there.

## 3. Lowercase tags are slots (aggregations)

```xml
<f:Card>
  <f:header> ...the header goes here... </f:header>
  <f:content> ...the body goes here... </f:content>
</f:Card>
```

`<f:Card>` (capital C) is a control. `<f:header>` (lowercase) is a named slot inside it.

## 4. `{curly braces}` = data binding

| You write | You get |
| --- | --- |
| `text="{/meta/title}"` | one value, read by its absolute path |
| `text="{/kpis/0/title}"` | the title of the first KPI (arrays start at 0) |
| `items="{/kpis}"` | **repeats** the child control once per KPI |
| `text="{title}"` *(inside a repeated child)* | the title of the *current* KPI (relative path, no `/`) |
| `binding="{/kpis/2}"` | everything inside is now relative to KPI number 3 |
| `text="{title}: {value} {unit}"` | mix text and several values |

Charts use `data="{/trend}"` in place of `items=`.

## 5. Formatters: turn raw data into display text

```xml
<Text text="{ path: 'value', formatter: '.formatter.compactNumber' }" />            <!-- 18400000 → 18.4M -->
<Text text="{ parts: ['amount', 'currency'], formatter: '.formatter.currency' }" /> <!-- → €284,000 -->
```

Ready-made formatters are in `webapp/util/formatter.js`: `compactNumber`, `currency`, `percent`,
`delta`, `target`, `date`, `trendIcon`, `priority`, `valueState`, `valueColor`, `progressText`.

## 6. Expression binding: quick logic inline

```xml
<ObjectStatus state="{= ${actual} >= ${plan} ? 'Success' : 'Error' }" text="{actual}" />
<Text text="{= ${/alerts}.length } alerts" />
<Button visible="{= ${/kpis/0/state} === 'Error' }" text="Escalate" />
```

The syntax is `{= ... }`, and each value inside is written `${path}`.

## 7. Fiori colors are semantic

Use the meaning, not a hex code:

| Purpose | Values | Used by |
| --- | --- | --- |
| Text/status color | `None` `Success` `Warning` `Error` `Information` | `ObjectStatus state`, `highlight`, `ProgressIndicator state` |
| Number/chart color | `Neutral` `Good` `Critical` `Error` | `NumericHeader state`, micro chart `color`/`valueColor` |

The API's `state` fields already use these values. Convert between the two with
`.formatter.valueState` and `.formatter.valueColor`.

## 8. Charts in 4 parts (VizFrame)

```xml
<viz:VizFrame vizType="line">                                 <!-- line, column, bar, donut, combination, bullet ... -->
  <viz:dataset>
    <viz.data:FlattenedDataset data="{/trend}">                    <!-- which array -->
      <viz.data:dimensions>
        <viz.data:DimensionDefinition name="Month" value="{month}" />   <!-- labels -->
      </viz.data:dimensions>
      <viz.data:measures>
        <viz.data:MeasureDefinition name="Actual" value="{actual}" />   <!-- numbers -->
      </viz.data:measures>
    </viz.data:FlattenedDataset>
  </viz:dataset>
  <viz:feeds>                                                     <!-- which name goes on which axis -->
    <viz.feeds:FeedItem uid="valueAxis" type="Measure" values="Actual" />
    <viz.feeds:FeedItem uid="categoryAxis" type="Dimension" values="Month" />
  </viz:feeds>
</viz:VizFrame>
```

The `values` in the feeds must match the `name` of a dimension or measure **exactly**.

## 9. Layout: rows of cards

```xml
<HBox class="wsRow" renderType="Bare">   <!-- one row -->
  <f:Card class="wsWide"> ... </f:Card>  <!-- twice as wide as the others -->
  <f:Card> ... </f:Card>
  <f:Card> ... </f:Card>                  <!-- cards share the row: 2/4 + 1/4 + 1/4 -->
</HBox>
<HBox class="wsRow" renderType="Bare">   <!-- next row -->
  <f:Card> ... </f:Card>                  <!-- alone = full width -->
</HBox>
```

Need exact widths? The 12-column `layout:Grid` (Gallery → Layout → Responsive grid) gives each card a
`span` per screen size, e.g. `span="XL8 L8 M12 S12"` = 8 of 12 columns on large screens.

## 10. Event handlers you can use right away

| Handler | Use on |
| --- | --- |
| `.onKpiPress` | a KPI card or tile `press` |
| `.onItemPress` | a table row or list item `press` |
| `.onChartSelect` | a VizFrame `selectData` |
| `.onActionPress` | any `Button press` |
| `.onStatusFilter` | a `SegmentedButton selectionChange` |
| `.onNavSelect` | a `SideNavigation itemSelect` or `IconTabHeader select`: opens the page named by the item's `key` |
| `.onShowDetail` / `.onCloseDetail` | a list in the List → detail layout |

To write your own, add a function in `webapp/workspace/controller/Page.controller.js`. There's an
example at the bottom of that file.

## 11. Your data: `data.js` and `q()`

`webapp/workspace/data.js` turns the raw ERP tables into exactly the rows your chart needs. Every
entry becomes a path:

```js
return {
  revenueByRegion: q("A_BillingDocument")     // start from an ERP table
    .join("A_Customer")                        // add the customer's fields (key found automatically)
    .groupBy("SalesRegion")                    // one row per region
    .sum("TotalNetAmount")                     // → { name, value, count, share }
    .sortBy("value", "desc"),
};
```

```xml
<viz.data:FlattenedDataset data="{/revenueByRegion}">   <!-- {name} and {value} inside -->
```

| Step | Does |
| --- | --- |
| `.where("Country", "FR")` · `.where("NetAmount", ">", 1000)` · `.where(r => …)` | keep matching rows |
| `.join("A_Product")` | add fields of a related table (one → one) |
| `.include("A_SalesOrder", "orders")` | add related rows as a list (one → many), bind `items="{orders}"` |
| `.compute("Margin", r => r.NetAmount - r.Cost)` | add a calculated field |
| `.groupBy("Plant")` | one row per value: `{ name, value, count, share }` |
| `.byMonth("SalesOrderDate")` | one row per month: `{ month: "Jun 26", period: "2026-06", value }` |
| `.sum("X")` `.avg` `.min` `.max` `.count()` `.percent("IsOk")` `.ratio("A", "B")` | the number (the first one is called `value`) |
| `.sum("Budget", "target")` | a second number with its own name |
| `.sum("CO2", "Leipzig", r => r.PlantName === "Leipzig")` | sum only some rows: one series per condition |
| `.merge(q(…).groupBy(…).sum(…), "plan")` | add the value of another query, matched by name or month |
| `.withState()` / `.withState(false)` | `state` (Good/Critical/Error) from `value` vs. `target`, higher/lower is better |
| `.sortBy("value", "desc").top(5)` · `.first()` | sort, cut, or keep one row as an object (`{/q/Field}`) |

Without `groupBy`/`byMonth`, `sum`/`count`/… give **one number**: bind it as `{/myNumber}`.
Try everything in the **Query Playground** first. It shows the result as a chart and copies both
the `data.js` line and the matching XML.
