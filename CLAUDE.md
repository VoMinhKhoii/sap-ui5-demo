# CLAUDE.md: UI5 Dashboard Workshop Kit

Handoff context for anyone (human or Claude) continuing this project.

## What this is and why

- **Purpose:** material for an SAP workshop on SAPUI5 and Fiori.
- **Audience:** university students in years 2–4. They know HTML/JS but have **never used UI5**.
- **The task they get:** in **45 minutes**, in teams of 2–3, design and build an ERP-style
  **dashboard** for a fictional company.
- **The problem we're solving:** two things normally eat up a newcomer's time, the unusual XML
  view syntax and the size of the control library. The kit removes both. Students copy
  working, data-bound blocks from a gallery and spend their time on *how to visualize the data*.
  - Analogy: shadcn/ui is a component library, but without ready-made page compositions you still
    don't get high-fidelity designs. This kit adds those compositions for UI5/Fiori.

### Decisions made with the organizer

- Pure **freestyle SAPUI5** (not Fiori elements), Horizon theme, run with `ui5 serve`.
- **Three scenarios**, all with the **same data shape**, so every block works with every scenario:
  supply chain, sales/order-to-cash, sustainability.
  - Fictional company: **Northwind Motion GmbH**, an e-bike and e-scooter maker with 4 EU plants.
  - We deliberately don't use real company names.
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
npm run generate-api    # regenerate webapp/api/** from tools/generate-api.js
```

**Browser checks** (they need the server running, and Playwright installed without saving it to
`package.json`, so students don't download browsers):

```bash
npm i --no-save playwright && npx playwright install chromium
node tools/e2e/check-pages.js sales           # every page, console errors + screenshots
node tools/e2e/paste-test.js                  # pastes EVERY gallery snippet into Dashboard.view.xml and renders it
```

- Status at handoff: lint ✅, build ✅. All pages × 3 scenarios render with no app errors.
- All 31 snippets pass the paste test. (The AnalyticalList template once flaked on timing and
  passed on retry.)
- The remaining console noise is from the framework itself and harmless (`check-pages.js` filters it out):
  - "page stack is empty" while the router loads the first view.
  - `Parameters.get` legacy warnings and `JQMIGRATE` jQuery deprecation notices from `sap.suite.ui.microchart`.
  - "selectedItem association should be a valid NavigationListItem", from `sap.tnt.SideNavigation` clearing the selection on its other list.

## Layout

| Path | What |
| --- | --- |
| `webapp/Component.js` | UIComponent + router. `loadScenario(id)` fills the **default model** with `{meta, kpis, trend, breakdown, items, alerts}`. The `app` model holds `{scenario, scenarios, busy}`. Scenario saved in localStorage. |
| `webapp/util/api.js` | fetches `api/<scenario>/<endpoint>.json` |
| `webapp/util/formatter.js` | formatters used by the snippets (`compactNumber`, `currency`, `target`, `date`, `delta`, `priority`, `valueState`, `valueColor` …) |
| `webapp/controller/BaseController.js` | shared handlers that snippets reference (`onKpiPress`, `onItemPress`, `onChartSelect`, `onActionPress`, `onStatusFilter`) + `styleCharts()` (VizFrame defaults). All page controllers extend it. |
| `webapp/view/App.view.xml` | `tnt:ToolPage` shell: header with the scenario Select, side navigation |
| `webapp/view/Home` / `Gallery` / `ApiExplorer` / `Dashboard` / `Solution` | the 5 pages (routes: `""`, `gallery/:category:`, `api`, `dashboard`, `solution`) |
| `webapp/view/Dashboard.view.xml` | **student workspace**: `🧩 … START/END` paste markers, three empty cards A/B/C, all namespaces pre-declared |
| `webapp/gallery/samples.json` | gallery catalog: categories → samples `{id, title, description, data, controls[], template?}` |
| `webapp/gallery/samples/*.fragment.xml` | 28 blocks. **The same file is the live preview AND the copied code.** |
| `webapp/templates/*.fragment.xml` | 3 full-page templates (Overview, AnalyticalList, ExceptionCockpit) |
| `webapp/api/**` | generated JSON. Edit `tools/generate-api.js`, not these files. |
| `README.md` / `CHEATSHEET.md` | student and facilitator docs, and a one-page XML/binding cheat sheet |

### Data contract (same for every scenario)

| Endpoint | Fields |
| --- | --- |
| `kpis[4]` | `id, title, subtitle, value, unit, target, deltaPercent, trend (Up/Down), state (Good/Critical/Error/Neutral), icon, higherIsBetter, history[6]{x, period, value}` |
| `trend[12]` | `month, actual, plan, previousYear` |
| `breakdown[]` | `name, value, target, share, state` (`share` is computed by the generator) |
| `items[]` | `id, title, subtitle, owner, date, amount, currency, quantity, progress (0-100), status, state (Error/Warning/Success/Information/None)` |
| `alerts[4]` | `type (Error/Warning/Information/Success), title, description, date` |
| `meta` | `title, description, question` (the business question), plus labels for `trend` / `breakdown` / `items.columns` |

Each dataset has a planted story for students to find:
- Supply chain: the battery supplier slipped, on-time delivery dropped in Jun–Jul, and Brno is over its stock target.
- Sales: CityRide owes EUR 612k, an order is blocked by a credit check, and France is 16% under plan.
- Sustainability: Leipzig is 32% over its CO2 budget because the paint-oven project slipped.

## Adding a gallery block

1. Copy an existing `webapp/gallery/samples/*.fragment.xml`. Keep the standard
   `core:FragmentDefinition` namespace header **exactly**, with the prefixes `f`, `card`, `layout`,
   `mc`, `viz`, `viz.data` and `viz.feeds`. These must match what `Dashboard.view.xml` declares,
   or the pasted code breaks.
2. Bind only to the default model (`{/kpis}` …). Use only handlers and formatters from
   `BaseController` / `formatter.js`.
3. Add an entry to `webapp/gallery/samples.json`.
4. Run `node tools/e2e/paste-test.js <Id>`, then `npm run verify`.

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

## Possible next steps (not started)

- A dry run with someone who has never used UI5. Time the first successful paste, which should be under 5 minutes.
- An optional "real API" mode, e.g. a public SAP API Business Hub sandbox, for teams that finish early.
- Wire the filter blocks to actually filter (`sap.ui.model.Filter` on the items binding). Today they only show a toast.
- A `CHALLENGE.md` handout or slide, and a judging sheet.
- Visual alignment with the Figma S/4HANA Web UI Kit, which needs file access.
