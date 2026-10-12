sap.ui.define([
  "sap/ui/core/UIComponent",
  "sap/ui/model/json/JSONModel",
  "./util/api",
  "./util/q",
  "./util/examples"
], function (UIComponent, JSONModel, api, Q, examples) {
  "use strict";

  function read(key) {
    try { return window.localStorage.getItem(key); } catch (e) { return null; }
  }
  function write(key, value) {
    try { window.localStorage.setItem(key, value); } catch (e) { /* storage unavailable */ }
  }

  return UIComponent.extend("workshop.dashboard.Component", {
    metadata: {
      manifest: "json",
      interfaces: ["sap.ui.core.IAsyncContentCreation"]
    },

    init: function () {
      UIComponent.prototype.init.apply(this, arguments);

      // "app" model: selected scenario and case, the list of scenarios and cases.
      this.setModel(new JSONModel({ scenario: "", scenarios: [], multiScenario: false, cases: [], caseId: read("workshop.case") || "", case: null, busy: true }), "app");

      // Default (unnamed) model: the level-1 data of the selected scenario
      // { meta, kpis, trend, breakdown, items, alerts }  ->  bind with {/kpis}, {/trend}, ...
      // plus the example queries marked "preview" (e.g. {/plants}) so the gallery previews look like the workspace.
      const dataModel = new JSONModel(api.emptyScenario());
      dataModel.setSizeLimit(5000); // lists show up to 100 rows by default
      this.setModel(dataModel);
      this._examples = {};

      // Only the scenarios switched on in config.json (or ?scenarios=all) are offered.
      Promise.all([api.loadIndex(), api.loadConfig()]).then(function (results) {
        const enabled = results[1];
        const saved = read("workshop.scenario");
        this.getModel("app").setProperty("/scenarios", results[0].scenarios.filter(function (s) { return enabled.indexOf(s.id) > -1; }));
        this.getModel("app").setProperty("/multiScenario", enabled.length > 1);
        this.loadScenario(enabled.indexOf(saved) > -1 ? saved : enabled[0]);
      }.bind(this));
      api.loadCases().then(function (cases) {
        this.getModel("app").setProperty("/cases", cases);
        this._syncCase();
      }.bind(this));
      this.erpReady = api.loadErp().then(function (erp) {
        this.q = Q.create(erp.db, erp.index.relations);
        examples.filter(function (ex) { return ex.preview; }).forEach(function (ex) {
          try {
            this._examples[ex.id] = this.q.run(ex.code);
          } catch (e) {
            // its tables belong to a scenario that is switched off
          }
        }, this);
        Object.keys(this._examples).forEach(function (name) {
          this.getModel().setProperty("/" + name, this._examples[name]);
        }, this);
        return erp;
      }.bind(this));

      this.getRouter().initialize();
    },

    /**
     * Loads all level-1 endpoints of a scenario and puts them into the default model.
     * @param {string} scenarioId supply-chain | sales | sustainability
     * @returns {Promise<object>} the loaded data
     */
    loadScenario: function (scenarioId) {
      const appModel = this.getModel("app");
      appModel.setProperty("/scenario", scenarioId);
      appModel.setProperty("/busy", true);
      write("workshop.scenario", scenarioId);

      return api.loadScenario(scenarioId).then(function (data) {
        this.getModel().setData(Object.assign({}, data, this._examples));
        appModel.setProperty("/busy", false);
        this._syncCase();
        return data;
      }.bind(this));
    },

    /** Picks the team's case. The workspace app (tab 2) reads it from localStorage. */
    selectCase: function (caseId) {
      const found = this.getModel("app").getProperty("/cases").find(function (c) { return c.id === caseId; });
      this.getModel("app").setProperty("/caseId", caseId);
      write("workshop.case", caseId);
      if (found && found.scenario !== this.getModel("app").getProperty("/scenario")) {
        return this.loadScenario(found.scenario);
      }
      this._syncCase();
      return Promise.resolve();
    },

    _syncCase: function () {
      const appModel = this.getModel("app");
      const cases = appModel.getProperty("/cases") || [];
      const scenario = appModel.getProperty("/scenario");
      cases.forEach(function (c) {
        c.selected = c.id === appModel.getProperty("/caseId");
        c.inScenario = c.scenario === scenario;
      });
      appModel.setProperty("/cases", cases);
      appModel.setProperty("/case", cases.find(function (c) { return c.selected; }) || null);
    }
  });
});
