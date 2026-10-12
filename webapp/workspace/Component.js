sap.ui.define([
  "sap/ui/core/UIComponent",
  "sap/ui/model/json/JSONModel",
  "sap/m/MessageBox",
  "../util/api",
  "../util/q"
], function (UIComponent, JSONModel, MessageBox, api, Q) {
  "use strict";

  function read(key) {
    try { return window.localStorage.getItem(key); } catch (e) { return null; }
  }

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
      // Default model: level-1 data of the scenario ({/kpis} ...), your data.js queries ({/yourQuery}),
      // the raw ERP tables ({/erp/A_Plant}) and your case ({/case/title}).
      const dataModel = new JSONModel(api.emptyScenario());
      dataModel.setSizeLimit(5000); // lists show up to 100 rows by default
      this.setModel(dataModel);
      this.setModel(new JSONModel({ scenario: "", errors: [] }), "app");

      // Same scenario as the kit (tab 1), as long as it is switched on in config.json.
      this.dataReady = api.loadConfig().then(function (enabled) {
        const saved = read("workshop.scenario");
        const scenario = enabled.indexOf(saved) > -1 ? saved : enabled[0];
        this.getModel("app").setProperty("/scenario", scenario);
        return this._load(scenario, read("workshop.case"));
      }.bind(this));
      this.getRouter().initialize();
    },

    _load: function (scenario, caseId) {
      return Promise.all([api.loadScenario(scenario), api.loadErp(), api.loadCases(), loadDataJs()]).then(function (results) {
        const erp = results[1], cases = results[2], dataJs = results[3];
        const q = Q.create(erp.db, erp.index.relations);
        const data = Object.assign({}, results[0], {
          erp: erp.db,
          case: cases.find(function (c) { return c.id === caseId; }) || cases.find(function (c) { return c.scenario === scenario; })
        });
        const errors = [];
        let queries = {};
        if (dataJs.error) {
          errors.push("data.js could not be loaded: " + dataJs.error.message);
        } else {
          try {
            queries = dataJs.fn(q) || {};
          } catch (e) {
            errors.push("data.js: " + e.message);
          }
        }
        Object.keys(queries).forEach(function (name) {
          try {
            data[name] = q.isQuery(queries[name]) ? queries[name].resolve() : queries[name];
          } catch (e) {
            errors.push(name + ": " + e.message);
          }
        });
        this.getModel().setData(data);
        this.getModel("app").setProperty("/errors", errors);
        if (errors.length) {
          MessageBox.error("Some of your queries in webapp/workspace/data.js failed. The rest of the app still works.", {
            title: "data.js: " + errors.length + " problem" + (errors.length > 1 ? "s" : ""),
            details: errors.join("\n\n")
          });
        }
        return data;
      }.bind(this));
    }
  });
});
