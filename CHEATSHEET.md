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
| `text="{/codingClub/members}"` | one value, read by its absolute path (a `sql.one` query) |
| `text="{/kpis/0/title}"` | the title of the first KPI (arrays start at 0) |
| `items="{/membersByClub}"` | **repeats** the child control once per row (a `sql` query) |
| `text="{name}"` *(inside a repeated child)* | the value of the *current* row (relative path, no `/`) |
| `binding="{/kpis/2}"` | everything inside is now relative to KPI number 3 |
| `text="{name}: {members} members"` | mix text and several values |

Charts use `data="{/membersByClub}"` in place of `items=`.

## 5. Formatters: turn raw data into display text

```xml
<Text text="{ path: 'value', formatter: '.formatter.compactNumber' }" />            <!-- 18400000 → 18.4M -->
<Text text="{ parts: ['amount', 'currency'], formatter: '.formatter.currency' }" /> <!-- 800, "EUR" → €800 -->
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

The sample data's `state` fields already use these values. Convert between the two with
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

## 11. Your data: `data.js` and SQL

`webapp/workspace/data.js` holds your queries. Each one gets a name, and the name becomes a path:

```js
return {
  ratingByClub: sql(`
    SELECT club_id, ROUND(AVG(avg_rating), 1) AS rating
    FROM events
    GROUP BY club_id
  `),
  codingClub: sql.one(`
    SELECT name, members
    FROM clubs
    WHERE club_id = 'C01'
  `),
};
```

| You write | You get | Bind it with |
| --- | --- | --- |
| ``name: sql(`…`)`` | all rows: a list | `items="{/name}"` (table, list) or `data="{/name}"` (chart), then `{column}` inside |
| ``name: sql.one(`…`)`` | the first row: one object | `{/name/column}` anywhere, e.g. `text="{/codingClub/members}"` |

**Name every calculated column with `AS`**: `ROUND(AVG(fill_pct)) AS fill_pct`. That name is what you bind.

SQL in 9 lines:

| SQL | Does |
| --- | --- |
| `SELECT club_id, AVG(avg_rating) AS rating` | the columns you want; `AS` names a result |
| `FROM events` | the table |
| `WHERE topic = 'Talk'` | keep some rows. Text goes in **single** quotes |
| `AND week >= 5` · `OR` · `<>` · `IN ('Talk', 'Social')` | more conditions |
| `GROUP BY club_id` | one row per value, for `COUNT(*)`, `SUM()`, `AVG()`, `MIN()`, `MAX()` |
| `ROUND(AVG(avg_rating), 1)` | round to 1 decimal (`ROUND(x)` for none) |
| `ORDER BY rating DESC LIMIT 5` | sort, then keep the first 5 |
| `JOIN clubs c ON c.club_id = e.club_id` | add the columns of a linked table |
| `CASE WHEN week <= 5 THEN 'early' ELSE 'late' END AS period` | make your own groups |

Try everything in the **Query Playground** first. It shows the result as a chart (the first column
is the label, number columns are plotted) and copies both the `data.js` entry and the matching XML.
