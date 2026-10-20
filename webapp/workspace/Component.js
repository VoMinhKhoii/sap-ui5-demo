sap.ui.define([
  "sap/ui/core/UIComponent",
  "sap/ui/model/json/JSONModel",
  "sap/m/MessageBox",
  "../util/db",
  "../util/sql"
], function (UIComponent, JSONModel, MessageBox, db, SqlHelper) {
  "use strict";

  // data.js is loaded on its own, so a typo in it shows an error message instead of a blank page.
  function loadDataJs() {
    return new Promise(function (resolve) {
      sap.ui.require(["workshop/dashboard/workspace/data"], function (fn) {
        resolve({ fn: fn });
      }, function (error) {
        resolve({ error: error });
      });
    });
  }

  return UIComponent.extend("workshop.dashboard.workspace.Component", {
    metadata: {
      manifest: "json",
      interfaces: ["sap.ui.core.IAsyncContentCreation"]
    },

    init: function () {
      UIComponent.prototype.init.apply(this, arguments);
      // Default model: your data.js queries ({/yourQuery}), your case ({/case/title})
      // and the gallery sample data ({/kpis} ...), so a pasted gallery block works right away.
      const dataModel = new JSONModel(db.emptySample());
      dataModel.setSizeLimit(5000); // lists show up to 100 rows by default
      this.setModel(dataModel);
      this.setModel(new JSONModel({ errors: [] }), "app");
      this.dataReady = Promise.all([db.load(), loadDataJs()]).then(this._load.bind(this));
      this.getRouter().initialize();
    },

    _load: function (results) {
      const loaded = results[0], dataJs = results[1];
      const data = Object.assign({}, loaded.sample, { case: loaded.case });
      const errors = [];
      let queries = {};
      if (dataJs.error) {
        errors.push("data.js has a typo (" + dataJs.error.message + "). Usually a query is missing its comma at the end: `), " +
          "or a ` is missing around the SQL. F12 → Console shows the line.");
      } else {
        // Each sql() runs right here. A broken query must not stop the others, so they're run one by one.
        const sql = function (query) { return { query: query, one: false }; };
        sql.one = function (query) { return { query: query, one: true }; };
        try {
          queries = dataJs.fn(sql) || {};
        } catch (e) {
          errors.push("data.js: " + e.message);
        }
      }
      Object.keys(queries).forEach(function (name) {
        const def = queries[name];
        if (!def || typeof def.query !== "string") {
          data[name] = def;
          return;
        }
        try {
          data[name] = def.one ? loaded.sql.one(def.query) : loaded.sql(def.query);
          const bad = SqlHelper.badColumns(data[name]);
          if (bad.length) {
            errors.push(name + ": give " + bad.join(", ") + " a name with AS (e.g. ROUND(AVG(fill_pct)) AS fill_pct), or you can't bind it.");
          }
        } catch (e) {
          errors.push(name + ": " + e.message);
        }
      });
      this.getModel().setData(data);
      this.getModel("app").setProperty("/errors", errors);
      if (errors.length) {
        // Open it after the first page is on screen: a dialog opened while the app renders gets closed again.
        this.rootControlLoaded().then(function () {
          setTimeout(function () {
            MessageBox.error("Some of your queries in webapp/workspace/data.js need a fix. The rest of the app still works.\n\n" + errors.join("\n\n"), {
              title: "data.js: " + errors.length + " problem" + (errors.length > 1 ? "s" : "")
            });
          }, 300);
        });
      }
      return data;
    }
  });
});
