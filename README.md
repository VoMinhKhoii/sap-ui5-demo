# UI5 Dashboard Workshop: The Friday Problem

A 45-minute hands-on challenge: **find out what's really going on in the data, then build the SAPUI5
dashboard that proves it.** The case is about a student club whose events look half empty. You
investigate with SQL and build the answer in SAPUI5 (Fiori). No UI5 experience needed: you get
working building blocks, ready layouts and a query tool.

## Setup (5 minutes)

You need **Node.js 20 or newer** (`node -v` to check) and Git.

1. **Fork** this repository on GitHub (button top right), then clone your fork:
   ```bash
   git clone https://github.com/<your-name>/sap-ui5-demo.git
   cd sap-ui5-demo
   ```
2. Install and start:
   ```bash
   npm install
   npm start          # opens http://localhost:8080
   ```

The **first** `npm start` downloads the SAPUI5 libraries, which takes about a minute. Every later
start is fast. Nothing else to install: the data is already in the repo.

## Two browser tabs

| Tab | URL | What it's for |
| --- | --- | --- |
| **1. The kit** | <http://localhost:8080> | The case, the Component Gallery and the Query Playground |
| **2. Your app** | <http://localhost:8080/workspace/> | *Your* Fiori app. Open it with **Open my app** in the kit |

| Kit page | What it's for |
| --- | --- |
| **Start here** | The case: the story, the three suspects, what your dashboard must include, two hints |
| **Component Gallery** | 29 live building blocks, 3 app shells and layouts, 3 page templates. Each has a **Copy XML** button |
| **Query Playground** | The 4 tables as a diagram (point at a column to see what it means), then ask the data a question in SQL, see the answer as a chart and copy it into your app |

## The challenge (45 min)

| Time | Your move |
| --- | --- |
| 0–5 min | Read the case on **Start here**. Open your app in a second tab. |
| 5–20 min | Investigate in the **Query Playground**. Which of the three suspects does the data support? |
| 20–25 min | Decide what your dashboard must say: the finding, the key number, the chart, the next move. |
| 25–40 min | Build page 1 of your app with your queries and blocks from the Gallery. |
| 40–45 min | Test, refine, prepare your pitch. |
| Pitch | 2 minutes: what did you discover, what proves it, what should the club do next semester? |

**How you are marked (100 points):** Insight 30 · Evidence 25 · Clarity 20 · Fiori craft 15 ·
Ambition 10. Details are on *Start here*.

## Your app: the files you edit

Everything lives in `webapp/workspace/`. Save a file, then press **F5** in your app's tab.

| File | What it is |
| --- | --- |
| `data.js` | **Your data.** Your SQL queries, each with a name: `membersByClub: sql(…)` becomes `{/membersByClub}` in XML |
| `view/Page1.view.xml` | **The answer** (required): finding → evidence → action, laid out as rows of cards with 🧩 paste slots |
| `view/Page2.view.xml`, `Page3.view.xml` | Optional extra pages, already wired to the navigation |
| `view/App.view.xml` | The shell around your pages: header and navigation. Swap it in Gallery → *App shells* |
| `controller/Page.controller.js` | Optional: your own formatters and event handlers |

The workflow:

1. Write a query in the **Query Playground** until the chart shows what you mean.
2. Give it a name, click **Copy for data.js** and paste it between the 🧩 markers in `data.js`.
3. Click **Copy XML** and paste it into a 🧩 slot of a page. It's already bound to your query.
4. Add cards, KPIs and status blocks from the **Gallery** around it.

```js
// data.js
membersByClub: sql(`SELECT name, members FROM clubs ORDER BY members DESC`),   // many rows
codingClub: sql.one(`SELECT name, members FROM clubs WHERE club_id = 'C01'`),     // one row
```

```xml
<!-- a page -->
<List items="{/membersByClub}"><StandardListItem title="{name}" info="{members}" /></List>
<Text text="{/codingClub/name} has {/codingClub/members} members" />
```

**Layout = rows of cards.** Each `<HBox class="wsRow" renderType="Bare">` is a row. Cards in a row
share its width equally: paste a third card and the row is split in thirds. Add `class="wsWide"` to
a card to make it twice as wide. On a narrow screen the cards wrap by themselves.

## The data

