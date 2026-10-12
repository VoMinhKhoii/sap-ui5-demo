// Opens the student workspace (/workspace/) on every page for one scenario, prints console errors and saves screenshots.
// Needs the dev server running (npm start) and Playwright: npm i --no-save playwright && npx playwright install chromium
// Usage: node tools/e2e/check-workspace.js [scenario] [caseId]
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const BASE = process.env.BASE_URL || "http://localhost:8080";
const scenario = process.argv[2] || "sustainability";
const caseId = process.argv[3] || "";
const out = path.join(__dirname, "screenshots");
const IGNORE = /page stack is empty|Cannot navigate to page|Parameters\.get|favicon|selectedItem association should be a valid NavigationListItem|JQMIGRATE/;

(async () => {
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errors = [];
  page.on("console", (m) => { if ((m.type() === "error" || m.type() === "warning") && !IGNORE.test(m.text())) errors.push(m.type() + ": " + m.text().slice(0, 300)); });
  page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
  await page.addInitScript(([s, c]) => { localStorage.setItem("workshop.scenario", s); if (c) localStorage.setItem("workshop.case", c); }, [scenario, caseId]);
  let total = 0;
  for (const route of ["", "page2", "page3"]) {
    errors.length = 0;
    await page.goto(`${BASE}/workspace/index.html#/${route}`);
    await page.waitForTimeout(4000);
    const dialog = await page.locator(".sapMMessageBox").count();
    if (dialog) errors.push("data.js error dialog is open: " + (await page.locator(".sapMMessageBox").innerText()).slice(0, 300));
    await page.screenshot({ path: path.join(out, `workspace-${scenario}-${route || "page1"}.png`) });
    total += errors.length;
    console.log(`${errors.length ? "FAIL" : "ok  "} workspace/#/${route}`);
    [...new Set(errors)].forEach((e) => console.log("      " + e));
  }
  await browser.close();
  process.exitCode = total ? 1 : 0;
})();
