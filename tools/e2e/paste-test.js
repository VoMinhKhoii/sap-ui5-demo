// Simulates a student: pastes every gallery snippet into Dashboard.view.xml one by one,
// loads #/dashboard and checks it renders without console errors. Restores the view afterwards.
// Needs the dev server running (npm start) and Playwright: npm i --no-save playwright && npx playwright install chromium
// Usage: node tools/e2e/paste-test.js [SampleId]
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const BASE = process.env.BASE_URL || "http://localhost:8080";
const app = path.join(__dirname, "..", "..", "webapp");
const viewFile = path.join(app, "view/Dashboard.view.xml");
const original = fs.readFileSync(viewFile, "utf8");
const only = process.argv[2];
// Same stripping the gallery does before copying to the clipboard.
const strip = (t) => t.replace(/<core:FragmentDefinition[\s\S]*?>\s*/, "").replace(/\s*<\/core:FragmentDefinition>\s*$/, "").trim();
const catalog = JSON.parse(fs.readFileSync(path.join(app, "gallery/samples.json"), "utf8"));
const CHART_SLOT = '<Text text="Paste a chart here" />';
const MORE_SLOT = "<!-- 🧩 MORE START (Gallery → Page templates) -->";

(async () => {
  const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  let failures = 0;
  try {
    for (const cat of catalog.categories) for (const s of cat.samples) {
      if (only && s.id !== only) continue;
      const file = path.join(app, s.template ? "templates" : "gallery/samples", s.id + ".fragment.xml");
      const snippet = strip(fs.readFileSync(file, "utf8"));
      const slot = s.template ? MORE_SLOT : CHART_SLOT;
      if (!original.includes(slot)) throw new Error("Paste marker missing in Dashboard.view.xml: " + slot);
      fs.writeFileSync(viewFile, original.replace(slot, s.template ? slot + "\n" + snippet : snippet));

      const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
      const errors = [];
      page.on("console", (m) => { if (m.type() === "error" && !/favicon/.test(m.text())) errors.push(m.text().slice(0, 250)); });
      page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
      await page.goto(`${BASE}/index.html#/dashboard`);
      await page.waitForSelector("[id$='dashboardPage']", { timeout: 15000 }).catch(() => errors.push("dashboard page did not render"));
      await page.waitForTimeout(2000);
      if (errors.length) failures++;
      console.log(`${errors.length ? "FAIL" : "ok  "} ${cat.key}/${s.id}`);
      errors.forEach((e) => console.log("      " + e));
      await page.close();
    }
  } finally {
    fs.writeFileSync(viewFile, original);
    await browser.close();
  }
  console.log("failures:", failures);
  process.exitCode = failures ? 1 : 0;
})();
