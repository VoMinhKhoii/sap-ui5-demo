# UI5 Dashboard Workshop

A 45-minute hands-on challenge: **solve a business case with SAP data and build the Fiori app that
proves your answer**, in SAPUI5. The company is fictional: **Northwind Motion GmbH** (e-bikes and
e-scooters, 4 European plants). No UI5 experience needed. You get working building blocks, ready
layouts and a query tool, so you can spend your time on the important part: *what is really going
on, and how do you show it?*

## Setup (5 minutes)

You need **Node.js 20 or newer**.

```bash
cd sap-ui5-demo
npm install
npm start          # opens http://localhost:8080
```

On the first start, `ui5 serve` downloads the SAPUI5 libraries, which takes about a minute. Every
later start is fast.

## Two browser tabs

| Tab | URL | What it's for |
| --- | --- | --- |
| **1. The kit** | <http://localhost:8080> | Your case, the Component Gallery, the API Explorer and the Query Playground |
| **2. Your app** | <http://localhost:8080/workspace/> | *Your* Fiori app. Open it with **Open my app** in the kit |

The kit's pages:

| Page | What it's for |
| --- | --- |
| **Start here** | Pick your team's case (3 cases, easy → hard), read the hints |
| **Component Gallery** | 29 live building blocks, 3 app shells and layouts, 3 page templates. Each has a **Copy XML** button |
| **API Explorer** | Every endpoint and ERP table, field by field |
| **Query Playground** | Ask the data a question in one line of JavaScript and see the answer as a chart. Your tables and their fields are listed on the left |
| **Reference Solution** | One finished answer page per case, for facilitators |

## The challenge (45 min)

1. **Read your case (5 min).** Each case has a client (e.g. the CFO), a deadline, and an
   *assumption* the client believes. The data may prove them wrong.
2. **Investigate (15 min).** Test the assumption in the **Query Playground**. Find the real cause.
3. **Decide the story (5 min).** On paper: the finding (one sentence), the evidence (1–2 charts),
   the action you recommend.
4. **Build (15 min).** Page 1 of your app is laid out for exactly that story. Stretch goals:
   pages 2 and 3, your own shell (sidebar or tabs), a list → detail page.
5. **Pitch (2 min per team).** What did the client believe, what is true, what should they do?

**How you are marked (100 points):** Insight 30 · Evidence 25 · Clarity 20 · Fiori craft 15 ·
Ambition 10. Details are on *Start here*.

## Your app: the files you edit

Everything lives in `webapp/workspace/`. Save a file, then press **F5** in your app's tab.

| File | What it is |
| --- | --- |
| `data.js` | **Your data.** One line per query: `overdue: q("A_BillingDocument")…` becomes `{/overdue}` in XML |
| `view/Page1.view.xml` | **The answer** (required): finding → evidence → action, laid out as rows of cards with 🧩 paste slots |
| `view/Page2.view.xml`, `Page3.view.xml` | Optional extra pages, already wired to the navigation |
| `view/App.view.xml` | The shell around your pages: header and navigation. Swap it in Gallery → *App shells* |
| `controller/Page.controller.js` | Optional: your own formatters and event handlers |

The workflow:

1. Write a query in the **Query Playground** until the chart shows what you mean.
2. **Copy for data.js** and paste it between the 🧩 markers in `data.js`.
3. **Copy XML** and paste it into a 🧩 slot of a page. It's already bound to your query.
4. Add cards, KPIs and status blocks from the **Gallery** around it.

**Layout = rows of cards.** Each `<HBox class="wsRow" renderType="Bare">` is a row. Cards in a row
share its width equally: paste a third card and the row is split in thirds. Add `class="wsWide"` to
a card to make it twice as wide. On a narrow screen the cards wrap by themselves.

## The data

There are two levels, both static JSON served by the dev server (no backend, no CORS).

**ERP tables (where the answers are).** These are raw company records, shaped like SAP S/4HANA
APIs. The workshop uses three of them:

| Table | Rows | What's in it |
| --- | --- | --- |
| `ZI_PlantEmissions` | 60 | per plant and month: CO2e, budget, electricity, renewable share, waste, vehicles built |
| `ZI_SustainabilityInitiative` | 7 | decarbonization projects: plant, go-live dates, progress, status |
| `A_Plant` | 5 | the plants |

They're served at `/api/erp/<Table>.json` in an OData-style envelope `{ "@odata.context": …, "value": [...] }`.
Query them with `q()`, for example:

