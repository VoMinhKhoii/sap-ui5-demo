# UI5 Dashboard Workshop

A 45-minute hands-on challenge: **design and build a Fiori dashboard in SAPUI5** for a fictional
company, **Northwind Motion GmbH** (e-bikes and e-scooters, 4 European plants). No UI5 experience
needed. You copy working building blocks from a gallery, then spend your time on the important
part: *what should a manager see, and how do you show it?*

## Setup (5 minutes)

You need **Node.js 20 or newer**.

```bash
cd sap-ui5-demo
npm install
npm start          # opens http://localhost:8080
```

On the first start, `ui5 serve` downloads the SAPUI5 libraries, which takes about a minute. Every
later start is fast.

## What's inside

| Page | What it's for |
| --- | --- |
| **Start here** | Your scenario, the business question, and the challenge |
| **Component Gallery** | 28 live building blocks and 3 full page templates. Each one has a **Copy XML** button |
| **API Explorer** | The JSON behind the dashboard, endpoint by endpoint |
| **My Dashboard** | *Your* page. You edit `webapp/view/Dashboard.view.xml` |
| **Reference Solution** | One possible answer, for facilitators. Don't peek too early 😉 |

Use the **Scenario** dropdown in the top bar to switch between three business areas. Every block
works with every scenario.

| Scenario | Business question |
| --- | --- |
| 🚚 **Supply Chain & Warehouse** | Can we ship the Christmas season, and where is the bottleneck? |
| 💶 **Sales & Order-to-Cash** | Will we hit plan, which regions lag, and who owes us money? |
| 🌱 **Sustainability & Carbon** | Are we on track for the 2030 CO2 target, and which plant needs help? |

Each dataset hides a story (a supplier failure, an overdue fleet customer, a plant over its
emission budget). A good dashboard makes that story obvious in 3 seconds.

## The challenge (45 min)

1. **Understand (5 min).** Read the scenario on *Start here*. Skim the *API Explorer*.
2. **Sketch (10 min).** On paper: what goes top-left? What is the one number that matters? What is detail?
3. **Build (25 min).** Copy blocks from the *Gallery* into `webapp/view/Dashboard.view.xml`
   between the `🧩 START` / `🧩 END` markers. Save, then press **F5** in the browser.
4. **Pitch (2 min per team).** What story does your dashboard tell?

**Judging criteria:** clarity of the story · right chart for the data · use of Fiori colors and
states · something creative (a combination nobody else tried, smart use of the alerts …).

## The API

The API is plain REST with static JSON, served by the same dev server (`webapp/api/`). The app has
already called every endpoint and stored the result in the **default model**, so in XML you bind
straight to it:

| Endpoint | Bind with | Contains |
| --- | --- | --- |
| `/api/{scenario}/meta.json` | `{/meta/title}` | titles, labels, the business question |
| `/api/{scenario}/kpis.json` | `{/kpis}` | 4 KPIs: `value, unit, target, trend, state, history[]` |
| `/api/{scenario}/trend.json` | `{/trend}` | 12 months: `month, actual, plan, previousYear` |
| `/api/{scenario}/breakdown.json` | `{/breakdown}` | per plant or region: `name, value, target, share, state` |
| `/api/{scenario}/items.json` | `{/items}` | records: `id, title, subtitle, owner, date, amount, progress, status, state` |
| `/api/{scenario}/alerts.json` | `{/alerts}` | `type, title, description, date` |

`{scenario}` is `supply-chain`, `sales` or `sustainability`. All three return the **same shape**.

## Stuck?

* **Blank page or "nothing changed"?** Press **F12** and open the Console. The error usually names the line.
* **"Undefined namespace prefix"?** Every prefix the gallery uses (`f:`, `card:`, `layout:`, `mc:`,
  `viz:` …) is already declared at the top of `Dashboard.view.xml`. Don't delete those lines.
* **Tag not closed?** Each `<Tag ...>` needs `</Tag>`, or it must self-close as `<Tag ... />`.
* Read [`CHEATSHEET.md`](./CHEATSHEET.md) for XML, binding and formatters on one page.
* Use the official control docs and samples at <https://ui5.sap.com/#/controls>.
* For design reference, see the [SAP S/4HANA Web UI Kit (Figma community)](https://www.figma.com/design/yHeQmZKANdrcu7jOWv17FN/SAP-S-4HANA-Web-UI-Kit--Community-).

## For facilitators

```
sap-ui5-demo/
├─ webapp/
│  ├─ api/                     mock API (generated, see tools/)
│  ├─ gallery/samples.json     gallery catalog: categories, titles, docs links
│  ├─ gallery/samples/*.xml    one fragment per block = live preview AND the copied code
│  ├─ templates/*.xml          3 full-page templates
│  ├─ view/Dashboard.view.xml  student workspace
│  ├─ view/Solution.view.xml   reference solution
│  ├─ controller/BaseController.js  handlers + chart styling shared by all pages
│  └─ util/formatter.js        formatters used by the snippets
└─ tools/generate-api.js       edit scenario data here, then `npm run generate-api`
```

* **Add a gallery block:** create `webapp/gallery/samples/MyBlock.fragment.xml` (copy an existing
  one to get the namespace header), then add an entry in `gallery/samples.json`. The preview and
  the copied code come from the same file, so they can't drift apart.
* **Change the data:** edit `tools/generate-api.js` and run `npm run generate-api`.
* **Check everything:** run `npm run verify`, which runs `ui5lint` and `ui5 build`.
* **Reset a student's dashboard:** run `git checkout webapp/view/Dashboard.view.xml`.

Run of show (45 min): 5' intro and scenario pick → 5' gallery demo (copy a KPI row live) →
30' build → 5' pitches and vote.
