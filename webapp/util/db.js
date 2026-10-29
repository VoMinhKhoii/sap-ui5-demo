sap.ui.define([
  "./sql"
], function (SqlHelper) {
  "use strict";

  // The data is one SQLite file (webapp/data/clubs.sqlite), opened in the browser with sql.js
  // (SQLite compiled to WebAssembly, in webapp/thirdparty/). No backend: the dev server only serves files.
  const BASE = sap.ui.require.toUrl("workshop/dashboard");
  let loaded = null;

  function getJson(url) {
    return fetch(url).then(function (response) {
      if (!response.ok) {
        throw new Error("GET " + url + " failed: " + response.status);
      }
      return response.json();
    });
  }

  // sap.viz brings RequireJS, which puts a global define() on the page. sql.js would then register itself as an
  // anonymous AMD module ("Mismatched anonymous define()") instead of only setting window.initSqlJs. So its code
  // runs inside a function where define is undefined.
  function loadScript(url) {
    if (window.initSqlJs) {
      return Promise.resolve();
    }
    return fetch(url).then(function (response) {
      if (!response.ok) {
        throw new Error("Could not load " + url + ": " + response.status);
      }
      return response.text();
    }).then(function (code) {
      const script = document.createElement("script");
      script.text = "(function (define) {\n" + code + "\nwindow.initSqlJs = initSqlJs;\n})();";
      document.head.appendChild(script);
      if (!window.initSqlJs) {
        throw new Error("Could not start " + url);
      }
    });
  }

  return {
    url: function (file) {
      return BASE + "/data/" + file;
    },

    /**
     * Opens the database once and returns { sql, schema, sample, case }.
     * sql("SELECT …") → rows, sql.one("SELECT …") → one row (see util/sql.js).
     */
    load: function () {
      if (!loaded) {
        const engine = loadScript(BASE + "/thirdparty/sql-wasm.js").then(function () {
          return window.initSqlJs({ locateFile: function (file) { return BASE + "/thirdparty/" + file; } });
        });
        const file = fetch(this.url("clubs.sqlite")).then(function (response) {
          if (!response.ok) {
            throw new Error("GET clubs.sqlite failed: " + response.status);
          }
          return response.arrayBuffer();
        });
        loaded = Promise.all([engine, file, getJson(this.url("schema.json")), getJson(this.url("sample.json")), getJson(this.url("case.json"))]).then(function (r) {
          const db = new r[0].Database(new Uint8Array(r[1]));
          return { sql: SqlHelper.create(db, r[2]), schema: r[2], sample: r[3], case: r[4] };
        });
      }
      return loaded;
    },

    emptySample: function () {
      return { meta: { trend: {}, breakdown: {}, items: { columns: {} } }, kpis: [], trend: [], breakdown: [], items: [], alerts: [], clubList: [] };
    }
  };
});
