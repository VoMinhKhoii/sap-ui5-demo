// Opens every page for one scenario, prints console errors and saves screenshots.
// Needs the dev server running (npm start) and Playwright: npm i --no-save playwright && npx playwright install chromium
// Usage: node tools/e2e/check-pages.js [scenario] [route,route,...]
//   scenario: supply-chain | sales | sustainability (default supply-chain)
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const BASE = process.env.BASE_URL || "http://localhost:8080";
const scenario = process.argv[2] || "supply-chain";
const routes = (process.argv[3] || "home,gallery/layout,gallery/kpis,gallery/charts,gallery/micro,gallery/tables,gallery/status,gallery/filters,gallery/templates,api,dashboard,solution").split(",");
const out = path.join(__dirname, "screenshots");
// Known framework-internal noise that is not caused by our code.
const IGNORE = /page stack is empty|Cannot navigate to page|Parameters\.get|favicon|selectedItem association should be a valid NavigationListItem|JQMIGRATE/;

(async () => {
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = [];
  page.on("console", (m) => { if ((m.type() === "error" || m.type() === "warning") && !IGNORE.test(m.text())) errors.push(m.type() + ": " + m.text().slice(0, 300)); });
  page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
  await page.addInitScript((s) => localStorage.setItem("workshop.scenario", s), scenario);
  let total = 0;
  for (const r of routes) {
    errors.length = 0;
    await page.goto(`${BASE}/index.html#/${r === "home" ? "" : r}`);
    await page.waitForTimeout(r.startsWith("gallery") ? 5000 : 3500);
    await page.screenshot({ path: path.join(out, `${scenario}-${r.replace("/", "_")}.png`) });
    total += errors.length;
    console.log(`${errors.length ? "FAIL" : "ok  "} ${r}`);
    [...new Set(errors)].forEach((e) => console.log("      " + e));
    await page.goto("about:blank");
  }
  await browser.close();
  console.log(`screenshots: ${out}`);
  process.exitCode = total ? 1 : 0;
})();
