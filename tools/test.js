// Tests the SQL layer, the Playground examples and the starter data.js against the generated database.
// Run: npm test   (after npm run generate-data)
// The answer queries and their numbers are tested in the separate reference-solution repo (ui5-workshop-solution).
const fs = require("fs");
const path = require("path");
const assert = require("assert");
const initSqlJs = require("sql.js");

const webapp = path.join(__dirname, "..", "webapp");
let factory;
global.sap = { ui: { define: (deps, f) => { factory = f; } } };
const load = (file) => { require(path.join(webapp, file)); return factory(); };
const SqlHelper = load("util/sql.js");
const snippet = load("util/snippet.js");
const examples = load("util/examples.js");
const dataJs = load("workspace/data.js");

let failed = 0;
function test(name, fn) {
  try { fn(); console.log("ok    " + name); } catch (e) { failed++; console.log("FAIL  " + name + "\n      " + e.message); }
}
const throwsLike = (fn, re) => assert.throws(fn, (e) => re.test(e.message) || assert.fail("message was: " + e.message));

initSqlJs().then((SQL) => {
  const schema = JSON.parse(fs.readFileSync(path.join(webapp, "data/schema.json"), "utf8"));
  const db = new SQL.Database(fs.readFileSync(path.join(webapp, "data/clubs.sqlite")));
  const sql = SqlHelper.create(db, schema);

  // ---- The query function
  test("sql() returns rows as objects, sql.one() one object", () => {
    const rows = sql("SELECT club_id, name FROM clubs ORDER BY club_id");
    assert.strictEqual(rows.length, 8);
    assert.deepStrictEqual(rows[0], { club_id: "C01", name: "Coding Club" });
    assert.strictEqual(sql.one("SELECT COUNT(*) AS n FROM events").n, 90);
    assert.strictEqual(sql.one("SELECT * FROM clubs WHERE club_id = 'nope'"), null);
  });
  test("a wrong column name suggests the right one", () => {
    throwsLike(() => sql("SELECT showup FROM events"), /no column "showup".*Did you mean showup_pct/);
    throwsLike(() => sql("SELECT * FROM event"), /no table "event".*Did you mean events/);
  });
  test("syntax errors and non-SELECT queries get a plain-English message", () => {
    throwsLike(() => sql("SELECT weekday, FROM events"), /syntax error.*commas/);
    throwsLike(() => sql("DELETE FROM events"), /Only SELECT/);
    assert.strictEqual(sql("-- my query\nSELECT 1 AS one")[0].one, 1);
  });
  test("columns without AS are flagged, because you can't bind them", () => {
    assert.deepStrictEqual(SqlHelper.badColumns(sql("SELECT weekday, AVG(fill_pct) FROM events GROUP BY weekday")), ["AVG(fill_pct)"]);
    assert.deepStrictEqual(SqlHelper.badColumns(sql.one("SELECT AVG(fill_pct) AS fill FROM events")), []);
  });
  test("every schema table and column exists in the database", () => {
    schema.tables.forEach((t) => {
      const cols = sql(`SELECT name FROM pragma_table_info('${t.name}')`).map((c) => c.name);
      assert.deepStrictEqual(cols, t.fields.map((f) => f.name), t.name);
      assert.strictEqual(sql.one(`SELECT COUNT(*) AS n FROM ${t.name}`).n, t.count, t.name);
    });
  });

  // ---- Playground examples and the snippet builder
  test("every Playground example runs and gives bindable columns", () => {
    examples.forEach((ex) => {
      const rows = sql(ex.code);
      assert.ok(rows.length, ex.id + " returns no rows");
      assert.deepStrictEqual(SqlHelper.badColumns(rows), [], ex.id);
    });
  });
  test("no Playground example gives the answer away (Coding Club by weekday)", () => {
    examples.forEach((ex) => assert.ok(!/GROUP BY[^;]*weekday/i.test(ex.code), ex.id));
  });
  test("every view of every example builds XML bound to {/name}", () => {
    examples.forEach((ex) => {
      const rows = sql(ex.code);
      const result = rows.length === 1 ? rows[0] : rows;
      snippet.shape(result).views.forEach((v) => {
        const xml = snippet.build(ex.id, result, v);
        assert.ok(xml.indexOf("{/" + ex.id) > -1, ex.id + "/" + v);
      });
    });
  });
  test("snippet: first column = label, a second text column = colour, one row = big numbers", () => {
    const two = snippet.shape(sql("SELECT topic, weekday, AVG(fill_pct) AS fill FROM events GROUP BY topic, weekday"));
    assert.deepStrictEqual([two.dimensions, two.measures], [["topic", "weekday"], ["fill"]]);
    assert.strictEqual(snippet.shape(sql("SELECT week, AVG(fill_pct) AS fill FROM events GROUP BY week")).views[0], "line");
    assert.deepStrictEqual(snippet.shape(sql.one("SELECT COUNT(*) AS n, 'x' AS t FROM events")).views, ["number", "record"]);
    assert.deepStrictEqual(snippet.shape(sql("SELECT * FROM events")).views, ["table"]);
    assert.ok(/\{\/k\/n\}/.test(snippet.build("k", { n: 1 }, "number")));
  });
  test("wide result tables scroll horizontally without responsive pop-ins", () => {
    const xml = snippet.build("events", sql("SELECT * FROM events LIMIT 2"), "table");
    assert.match(xml, /<ScrollContainer horizontal="true" vertical="false"/);
    assert.match(xml, /<Table[^>]*fixedLayout="false"/);
    assert.match(xml, /wrapping="false"/);
    assert.ok(!xml.includes("autoPopinMode"));
  });

  // ---- The starter data.js
  test("the starter data.js runs", () => {
    const defs = dataJs((q) => ({ query: q }));
    Object.keys(defs).forEach((name) => assert.ok(sql(defs[name].query).length, name));
  });

  console.log(failed ? `${failed} test(s) failed` : "all tests passed");
  process.exitCode = failed ? 1 : 0;
});