One small SQLite database (`webapp/data/clubs.sqlite`) with the 8 student clubs of a fictional
university, autumn semester 2026 (weeks 1–10, 7 Sep – 13 Nov). It runs right in your browser
([sql.js](https://sql.js.org)), so there's no server or database to set up.

| Table | Rows | What's in it |
| --- | --- | --- |
| `events` | 90 | every club event: topic, date, weekday, time, room, seats, sign-ups, check-ins, `showup_pct`, `fill_pct`, rating |
| `clubs` | 8 | the clubs: name, category, members, sponsor |
| `promotion_posts` | 286 | posts that advertised the events: channel, date, reach |
| `room_bookings` | 6 | room bookings already fixed for **next** semester |

The diagram at the top of the **Query Playground** explains every column and shows how the tables
link. The gallery blocks show ready-made sample data (`{/kpis}`, `{/trend}` …, see *Show the sample
data* in the Gallery) that is in your app too, so a pasted block works straight away.

All clubs, people and companies are invented.

## Stuck?

* **A red "data.js" dialog?** It names the query that failed and suggests the right column name.
  The rest of your app still works. Common fixes: name calculated columns with `AS`, put text in
  single quotes (`'Talk'`), and keep the comma after each query.
* **Blank page or "nothing changed"?** Press **F12** and open the Console. The error usually names
  the line. Did you press F5 in the app tab?
* **"Undefined namespace prefix"?** Every prefix the gallery uses (`f:`, `card:`, `layout:`, `mc:`,
  `viz:`, `tnt:` …) is already declared at the top of your page files. Don't delete those lines.
* **Tag not closed?** Each `<Tag ...>` needs `</Tag>`, or it must self-close as `<Tag ... />`.
* **Start over?** `git checkout webapp/workspace` puts your app back to the start.
* Read [`CHEATSHEET.md`](./CHEATSHEET.md) for XML, binding and SQL on one page.
* Use the official control docs and samples at <https://ui5.sap.com/#/controls>.
* For design reference, see the [SAP S/4HANA Web UI Kit (Figma community)](https://www.figma.com/design/yHeQmZKANdrcu7jOWv17FN/SAP-S-4HANA-Web-UI-Kit--Community-).

## For facilitators

Read [`FACILITATOR.md`](./FACILITATOR.md) first. It has the run of show, the answer with the queries
that prove it, and the marking rubric. A finished answer page lives in a separate, private repo
([ui5-workshop-solution](https://github.com/VoMinhKhoii/ui5-workshop-solution)), so teams can't open it from the kit.

```
sap-ui5-demo/
├─ webapp/
│  ├─ workspace/               the students' app (tab 2): shell, 3 pages, data.js
│  ├─ data/                    generated: clubs.sqlite, schema.json (column docs), case.json, sample.json (gallery data)
│  ├─ thirdparty/              sql.js (SQLite as WebAssembly), copied from node_modules by the generator
│  ├─ gallery/samples.json     gallery catalog: categories, titles, docs links
│  ├─ gallery/samples/*.xml    one fragment per block = live preview AND the copied code
│  ├─ gallery/shells/*.xml     app shells and the list → detail layout
│  ├─ templates/*.xml          3 full-page templates
│  ├─ util/sql.js              sql() / sql.one() with plain-English errors (kit, workspace, tests)
│  ├─ util/db.js               opens the database in the browser
│  ├─ util/snippet.js          turns a query result into ready-to-paste XML (Playground)
│  └─ controller/BaseController.js  handlers + chart styling shared by kit and workspace
├─ tools/generate-data.js      builds webapp/data/ from tools/data/*.js, checks the planted story
└─ tools/test.js               tests sql() and proves the case can be solved with SQL
```

* **Change the data or the case:** edit `tools/data/*.js` and run `npm run generate-data`. It fails
  loudly if the story no longer holds. Then run `npm test` and update the numbers in `FACILITATOR.md`.
* **Add a gallery block:** create `webapp/gallery/samples/MyBlock.fragment.xml` (copy an existing
  one to get the namespace header), then add an entry in `gallery/samples.json`.
* **Check everything:** `npm run verify` (`ui5lint` + `ui5 build`) and `npm test`.
* **Share a read-only copy online:** `npm run build:static` builds the kit with SAPUI5 loaded from
  SAP's CDN, ready for any static host.
