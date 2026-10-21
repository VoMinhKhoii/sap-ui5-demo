// Opens every kit page, prints console errors and saves screenshots.
// Needs the dev server running (npm start) and Playwright: npm i --no-save playwright && npx playwright install chromium
// Usage: node tools/e2e/check-pages.js [route,route,...]
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const BASE = process.env.BASE_URL || "http://localhost:8080";
const routes = (process.argv[2] || "home,gallery/layout,gallery/shells,gallery/kpis,gallery/charts,gallery/micro,gallery/tables,gallery/status,gallery/filters,gallery/templates,playground").split(",");
const out = path.join(__dirname, "screenshots");
// Known framework-internal noise that is not caused by our code.
const IGNORE = /page stack is empty|Cannot navigate to page|Parameters\.get|favicon|selectedItem association should be a valid NavigationListItem|JQMIGRATE/;

(async () => {
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errors = [];
  page.on("console", (m) => { if ((m.type() === "error" || m.type() === "warning") && !IGNORE.test(m.text())) errors.push(m.type() + ": " + m.text().slice(0, 300)); });
  page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
  let total = 0;
  for (const r of routes) {
    errors.length = 0;
    await page.goto(`${BASE}/index.html#/${r === "home" ? "" : r}`);
    await page.waitForTimeout(r.startsWith("gallery") ? 5000 : 3500);
    await page.screenshot({ path: path.join(out, `kit-${r.replace("/", "_")}.png`) });
    total += errors.length;
    console.log(`${errors.length ? "FAIL" : "ok  "} ${r}`);
    [...new Set(errors)].forEach((e) => console.log("      " + e));
    await page.goto("about:blank");
  }
  await browser.close();
  console.log(`screenshots: ${out}`);
  process.exitCode = total ? 1 : 0;
})();
