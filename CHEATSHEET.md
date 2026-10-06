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

`Dashboard.view.xml` already declares all of these at the top. Keep them there.

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

## 9. Layout: the 12-column grid

```xml
<layout:Grid defaultSpan="XL6 L6 M12 S12" hSpacing="1" vSpacing="1">
  <f:Card> <f:layoutData><layout:GridData span="XL8 L8 M12 S12" /></f:layoutData> ... </f:Card>
  <f:Card> <f:layoutData><layout:GridData span="XL4 L4 M12 S12" /></f:layoutData> ... </f:Card>
</layout:Grid>
```

`L8` means 8 of 12 columns on a large screen. Use `S12` so phones get full width.

## 10. Event handlers you can use right away

| Handler | Use on |
| --- | --- |
| `.onKpiPress` | a KPI card or tile `press` |
| `.onItemPress` | a table row or list item `press` |
| `.onChartSelect` | a VizFrame `selectData` |
| `.onActionPress` | any `Button press` |
| `.onStatusFilter` | a `SegmentedButton selectionChange` |

To write your own, add a function in `webapp/controller/Dashboard.controller.js`. There's an
example at the bottom of that file.
