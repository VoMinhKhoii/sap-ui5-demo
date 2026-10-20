// Generates the workshop data from tools/data/*.js. Run: npm run generate-data
//
//   webapp/data/clubs.sqlite   the database teams query with SQL (4 tables)
//   webapp/data/schema.json    tables, fields with their meaning, relations (API Explorer, Playground)
//   webapp/data/case.json      the case: brief, hypotheses, hints
//   webapp/data/sample.json    sample data for the gallery blocks ({/kpis}, {/trend} ...)
//   webapp/thirdparty/         sql.js (SQLite compiled to WebAssembly), copied from node_modules
//
// The data is random but seeded, so every run produces the same files. The story is checked in
// tools/data/checks.js: if a change breaks it, the generator fails.
const fs = require("fs");
const path = require("path");
const initSqlJs = require("sql.js");
const { build } = require("./data/clubs");
const { checks } = require("./data/checks");
const { TABLES, RELATIONS, CASE, sample } = require("./data/content");

const webapp = path.join(__dirname, "..", "webapp");
const out = path.join(webapp, "data");

const tables = build();
const results = checks(tables);

const typeOf = (rows, field) => {
  const v = rows.map((r) => r[field]).find((x) => x !== null && x !== undefined);
  return typeof v === "number" ? (rows.every((r) => r[field] === null || Number.isInteger(r[field])) ? "INTEGER" : "REAL") : "TEXT";
};

initSqlJs().then((SQL) => {
  const db = new SQL.Database();
  const schema = { tables: [], relations: RELATIONS };
  for (const [name, rows] of Object.entries(tables)) {
    const doc = TABLES[name];
    const fields = Object.keys(rows[0]);
    const fk = RELATIONS.filter((r) => r.from === name && !r.note);
    const columns = fields.map((f) => {
      const ref = fk.find((r) => r.field === f);
      return `${f} ${typeOf(rows, f)}${f === doc.key ? " PRIMARY KEY" : ""}${ref ? ` REFERENCES ${ref.to}(${ref.key})` : ""}`;
    });
    db.run(`CREATE TABLE ${name} (${columns.join(", ")})`);
    const insert = db.prepare(`INSERT INTO ${name} VALUES (${fields.map(() => "?").join(", ")})`);
    rows.forEach((r) => insert.run(fields.map((f) => r[f])));
    insert.free();
    schema.tables.push({
      name, title: doc.title, description: doc.description, key: doc.key, count: rows.length,
      fields: fields.map((f) => ({ name: f, type: typeOf(rows, f), description: doc.fields[f] || "", example: rows[0][f] }))
    });
  }

  fs.rmSync(out, { recursive: true, force: true });
  fs.mkdirSync(out, { recursive: true });
  const write = (file, data) => fs.writeFileSync(path.join(out, file), JSON.stringify(data, null, 2) + "\n");
  fs.writeFileSync(path.join(out, "clubs.sqlite"), Buffer.from(db.export()));
  write("schema.json", schema);
  write("case.json", CASE);
  write("sample.json", sample(tables));
  db.close();

  // The browser needs sql.js too. It's committed, so a team only needs `npm install` for the dev server.
  const dist = path.join(path.dirname(require.resolve("sql.js")), "..", "dist");
  const third = path.join(webapp, "thirdparty");
  fs.mkdirSync(third, { recursive: true });
  ["sql-wasm.js", "sql-wasm.wasm"].forEach((f) => fs.copyFileSync(path.join(dist, f), path.join(third, f)));
  fs.copyFileSync(path.join(dist, "..", "LICENSE"), path.join(third, "sql.js-LICENSE"));

  console.log(Object.entries(tables).map(([n, r]) => `${n} ${r.length}`).join(" · "));
  console.log(results.map((c) => (c.ok ? "ok    " : "FAIL  ") + c.text).join("\n"));
  if (results.some((c) => !c.ok)) {
    console.error("The story no longer holds. Adjust tools/data/clubs.js");
    process.exitCode = 1;
  }
});