```js
q("ZI_PlantEmissions").groupBy("PlantName").sum("CO2eTonnes")
// → [{ name: "Hamburg", PlantName: "Hamburg", value: 3600, count: 12, share: 28.8 }, ...]
```

**Level 1 (ready to bind).** These are summaries of the business area, ready for the gallery blocks:

| Bind with | Contains |
| --- | --- |
| `{/meta/title}` | titles, labels, the business question |
| `{/kpis}` | 4 KPIs: `value, unit, target, trend, state, history[]` |
| `{/trend}` | 12 months: `month, actual, plan, previousYear` |
| `{/breakdown}` | per plant or region: `name, value, target, share, state` |
| `{/items}` | records: `id, title, subtitle, owner, date, amount, progress, status, state` |
| `{/alerts}` | `type, title, description, date` |

Your case is in `{/case/title}`, `{/case/question}`, `{/case/client}` …

All companies, people and numbers are invented. Northwind Motion is not a real company.

## Stuck?

* **A red "data.js" dialog?** It names the query that failed and suggests the right field name.
  The rest of your app still works.
* **Blank page or "nothing changed"?** Press **F12** and open the Console. The error usually names
  the line. Did you press F5 in the app tab?
* **"Undefined namespace prefix"?** Every prefix the gallery uses (`f:`, `card:`, `layout:`, `mc:`,
  `viz:`, `tnt:` …) is already declared at the top of your page files. Don't delete those lines.
* **Tag not closed?** Each `<Tag ...>` needs `</Tag>`, or it must self-close as `<Tag ... />`.
* Read [`CHEATSHEET.md`](./CHEATSHEET.md) for XML, binding and `q()` on one page.
* Use the official control docs and samples at <https://ui5.sap.com/#/controls>.
* For design reference, see the [SAP S/4HANA Web UI Kit (Figma community)](https://www.figma.com/design/yHeQmZKANdrcu7jOWv17FN/SAP-S-4HANA-Web-UI-Kit--Community-).

## For facilitators

Read [`FACILITATOR.md`](./FACILITATOR.md) first. It has the run of show, the answer to every case
with the queries that prove it, and the marking rubric.

**Scenarios:** the workshop runs **sustainability** only. Sales and supply chain (with their own
tables and 2 cases each) are built in but switched off. Turn them on in `webapp/config.json`
(`"scenarios": ["sustainability", "sales", "supply-chain"]`), or open the kit with `?scenarios=all`
for a quick look.

```
sap-ui5-demo/
├─ webapp/
│  ├─ workspace/               the students' app (tab 2): shell, 3 pages, data.js
│  ├─ api/                     mock API (generated, see tools/)
│  │  ├─ erp/                  14 S/4HANA-style tables + index.json (field docs, relations)
│  │  ├─ <scenario>/           level-1 endpoints, computed from the ERP tables
│  │  └─ cases.json            the case files (3 sustainability, 2 sales, 2 supply chain)
│  ├─ gallery/samples.json     gallery catalog: categories, titles, docs links
│  ├─ gallery/samples/*.xml    one fragment per block = live preview AND the copied code
│  ├─ gallery/shells/*.xml     app shells and the list → detail layout
│  ├─ templates/*.xml          3 full-page templates
│  ├─ util/q.js                the query helper (also used by the workspace)
│  ├─ util/snippet.js          turns a query result into ready-to-paste XML (Playground)
│  ├─ solution/queries.js      the reference solution's queries (same format as data.js)
│  ├─ config.json              which scenarios are switched on
│  └─ controller/BaseController.js  handlers + chart styling shared by kit and workspace
├─ tools/generate-api.js       builds api/** from tools/erp/*.js, checks every planted story
└─ tools/test-q.js             tests q() and proves every case can be solved
```

* **Add a gallery block:** create `webapp/gallery/samples/MyBlock.fragment.xml` (copy an existing
  one to get the namespace header), then add an entry in `gallery/samples.json`. The preview and
  the copied code come from the same file, so they can't drift apart.
* **Change the data or a case:** edit `tools/erp/*.js` and run `npm run generate-api`. It fails
  loudly if a planted story no longer holds. Then run `npm test`.
* **Check everything:** run `npm run verify` (`ui5lint` + `ui5 build`) and `npm test`.
* **Reset a team's app:** run `git checkout webapp/workspace`.
* **Share a read-only copy online:** `npm run build:static` (builds the kit and loads SAPUI5 from SAP's
  CDN instead of `ui5 serve`), then `vercel deploy dist-static/ui5-dashboard-workshop --prod`.
  Current copy: <https://ui5-dashboard-workshop.vercel.app>. Students still work locally, because
  their app is files they edit.
