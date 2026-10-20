# CLAUDE.md: UI5 Dashboard Workshop Kit

Handoff context for anyone (human or Claude) continuing this project.

## What this is and why

- **Purpose:** material for an SAP workshop on SAPUI5 and Fiori.
- **Audience:** university students in years 2–4. They know HTML/JS but have **never used UI5**.
- **The task they get:** in **45 minutes**, in teams of 2–3, solve **one case** (a mystery with
  a client, a deadline and a wrong assumption), find the real cause in the data with **SQL**, and
  build the Fiori app that proves it. Page 1 (finding → evidence → action) is required, and extra pages or a
  custom shell are stretch goals. The case also gives the judges a rubric: Insight 30, Evidence 25,
  Clarity 20, Fiori craft 15, Ambition 10.
- **The problem we're solving:** two things normally eat up a newcomer's time, the unusual XML
  view syntax and the size of the control library. The kit removes both. Students copy
  working, data-bound blocks from a gallery, get their data from named SQL queries, and spend
  their time on *finding the insight and visualizing it*.
  - Analogy: shadcn/ui is a component library, but without ready-made page compositions you still
    don't get high-fidelity designs. This kit adds those compositions for UI5/Fiori.

### Decisions made with the organizer

- Pure **freestyle SAPUI5** (not Fiori elements), Horizon theme, run with `ui5 serve`.
- **One case: "The Friday Problem"** (Oct 2026 pivot, GitHub issue #2). The organizer replaced the
  Northwind Motion ERP (e-bikes, S/4HANA-shaped tables, 3 scenarios, `q()` helper) with a student-life
  case, and "2 themes × 1 case" with **only the student clubs case**: no capacity for the job-seeking
  one. The old kit is in git history (commit 7f00dee) if it's ever needed.
  - **The story:** the Coding Club's events look half empty since October. The president blames
    workshops and wants to swap them for socials, which would lose the sponsor (Quillmoor Software,
    web-checked: no real company). The truth: from week 5 the lab events moved to **Friday 18:30**;
    people sign up but only 42% turn up (85–86% Wed/Thu). Red herrings: workshops (topic) and the
    Instagram stop in week 7 (promotion). Brief text follows Singlytran's revised version on issue #2.
  - **One answer only:** `tools/data/checks.js` checks that organiser, room, promotion, end-of-semester
    fatigue, start time and "workshops on Friday" are all ruled out. Keep it that way when changing data.
  - **Sized for 45 minutes:** one `events` table with precomputed `showup_pct`, `fill_pct`,
    `avg_rating`, `week`, so the two required queries are single-table GROUP BYs. JOIN only in a stretch query.
  - **Names are fictional**; clubs are generic, people appear only as event organisers. Stories are
    operational only (no grades, health, money problems or judgement of a person).
- **Data = SQLite in the browser ("Option D", issue #1).** `webapp/data/clubs.sqlite` is opened with
  sql.js (WebAssembly, committed in `webapp/thirdparty/`, no CDN). Teams write named queries in
  `data.js`: `name: sql(`…`)` (rows → `items="{/name}"`) or `name: sql.one(`…`)` (one row →
  `{/name/column}`). The organizer rejected OData/CAP: GROUP BY is awkward in `$apply`, and a backend
  adds setup. No server, so it hosts as static files (SAP BTP later; Vercel still works).
- **Gallery sample data** (`webapp/data/sample.json`): the old level-1 shape
  (`meta/kpis/trend/breakdown/items/alerts`) plus `clubList`, computed from the tables, so all 29 blocks
  work unchanged in the kit and in the students' app. It shows the club in general, **not the answer**.
  `tools/test.js` also checks that no Playground example groups the Coding Club by weekday.
- **The student app is a separate UI5 component** at `/workspace/` (2nd browser tab), so teams own
  the shell, navigation and pages. The kit (tab 1) is the reference: case, gallery, Data Explorer,
  Query Playground.
- **The reference solution is a separate, private repo**
  ([VoMinhKhoii/ui5-workshop-solution](https://github.com/VoMinhKhoii/ui5-workshop-solution), local
  `../ui5-workshop-solution`, live at <https://ui5-workshop-solution.vercel.app>, not linked from the
  kit), so teams can't open the answer from the kit. It has a copy of the data (`npm run sync-data`
  there after `generate-data` here) and its `npm test` checks the answer numbers in `FACILITATOR.md`.
- **Layout = rows of cards** (`<HBox class="wsRow" renderType="Bare">`, cards share the width, and
  `class="wsWide"` makes one twice as wide). The organizer found `GridData span="XL8 L8 M12 S12"`
  unintuitive. The 12-column Grid is still in the gallery as "advanced".
- **Readability at a 13" MacBook (1280×800)** is the target. Kit reading pages get 16px text via
  `.wsPage` rules in `style.css`, and the students' app keeps standard Fiori sizes. Kit grids use
  `containerQuery="false"` so a 1000px content area still gets the L layout. Check new pages at
  1280×800 (the e2e scripts use that viewport).
- **Everything is static files** served by the dev server (or any static host). There is no backend and no CORS.
- The kit started inside `MichaelPham2005/bookshop-ui` (`workshop/` folder). We moved it here
  because Claude's GitHub app couldn't push to that repo.
- **Design reference:** the "SAP S/4HANA Web UI Kit" on Figma Community, linked in the app header
  and README. Claude couldn't read the file (no edit access), so nothing was extracted from it.

## Run, verify, test

```bash
npm install
npm start               # http://localhost:8080 (first run downloads SAPUI5 libs, ~1 min)
npm run verify          # ui5lint + ui5 build, both must pass
npm test                # sql() tests + every Playground example + the starter data.js
npm run generate-data   # regenerate webapp/data/** and webapp/thirdparty/ from tools/data/*.js; prints 17 story checks, fails if one breaks
npm run build:static    # ui5 build + bootstrap from ui5.sap.com/<ui5.yaml version> → dist-static/ui5-dashboard-workshop
```

Node isn't on the default PATH of Claude's shell on the organizer's Mac: use
`export PATH=~/.nvm/versions/node/v22.12.0/bin:$PATH`.

**Browser checks** (they need the server running, and Playwright installed without saving it to
`package.json`, so students don't download browsers):

```bash
npm i --no-save playwright && npx playwright install chromium
node tools/e2e/check-pages.js                 # every kit page, console errors + screenshots
node tools/e2e/check-workspace.js             # the student app (all 3 pages)
node tools/e2e/playground-test.js             # picks every Playground example in the dropdown: right code, no error, preview renders
node tools/e2e/paste-test.js                  # pastes EVERY gallery block, shell, layout and Playground example
                                              # (data.js + XML) into the workspace and renders it
```

- Status (19 Oct 2026, after the pivot): lint ✅, build ✅, `npm test` ✅ (10 tests), 17/17 story
  checks ✅, check-pages ✅ (12 routes), check-workspace ✅, playground-test ✅ (9 examples),
  paste-test ✅ (68 jobs). The static build was also checked on a plain `python3 -m http.server`.
- The remaining console noise is from the framework itself and harmless (`check-pages.js` filters it out):
  - "page stack is empty" while the router loads the first view.
  - `Parameters.get` legacy warnings and `JQMIGRATE` jQuery deprecation notices from `sap.suite.ui.microchart`.
  - "selectedItem association should be a valid NavigationListItem", from `sap.tnt.SideNavigation` clearing the selection on its other list.

## Layout

| Path | What |
| --- | --- |
| `webapp/Component.js` | Kit component + router. `dataReady` opens the database; then `this.sql` / `this.schema` exist. The **default model** holds the gallery sample data + `/case`. The `app` model holds `{case, busy}` (hints get a `shown` flag there). |
| `webapp/util/db.js` | loads sql.js (script tag), `clubs.sqlite`, `schema.json`, `sample.json`, `case.json` → `{ sql, schema, sample, case }`. Cached. |
| `webapp/util/sql.js` | **the query function**: `sql()` / `sql.one()`, SELECT only, plain-English errors with "did you mean", `badColumns()` (columns without `AS`). Node-testable. |
| `webapp/util/snippet.js` | result → paste-ready XML bound to `{/name}`, and the "Copy for data.js" text. Rows: first column = label, a 2nd text column = colour, number columns = measures (VizFrame column/bar/line/donut, Table). One row: big numbers (`NumericContent`) or a record. The Playground preview renders exactly this XML. |
| `webapp/util/examples.js` | Playground starter queries (SQL). They show techniques, **not the answer**. |
| `webapp/util/formatter.js` | formatters used by the snippets (`compactNumber`, `currency`, `target`, `date`, `delta`, `priority`, `valueState`, `valueColor` …) |
| `webapp/controller/BaseController.js` | shared handlers that snippets reference (`onKpiPress`, `onItemPress`, `onChartSelect`, `onActionPress`, `onStatusFilter`, `onNavSelect`, `onToggleSideNav`, `onShowDetail`, `onCloseDetail`), `copyText()`, `styleCharts()`. **Kit and workspace controllers both extend it.** Handlers find controls by walking up the tree, not by id, so they also work in gallery previews. |
| `webapp/view/App.view.xml` | kit shell: header, side navigation. "Open my app" is a `href` item to `workspace/index.html`. |
| `webapp/view/Home` / `Gallery` / `ApiExplorer` / `Playground` | the 4 kit pages (routes: `""`, `gallery/:category:`, `api`, `playground`). Home = the case (story, 3 suspects, must-include, tools, 2 hints, plan + rubric in a collapsed panel). `ApiExplorer` is titled **Data Explorer**: tables, columns, first 5 rows, plus the gallery sample data. Playground = table/column browser (click to insert, autocomplete via `CodeEditor.addCustomCompleter`), SQL → result → "use it" (1 row → `sql.one`). |
| `webapp/workspace/` | **the students' app**, its own component `workshop.dashboard.workspace` (loads the kit modules via the `workshop.dashboard` resource root `../`). `data.js` (their queries, loaded separately so a typo shows a dialog instead of a blank page; each query runs on its own so one broken query doesn't stop the rest), `view/App.view.xml` (shell between 🧩 SHELL markers; nav keys `page1/2/3` = route names; must keep `App id="app"`), `view/Page1.view.xml` (finding/evidence/action slots), `Page2/3` (optional), `controller/Page.controller.js`. The default model = sample data + `/case` + every `data.js` query. |
| `webapp/gallery/samples.json` | gallery catalog: categories → samples `{id, title, description, data, controls[], template?, shell?, target?}` |
| `webapp/gallery/samples/*.fragment.xml` | 29 blocks. **The same file is the live preview AND the copied code.** |
| `webapp/gallery/shells/*.fragment.xml` | `SideNav`, `TopTabs` (paste into the workspace App.view.xml) and `ListDetail` (FlexibleColumnLayout, replaces a page; binds `{/clubList}` with `eventList`) |
| `webapp/templates/*.fragment.xml` | 3 full-page templates (Overview, AnalyticalList, ExceptionCockpit) |
| `webapp/data/**`, `webapp/thirdparty/**` | generated. Edit `tools/data/*.js`, not these files. |
| `tools/generate-data.js` + `tools/data/` | `clubs.js` (the 4 tables, seeded RNG; don't reorder its random calls), `checks.js` (story + "only one answer" checks), `content.js` (column docs, relations, the case text, the gallery sample data) |
| `README.md` / `CHEATSHEET.md` / `FACILITATOR.md` | student docs (fork → `npm install` → `npm start`), a one-page XML/binding/SQL cheat sheet, and the answer + run of show + rubric |

### Data contract: gallery sample data

| Path | Fields |
| --- | --- |
| `kpis[4]` | `id, title, subtitle, value, unit, target, deltaPercent, trend (Up/Down), state (Good/Critical/Error/Neutral), icon, higherIsBetter, history[6]{x, period, value}` (weeks 5-10) |
| `trend[10]` | `month` ("Wk 1" … "Wk 10"), `actual, plan, previousYear` (last autumn, only in the sample data) |
| `breakdown[8]` | one row per club: `name, value` (people checked in), `target` (80% of seats), `share, state` |
| `items[8]` | one row per club: `id, title, subtitle, owner, date, amount, unit, quantity, progress (0-100), status, state (Error/Warning/Success/Information/None)` |
| `alerts[4]` | `type (Error/Warning/Information/Success), title, description, date` |
| `meta` | `company, title, description, question, asOf`, plus labels for `trend` / `breakdown` / `items.columns` |
| `clubList[8]` | the clubs with `fill_pct, showup_pct, organiser` and `eventList[]` (List → detail) |

### The tables (`webapp/data/clubs.sqlite`, docs in `schema.json`)

`events` 90 · `clubs` 8 · `promotion_posts` 286 · `room_bookings` 6 (next semester). Weeks 1-10 =
7 Sep - 13 Nov 2026; the story date is Mon 16 Nov. The Coding Club is `C01` (20 events: Wed in M201
every week; the lab event in M105 on Thu in weeks 1-4, on Fri 18:30 from week 5). The other 7 clubs
have 10 events each on rotating days. The answer and every number are in `FACILITATOR.md`.

## Adding a gallery block

1. Copy an existing `webapp/gallery/samples/*.fragment.xml`. Keep the standard
   `core:FragmentDefinition` namespace header **exactly**, with the prefixes `f`, `card`, `layout`,
   `mc`, `viz`, `viz.data` and `viz.feeds` (shells also use `tnt`). These must match what the
   workspace views declare, or the pasted code breaks.
2. Bind only to the sample data (`{/kpis}` …). Use only handlers and formatters from
   `BaseController` / `formatter.js`.
3. Add an entry to `webapp/gallery/samples.json`.
4. Run `node tools/e2e/paste-test.js <Id>`, then `npm run verify`.

**Changing the data or the case:** edit `tools/data/*.js`, run `npm run generate-data` (story checks),
`npm test`, then `npm run sync-data` + `npm test` in the solution repo (checks the answer numbers), then
update the numbers in `FACILITATOR.md`. Every SQL block there can be pasted into the Playground as is.

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
  `headerMode="Inline"` and no icons (see Solution.view.xml in the solution repo).
- **A margin class on a 100%-wide control overflows the page** (the solution page's IconTabBar). Pad the
  parent instead.
- **Rows of cards need `flex: 1 1 0` plus a min-width** (in `style.css`). With a non-zero flex-basis,
  `wsWide` only gets a share of the leftover space and barely looks wider.
- **Static hosting has no `/resources`.** `tools/build-static.js` rewrites both index.html files
  to the SAP CDN. The workspace index.html sets `data-sap-ui-xx-component-preload="off"`, because
  `ui5 build` only bundles the kit's Component-preload (without it there's a 404 for
  workspace/Component-preload.js).
- **A `MessageBox` opened while the app renders is closed again.** The workspace opens the data.js
  dialog after `rootControlLoaded()` + a short timeout. (Before Oct 2026 the dialog never showed, so
  the paste test's dialog check couldn't fail.)
- **sql.js must not be minified or bundled** by `ui5 build`: `ui5.yaml` excludes
  `workshop/dashboard/thirdparty/**` (that exact pattern; `/resources/…` didn't work), and
  `ui5lint.config.mjs` ignores it. `db.js` loads it with a script tag and `window.initSqlJs`.
- **Query results need simple column names** to bind: `ROUND(AVG(x))` without `AS` can't be bound.
  The Playground warns, and the workspace lists it in the data.js dialog.
- **Student-facing examples must not give the answer away.** Don't use "show-up by weekday" or
  "topic × weekday" in the README, cheat sheet, Playground help, examples or error messages.

## Possible next steps (not started)

- **A mock run of the whole event** with someone who has never used UI5: fork → `npm install` →
  `npm start`, time the first successful paste (should be under 5 minutes) and how long the case
  takes to crack. Then the outside-reader check from issue #2 (brief understood in 30 seconds).
- Hosting on SAP BTP (the static build is ready; only the deploy target is open).
- Wire the filter blocks to actually filter (`sap.ui.model.Filter` on the items binding). Today they only show a toast.
- A printable judging sheet from the rubric in `FACILITATOR.md`.
- Visual alignment with the Figma S/4HANA Web UI Kit, which needs file access.
