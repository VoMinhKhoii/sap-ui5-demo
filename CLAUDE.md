# CLAUDE.md: UI5 Dashboard Workshop Kit

Handoff context for anyone (human or Claude) continuing this project.

## What this is and why

- **Purpose:** material for an SAP workshop on SAPUI5 and Fiori.
- **Audience:** university students in years 2–4. They know HTML/JS but have **never used UI5**.
- **The task they get:** in **45 minutes**, in teams of 2–3, pick a **case** (a business mystery with
  a client, a deadline and a wrong assumption), find the real cause in the ERP data, and build the
  Fiori app that proves it. Page 1 (finding → evidence → action) is required, and extra pages or a
  custom shell are stretch goals. The case also gives the judges a rubric: Insight 30, Evidence 25,
  Clarity 20, Fiori craft 15, Ambition 10.
- **The problem we're solving:** two things normally eat up a newcomer's time, the unusual XML
  view syntax and the size of the control library. The kit removes both. Students copy
  working, data-bound blocks from a gallery, get their data from one-line `q()` queries, and spend
  their time on *finding the insight and visualizing it*.
  - Analogy: shadcn/ui is a component library, but without ready-made page compositions you still
    don't get high-fidelity designs. This kit adds those compositions for UI5/Fiori.

### Decisions made with the organizer

