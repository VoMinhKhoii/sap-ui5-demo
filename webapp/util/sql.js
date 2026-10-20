sap.ui.define([], function () {
  "use strict";

  /**
   * The query function teams use in data.js and the Query Playground:
   *   sql("SELECT …")       → all rows, as a list of objects   → items="{/name}" / data="{/name}", then {column}
   *   sql.one("SELECT …")   → the first row, as one object     → {/name/column}
   * Errors are rewritten into plain English with a "did you mean". Node-testable (see tools/test.js).
   */
  const NAME = /^[A-Za-z_][A-Za-z0-9_]*$/;

  function distance(a, b) {
    const d = [];
    for (let i = 0; i <= a.length; i++) {
      d[i] = [i];
      for (let j = 1; j <= b.length; j++) {
        d[i][j] = i === 0 ? j : Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      }
    }
    return d[a.length][b.length];
  }

  function closest(word, candidates) {
    const w = word.toLowerCase();
    const part = candidates.filter(function (c) { return w.length >= 3 && c.toLowerCase().indexOf(w) > -1; })
      .sort(function (x, y) { return x.length - y.length; })[0];
    if (part) {
      return part; // "showup" → showup_pct
    }
    const best = candidates.map(function (c) { return { c: c, d: distance(w, c.toLowerCase()) }; })
      .sort(function (x, y) { return x.d - y.d; })[0];
    return best && best.d <= Math.max(2, Math.floor(w.length / 3)) ? best.c : "";
  }

  function create(db, schema) {
    const tables = schema.tables.map(function (t) { return t.name; });
    const columns = [];
    schema.tables.forEach(function (t) {
      t.fields.forEach(function (f) {
        if (columns.indexOf(f.name) < 0) {
          columns.push(f.name);
        }
      });
    });

    function friendly(error) {
      const message = error.message;
      let m = /no such column: ([\w.]+)/.exec(message);
      if (m) {
        const guess = closest(m[1].split(".").pop(), columns);
        return new Error("There is no column \"" + m[1] + "\"." + (guess ? " Did you mean " + guess + "?"
          : " If you meant text, put it in single quotes: topic = 'Talk'."));
      }
      m = /no such table: (\w+)/.exec(message);
      if (m) {
        const guess = closest(m[1], tables);
        return new Error("There is no table \"" + m[1] + "\"." + (guess ? " Did you mean " + guess + "?" : "") + " The tables are: " + tables.join(", ") + ".");
      }
      if (/syntax error|incomplete input/.test(message)) {
        return new Error("SQL syntax error (" + message + "). Check the commas between columns, that every ( has a ), and that text is in single quotes: 'Talk'.");
      }
      return new Error(message);
    }

    function run(query) {
      if (typeof query !== "string" || !query.trim()) {
        throw new Error("The query is empty.");
      }
      if (!/^\s*(--[^\n]*\n\s*)*(SELECT|WITH)\b/i.test(query)) {
        throw new Error("Only SELECT queries work here: they read the data and never change it.");
      }
      let results;
      try {
        results = db.exec(query);
      } catch (e) {
        throw friendly(e);
      }
      if (!results.length) {
        return [];
      }
      const last = results[results.length - 1];
      return last.values.map(function (values) {
        const row = {};
        last.columns.forEach(function (column, i) { row[column] = values[i]; });
        return row;
      });
    }

    const sql = function (query) {
      return run(query);
    };
    sql.one = function (query) {
      return run(query)[0] || null;
    };
    return sql;
  }

  /** Columns you can't bind to, e.g. "ROUND(AVG(fill_pct))" without AS. */
  function badColumns(result) {
    const row = Array.isArray(result) ? result[0] : result;
    return row ? Object.keys(row).filter(function (c) { return !NAME.test(c); }) : [];
  }

  return { create: create, badColumns: badColumns, NAME: NAME };
});
