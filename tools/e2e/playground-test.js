// Picks every example in the Query Playground dropdown and checks that the editor shows its code,
// the query runs without an error, and the preview renders.
// Needs the dev server running (npm start) and Playwright: npm i --no-save playwright && npx playwright install chromium
// Usage: node tools/e2e/playground-test.js
const { chromium } = require("playwright");

const BASE = process.env.BASE_URL || "http://localhost:8080";

(async () => {
  const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errors = [];
  page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
  await page.goto(`${BASE}/index.html#/playground`);
  await page.waitForTimeout(5000);

  const state = () => page.evaluate(() => {
    const view = sap.ui.core.Element.registry.filter((c) => c.isA("sap.ui.core.mvc.XMLView") && /Playground/.test(c.getViewName()))[0];
    const model = view.getModel("pg");
    return {
      examples: model.getProperty("/examples").map((e) => ({ id: e.id, title: e.title, code: e.code })),
      editor: view.byId("editor").getAceEditor().getValue(),
      error: model.getProperty("/error"),
      previews: view.byId("preview").getItems().length
    };
  });

  let failures = 0;
  const { examples } = await state();
  for (const ex of examples) {
    await page.locator("[id$='exampleSelect']").click();
    await page.waitForTimeout(300);
    await page.locator(".sapMSelectList li", { hasText: ex.title }).first().click();
    await page.waitForTimeout(600); // let the dropdown close before the next click
    // Wait until the preview of this example is there (charts and tables take a moment to load).
    let now = await state();
    for (let waited = 0; waited < 5000 && !now.error && (!now.previews || now.editor !== ex.code); waited += 250) {
      await page.waitForTimeout(250);
      now = await state();
    }
    const problems = [];
    if (now.editor !== ex.code) problems.push("editor shows another query: " + now.editor.replace(/\s+/g, " ").slice(0, 60));
    if (now.error) problems.push("error: " + now.error);
    if (!now.previews) problems.push("no preview rendered");
    if (problems.length) failures++;
    console.log(`${problems.length ? "FAIL" : "ok  "} ${ex.id}`);
    problems.concat(errors.splice(0)).forEach((p) => console.log("      " + p));
  }
  await browser.close();
  console.log("failures:", failures);
  process.exitCode = failures ? 1 : 0;
})();