- Pure **freestyle SAPUI5** (not Fiori elements), Horizon theme, run with `ui5 serve`.
- **One fictional company ERP**, Northwind Motion GmbH (e-bikes/e-scooters, 4 EU plants + 1 DC). It
  has 14 linked tables shaped like **SAP S/4HANA APIs** (`A_SalesOrder`, `A_BillingDocument`,
  `ZI_PlantEmissions` …), because the organizer wants it to *look like real SAP*.
  - **Level 1**: three scenarios (supply chain, sales, sustainability) with the **same data shape**
    (`kpis/trend/breakdown/items/alerts`), so every gallery block works with every scenario. They are
    **computed from the ERP tables**, so the numbers always agree.
  - **Only sustainability is switched on** (`webapp/config.json`, organizer's call, Oct 2026: "focus on
    one scenario first"). Sales and supply chain stay built and tested, but hidden: their tables,
    cases, Playground examples and the Scenario dropdown only appear when they're switched on.
    `?scenarios=all` overrides config.json per tab.
  - **Cases**: 3 for sustainability, short and plain-language, easy → hard (recycling claim,
    renewable gap, CO2 overshoot). 2 each for sales and supply chain. Each has a red herring, and the
    answers are in `FACILITATOR.md`. The organizer asked for "only three cases each, easy to understand".
  - **Names are fictional and were web-checked** (Oct 2026) against real businesses. Nine were
    replaced (e.g. Lanxin → Lanmo, Loopline → Larkspoke). Run the same check for any new name,
    especially the ones in negative stories. Stories are operational only: no fraud, layoffs or HR
    data, and people appear only as record owners.
- **The student app is a separate UI5 component** at `/workspace/` (2nd browser tab), so teams own
  the shell, navigation and pages. The kit (tab 1) is the reference: case, gallery, API Explorer,
  Query Playground, Reference Solution.
- **Layout = rows of cards** (`<HBox class="wsRow" renderType="Bare">`, cards share the width, and
  `class="wsWide"` makes one twice as wide). The organizer found `GridData span="XL8 L8 M12 S12"`
  unintuitive. The 12-column Grid is still in the gallery as "advanced".
- **Readability at a 13" MacBook (1280×800)** is the target. Kit reading pages get 16px text via
  `.wsPage` rules in `style.css`, and the students' app keeps standard Fiori sizes. Kit grids use
  `containerQuery="false"` so a 1000px content area still gets the L layout. Check new pages at
  1280×800 (the e2e scripts use that viewport).
- The **API is static JSON** served by the dev server. There is no backend and no CORS.
- The kit started inside `MichaelPham2005/bookshop-ui` (`workshop/` folder). We moved it here
  because Claude's GitHub app couldn't push to that repo.
- **Design reference:** the "SAP S/4HANA Web UI Kit" on Figma Community, linked in the app header
  and README. Claude couldn't read the file (no edit access), so nothing was extracted from it.

## Run, verify, test

```bash
npm install
npm start               # http://localhost:8080 (first run downloads SAPUI5 libs, ~1 min)
npm run verify          # ui5lint + ui5 build, both must pass
npm test                # q() unit tests + "every case can be solved with q()" + every Playground example runs
npm run generate-api    # regenerate webapp/api/** from tools/erp/*.js; prints 18 story checks, fails if one breaks
npm run build:static    # ui5 build + bootstrap from ui5.sap.com/<ui5.yaml version> → dist-static/ui5-dashboard-workshop
vercel deploy dist-static/ui5-dashboard-workshop --prod   # Vercel project "ui5-dashboard-workshop" (account vominhkhoii)
```

**Browser checks** (they need the server running, and Playwright installed without saving it to
`package.json`, so students don't download browsers):

```bash
npm i --no-save playwright && npx playwright install chromium
node tools/e2e/check-pages.js sales           # every kit page, console errors + screenshots
node tools/e2e/check-workspace.js sales cash-leak   # the student app (all 3 pages) for a scenario/case
node tools/e2e/playground-test.js             # picks every Playground example in the dropdown: right code, no error, preview renders
node tools/e2e/paste-test.js                  # pastes EVERY gallery block, shell, layout and Playground example
                                              # (data.js + XML) into the workspace and renders it
```

- Status at handoff: lint ✅, build ✅, `npm test` ✅ (21 tests), 18/18 story checks ✅. All kit pages
  (sustainability, plus `SCENARIOS=all` for sales) and all 3 workspace pages render with no app errors.
- The paste test passes all 65 jobs (29 blocks + 3 templates + 3 shells/layouts + the Playground
  examples of the switched-on scenarios × chart types). (The AnalyticalList template once flaked on
  timing and passed on retry.)
- The remaining console noise is from the framework itself and harmless (`check-pages.js` filters it out):
  - "page stack is empty" while the router loads the first view.
  - `Parameters.get` legacy warnings and `JQMIGRATE` jQuery deprecation notices from `sap.suite.ui.microchart`.
  - "selectedItem association should be a valid NavigationListItem", from `sap.tnt.SideNavigation` clearing the selection on its other list.

## Layout

| Path | What |
| --- | --- |
| `webapp/Component.js` | Kit component + router. `loadScenario(id)` fills the **default model** with level-1 `{meta, kpis, trend, breakdown, items, alerts}` plus example query results (`/customers`, for the List → detail preview). `selectCase(id)` also switches the scenario. The `app` model holds `{scenario, scenarios, cases, caseId, case, busy}`. Scenario and case are saved in localStorage (`workshop.scenario`, `workshop.case`), and that's how the workspace knows them. `this.q` is the query function once `erpReady` resolves. |
| `webapp/util/api.js` | fetches level-1 `api/<scenario>/<endpoint>.json`, `loadErp()` (all ERP tables, cached), `loadCases()` |
| `webapp/util/q.js` | **the query helper** (lazy, chainable, "did you mean" errors, auto-join via relations). `q.run(code)` evaluates Playground text. Node-testable (see `tools/test-q.js`). |
| `webapp/util/snippet.js` | result → paste-ready XML bound to `{/name}` (VizFrame line/column/bar/bullet/donut, Table, NumericContent, record). The Playground preview renders exactly this XML. |
| `webapp/util/examples.js` | Playground starter queries, tagged by scenario. They show techniques, **not case answers**. `preview: true` (plants) also feeds the List → detail gallery preview. |
| `webapp/util/formatter.js` | formatters used by the snippets (`compactNumber`, `currency`, `target`, `date`, `delta`, `priority`, `valueState`, `valueColor` …) |
| `webapp/controller/BaseController.js` | shared handlers that snippets reference (`onKpiPress`, `onItemPress`, `onChartSelect`, `onActionPress`, `onStatusFilter`, `onNavSelect`, `onToggleSideNav`, `onShowDetail`, `onCloseDetail`), `copyText()`, `styleCharts()`. **Kit and workspace controllers both extend it.** Handlers find controls by walking up the tree, not by id, so they also work in gallery previews. |
| `webapp/view/App.view.xml` | kit shell: header with the scenario Select, side navigation. "Open my app" is a `href` item to `workspace/index.html`. |
| `webapp/view/Home` / `Gallery` / `ApiExplorer` / `Playground` / `Solution` | the 5 kit pages (routes: `""`, `gallery/:category:`, `api`, `playground`, `solution`). Home = 3 case cards → your case + hints, with plan and rubric in a collapsed panel. Playground = table/field browser (click to insert, plus live autocomplete via `CodeEditor.addCustomCompleter`), query → result → "use it". Solution = one answer page per sustainability case + "The code" tab. |
| `webapp/config.json` | which scenarios are switched on (read by `api.loadConfig()` in both apps) |
| `webapp/solution/queries.js` | the reference solution's queries, in `data.js` format (tested in `tools/test-q.js`) |
| `webapp/workspace/` | **the students' app**, its own component `workshop.dashboard.workspace` (loads the kit modules via the `workshop.dashboard` resource root `../`). `data.js` (their queries, loaded separately so a syntax error shows a dialog instead of a blank page), `view/App.view.xml` (shell between 🧩 SHELL markers; nav keys `page1/2/3` = route names; must keep `App id="app"`), `view/Page1.view.xml` (finding/evidence/action slots), `Page2/3` (optional), `controller/Page.controller.js`. The default model = level 1 + `/case` + `/erp/<Table>` + every `data.js` query. |
| `webapp/gallery/samples.json` | gallery catalog: categories → samples `{id, title, description, data, controls[], template?, shell?, target?}` |
| `webapp/gallery/samples/*.fragment.xml` | 28 blocks. **The same file is the live preview AND the copied code.** |
| `webapp/gallery/shells/*.fragment.xml` | `SideNav`, `TopTabs` (paste into the workspace App.view.xml) and `ListDetail` (FlexibleColumnLayout, replaces a page; binds `{/plants}` with `months`/`initiatives`) |
| `webapp/templates/*.fragment.xml` | 3 full-page templates (Overview, AnalyticalList, ExceptionCockpit) |
| `webapp/api/**` | generated JSON. Edit `tools/erp/*.js`, not these files. |
| `tools/generate-api.js` + `tools/erp/` | `master.js` (plants, products, customers, suppliers), `sales.js`, `supply.js`, `sustainability.js` (raw tables with planted stories, seeded RNG), `level1.js` (level 1 computed from raw), `metadata.js` (field docs + relations for auto-join), `cases.js` (case texts with computed numbers) |
| `README.md` / `CHEATSHEET.md` / `FACILITATOR.md` | student docs, a one-page XML/binding/`q()` cheat sheet, and the case answers + run of show + rubric |

### Data contract: level 1 (same for every scenario)

| Endpoint | Fields |
| --- | --- |
| `kpis[4]` | `id, title, subtitle, value, unit, target, deltaPercent, trend (Up/Down), state (Good/Critical/Error/Neutral), icon, higherIsBetter, history[6]{x, period, value}` |
| `trend[12]` | `month, actual, plan, previousYear` |
| `breakdown[]` | `name, value, target, share, state` (`share` is computed by the generator) |
| `items[]` | `id, title, subtitle, owner, date, amount, currency, quantity, progress (0-100), status, state (Error/Warning/Success/Information/None)` |
| `alerts[4]` | `type (Error/Warning/Information/Success), title, description, date` |
| `meta` | `title, description, question` (the business question), plus labels for `trend` / `breakdown` / `items.columns` |

Sales KPIs: revenue YTD (billed), open orders, **overdue receivables** (replaced DSO, whose 91-day
formula fell instead of rising because of seasonality), gross margin. Supply chain KPIs: inventory value,
on-time delivery, late PO lines, stock-outs (stock-out history is the one hard-coded series).

### ERP tables (`api/erp/<Table>.json`, OData V4 envelope `{ "@odata.context", value }`)

`A_Plant` 5 · `A_Product` 14 · `A_Customer` 30 · `A_Supplier` 7 · `A_SalesOrder` ~600 ·
`A_SalesOrderItem` ~780 · `A_BillingDocument` ~570 · `ZI_SalesPlan` 72 · `A_PurchaseOrder`/`Item` ~300 ·
`A_MaterialStock` 30 · `ZI_StockValueHistory` 60 · `ZI_PlantEmissions` 60 · `ZI_SustainabilityInitiative` 7.
`api/erp/index.json` has the field docs (shown in the API Explorer) and `relations` (used by `q().join`).
`TODAY` is 2026-10-05, and the fiscal year is Oct 2025 – Sep 2026. Some convenience fields a CDS view
would provide are precomputed (`PaymentStatusText`, `DaysOverdue`, `OpenAmount`, `OnTimeDelivery`,
`DaysOfCover`) to save students date math.

Planted stories (each is a case; the red herring is in brackets; every claim is checked by the generator):
- Sales: Kiloverde Fleet SAS owes EUR 612k, 38 days overdue, 64% of all overdue money [CFO: "everyone pays
  slower"]. France is −16% vs. plan since April, because Kiloverde stopped ordering [board: "the Nordics",
  which are only −3%]. Fjordtrail is blocked EUR 84k over its credit limit.
- Supply chain: Lanmo Cellworks (batteries, BMS) is late. Hamburg has battery packs for 9 days and BMS
  boards for 11 [production: "frames"]. Norrlöv, the second battery source, is 100% on time. Brno is
  +39% over its stock target, 60% of it unfinished scooters waiting for Ciclometal decks since June
  [CFO: "cut Hamburg", which is only +3%].
- Sustainability: Leipzig is +1,200 t (> the group's +980 t) because the paint oven slipped from Apr to Dec
  [board: "Porto", which is under budget]. The renewable share is 68.6% only because of Brno's grey power
  (81% without Brno; the power purchase agreement starts in Nov) [CSO: "Hamburg solar", which rose
  78% → 88%].

## Adding a gallery block

1. Copy an existing `webapp/gallery/samples/*.fragment.xml`. Keep the standard
   `core:FragmentDefinition` namespace header **exactly**, with the prefixes `f`, `card`, `layout`,
   `mc`, `viz`, `viz.data` and `viz.feeds` (shells also use `tnt`). These must match what the
   workspace views declare, or the pasted code breaks.
2. Bind only to the default model (`{/kpis}` …). Use only handlers and formatters from
   `BaseController` / `formatter.js`.
3. Add an entry to `webapp/gallery/samples.json`.
4. Run `node tools/e2e/paste-test.js <Id>`, then `npm run verify`.

**Changing data or cases:** edit `tools/erp/*.js`, run `npm run generate-api` (story checks), `npm test`
(proves each case is solvable with `q()`), then update the numbers in `FACILITATOR.md`. Its code
blocks are runnable: wrap one in `return { … }` and pass it to `q.run`.

## Gotchas (each one cost debugging time)

- **`{...}` in a control's text is parsed as data binding.**
  - When you create controls in JS with literal code or user text, use the setters:
    `new CodeEditor().setValue(code)` and `new CardHeader().setTitle(...)`. Passing it in the
    constructor settings breaks, e.g. `uiConfig="{applicationSet:'fiori'}"` turns into an
    undefined-path binding (`startsWith` error).
  - In XML, write literal braces as `\{` and `\}` (see the Home "How UI5 XML works" cards).
- **XML comments can't contain `--`.** `ui5 build` fails with "Malformed comment". Browsers
  usually fail too.
- **ValueState vs ValueColor:**
  - `ObjectStatus`, `highlight`, `ProgressIndicator` and `infoState` want
    `None/Success/Warning/Error/Information`.
  - `NumericHeader`, `NumericContent` and micro charts want `Good/Critical/Error/Neutral`.
  - KPI and breakdown `state` values are ValueColor. Use `.formatter.valueState` before binding
    them to a ValueState property.
- **A nested aggregation binding inside a repeated template** (e.g. `LineMicroChart points` inside a
  Grid `content="{/kpis}"`) needs `{ path: 'history', templateShareable: false }`.
- **`NumericContent` with a value like "18.4M"** needs `formatterValue="true"`, or the scale is dropped.
- **`NotificationListItem datetime`** is a valid property, but ui5lint flags it as deprecated (it
  inherits a deprecated base property). We suppress it with
  `<!-- ui5lint-disable-next-line no-deprecated-api -->`, and the attribute must be on that next line.
- **VizFrame styling** happens in `BaseController.styleCharts()`:
  - Trend charts (line/column/combination) get no data labels.
  - Line/combination get `adjustScale` so the axis doesn't start at 0.
  - Students don't set `vizProperties` themselves.
- **`manifest.json`** is version 2.0.0, with `minUI5Version` 1.136. Don't add the router
  `async` flag: the component implements `IAsyncContentCreation`.
- **i18n** has only `i18n.properties`, so `supportedLocales: [""]` and `fallbackLocale: ""` are
  set to silence the 'en' fallback errors.
- **`ui5 serve` has no live reload.** Students press F5 after saving (the docs say so).
- **JSONModel shows only 100 rows in lists by default.** Both components call `setSizeLimit(5000)`.
- **FlexBox items get an inline `height: 100%`** when the child is 100% high (ToolPage). That's why
  `.wsPreviewShell` needs `!important` in `style.css`.
- **Workspace index.html:** the full-height rule must target `.wsRoot` (the component div). A generic
  `body > div` also stretched the fixed "Fictional data" badge over the page.
- **Expression binding on a missing array** (`${orders}.length` before a detail is selected) needs a
  guard: `{= ${orders} ? ${orders}.length : 0 }`.
- **`formatter.compactNumber` below 1000 uses plain 1-decimal format.** Compact notation would round
  87.49 to "87" but 92.2 stays "92.2", which looks inconsistent.
- **IconTabBar with one icon tab** switches every tab into icon mode and truncates the text labels. Use
  `headerMode="Inline"` and no icons (see Solution.view.xml).
- **A margin class on a 100%-wide control overflows the page** (Solution's IconTabBar). Pad the
  parent instead.
- **Rows of cards need `flex: 1 1 0` plus a min-width** (in `style.css`). With a non-zero flex-basis,
  `wsWide` only gets a share of the leftover space and barely looks wider.
- **Static hosting (Vercel) has no `/resources`.** `tools/build-static.js` rewrites both index.html files
  to the SAP CDN. The workspace index.html sets `data-sap-ui-xx-component-preload="off"`, because
  `ui5 build` only bundles the kit's Component-preload (without it there's a 404 for
  workspace/Component-preload.js).
- **The ZI_ views carry `PlantName`** (like a real CDS view would), so the sustainability cases
  need no join.
- **`q().byMonth` fills months across the whole source table**, so a customer who stopped ordering
  shows zeros instead of a shorter axis. Keep it that way: case 2 depends on it.

## Possible next steps (not started)

- A dry run with someone who has never used UI5. Time the first successful paste (should be under 5
  minutes) and how long a case takes to crack.
- Third cases for sales and supply chain, if those scenarios are switched on again.
- Wire the filter blocks to actually filter (`sap.ui.model.Filter` on the items binding). Today they only show a toast.
- A printable judging sheet from the rubric in `FACILITATOR.md`.
- Visual alignment with the Figma S/4HANA Web UI Kit, which needs file access.
