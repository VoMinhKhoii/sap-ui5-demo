// Builds a static copy of the kit for hosting without `ui5 serve` (e.g. Vercel): `npm run build:static`.
// Runs `ui5 build`, then points both index.html files at SAP's UI5 CDN, because a static host has no /resources.
// Output: dist-static/ui5-dashboard-workshop/ (the folder name becomes the Vercel project name).
// Deploy: vercel deploy dist-static/ui5-dashboard-workshop
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const root = path.join(__dirname, "..");
const version = fs.readFileSync(path.join(root, "ui5.yaml"), "utf8").match(/version:\s*"([\d.]+)"/)[1];
const cdn = `https://ui5.sap.com/${version}/resources/sap-ui-core.js`;
const out = path.join(root, "dist-static", "ui5-dashboard-workshop");

execSync("npx ui5 build --clean-dest", { cwd: root, stdio: "inherit" });

// Keep the .vercel link folder between builds, replace everything else.
fs.mkdirSync(out, { recursive: true });
for (const entry of fs.readdirSync(out)) {
  if (entry !== ".vercel") fs.rmSync(path.join(out, entry), { recursive: true, force: true });
}
fs.cpSync(path.join(root, "dist"), out, { recursive: true });

// Files people read as code in the browser (Reference Solution → "The code") stay unminified.
for (const file of ["solution/queries.js", "workspace/data.js"]) {
  fs.copyFileSync(path.join(root, "webapp", file), path.join(out, file));
}

for (const page of ["index.html", "workspace/index.html"]) {
  const file = path.join(out, page);
  const html = fs.readFileSync(file, "utf8");
  const patched = html.replace(/src="(\.\.\/)?resources\/sap-ui-core\.js"/, `src="${cdn}"`);
  if (patched === html) throw new Error("UI5 bootstrap not found in " + page);
  fs.writeFileSync(file, patched);
}
console.log(`Static build ready: ${path.relative(root, out)} (SAPUI5 ${version} from ui5.sap.com)`);
