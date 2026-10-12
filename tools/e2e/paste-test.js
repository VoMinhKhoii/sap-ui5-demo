// Simulates a student: pastes every copyable snippet into the workspace app and checks it renders without errors.
//   - every gallery block            → workspace/view/Page1.view.xml (Evidence A slot, templates into the MORE slot)
//   - every app shell                → workspace/view/App.view.xml (between the SHELL markers)
//   - the List → detail page layout  → workspace/view/Page2.view.xml (between the PAGE markers)
//   - every Query Playground example → its "Copy for data.js" into data.js + its "Copy XML" into Page1
// All files are restored afterwards.
// Needs the dev server running (npm start) and Playwright: npm i --no-save playwright && npx playwright install chromium
// Usage: node tools/e2e/paste-test.js [Id]      (a gallery sample id or a Playground example id)
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const BASE = process.env.BASE_URL || "http://localhost:8080";
const app = path.join(__dirname, "..", "..", "webapp");
const files = {
  page1: path.join(app, "workspace/view/Page1.view.xml"),
  page2: path.join(app, "workspace/view/Page2.view.xml"),
  shell: path.join(app, "workspace/view/App.view.xml"),
  data: path.join(app, "workspace/data.js")
};
const original = {};
Object.entries(files).forEach(([k, f]) => { original[k] = fs.readFileSync(f, "utf8"); });
const only = process.argv[2];

// Same stripping the gallery does before copying to the clipboard.
const strip = (t) => t.replace(/<core:FragmentDefinition[\s\S]*?>\s*/, "").replace(/\s*<\/core:FragmentDefinition>\s*$/, "").trim();
const between = (text, start, end, snippet) => {
  const a = text.indexOf(start), b = text.indexOf(end);
  if (a < 0 || b < 0) throw new Error("Paste markers missing: " + start);
  return text.slice(0, a + start.length) + "\n" + snippet + "\n" + text.slice(b);
};
const CHART_SLOT = '<Text text="Paste a chart here" />';
const MORE_SLOT = "<!-- 🧩 MORE START (more cards, or Gallery → Page templates) -->";

// Load the kit's examples + snippet builder + q() in node, exactly as the Playground uses them.
let factory;
global.sap = { ui: { define: (deps, f) => { factory = f; } } };
require(path.join(app, "util/q.js")); const Q = factory();
require(path.join(app, "util/snippet.js")); const snippet = factory();
require(path.join(app, "util/examples.js")); const examples = factory();
const erpIndex = JSON.parse(fs.readFileSync(path.join(app, "api/erp/index.json"), "utf8"));
const db = {};
erpIndex.entities.forEach((e) => { db[e.name] = JSON.parse(fs.readFileSync(path.join(app, "api/erp", e.name + ".json"), "utf8")).value; });
const q = Q.create(db, erpIndex.relations);

const jobs = [];
const catalog = JSON.parse(fs.readFileSync(path.join(app, "gallery/samples.json"), "utf8"));
for (const cat of catalog.categories) for (const s of cat.samples) {
  const folder = s.template ? "templates" : s.shell ? "gallery/shells" : "gallery/samples";
  const code = strip(fs.readFileSync(path.join(app, folder, s.id + ".fragment.xml"), "utf8"));
  if (s.id === "ListDetail") {
    jobs.push({ id: s.id, label: "shells/" + s.id, route: "page2", edit: { page2: (t) => between(t, "<!-- 🧩 PAGE START (a page layout from Gallery → App shells replaces everything down to PAGE END) -->", "<!-- 🧩 PAGE END -->", code) } });
  } else if (s.shell) {
    jobs.push({ id: s.id, label: "shells/" + s.id, route: "", edit: { shell: (t) => between(t, "<!-- 🧩 SHELL START (Gallery → App shells) -->", "<!-- 🧩 SHELL END -->", code) } });
  } else {
    jobs.push({ id: s.id, label: cat.key + "/" + s.id, route: "", edit: { page1: (t) => s.template ? t.replace(MORE_SLOT, MORE_SLOT + "\n" + code) : t.replace(CHART_SLOT, code) } });
  }
}
// Only the examples of the scenarios switched on in webapp/config.json, like the Playground shows them.
const enabled = JSON.parse(fs.readFileSync(path.join(app, "config.json"), "utf8")).scenarios;
for (const ex of examples.filter((e) => e.scenario === "all" || enabled.includes(e.scenario))) {
  const result = q.run(ex.code);
  for (const view of snippet.shape(result).views) {
    const xml = snippet.build(ex.id, result, view);
    const dataJs = "      " + ex.id + "Pasted: " + ex.code.trim().split("\n").map((l, i) => (i ? "      " + l : l)).join("\n") + ",";
    jobs.push({
      id: ex.id, label: "playground/" + ex.id + " (" + view + ")", route: "",
      edit: {
        data: (t) => t.replace("// 🧩 YOUR QUERIES START", "// 🧩 YOUR QUERIES START\n" + dataJs),
        page1: (t) => t.replace(CHART_SLOT, xml.split("{/" + ex.id).join("{/" + ex.id + "Pasted"))
      }
    });
  }
}

(async () => {
  const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  let failures = 0;
  try {
    for (const job of jobs) {
      if (only && job.id !== only) continue;
      Object.keys(files).forEach((k) => fs.writeFileSync(files[k], job.edit[k] ? job.edit[k](original[k]) : original[k]));
      const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
      const errors = [];
      page.on("console", (m) => { if (m.type() === "error" && !/favicon/.test(m.text())) errors.push(m.text().slice(0, 250)); });
      page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
      await page.addInitScript((sc) => localStorage.setItem("workshop.scenario", sc), enabled[0]);
      await page.goto(`${BASE}/workspace/index.html#/${job.route}`);
      await page.waitForSelector(".sapTntToolPage, .sapFFCL", { timeout: 15000 }).catch(() => errors.push("app did not render"));
      await page.waitForTimeout(2500);
      if (await page.locator(".sapMMessageBox").count()) errors.push("data.js error: " + (await page.locator(".sapMMessageBox").innerText()).slice(0, 250));
      if (errors.length) failures++;
      console.log(`${errors.length ? "FAIL" : "ok  "} ${job.label}`);
      errors.forEach((e) => console.log("      " + e));
      await page.close();
    }
  } finally {
    Object.keys(files).forEach((k) => fs.writeFileSync(files[k], original[k]));
    await browser.close();
  }
  console.log("failures:", failures);
  process.exitCode = failures ? 1 : 0;
})();
