sap.ui.define([
  "sap/ui/core/UIComponent",
  "sap/ui/model/json/JSONModel",
  "./util/api"
], function (UIComponent, JSONModel, api) {
  "use strict";

  return UIComponent.extend("workshop.dashboard.Component", {
    metadata: {
      manifest: "json",
      interfaces: ["sap.ui.core.IAsyncContentCreation"]
    },

    init: function () {
      UIComponent.prototype.init.apply(this, arguments);

      // "app" model: which scenario is selected + the list of scenarios.
      this.setModel(new JSONModel({ scenario: "supply-chain", scenarios: [], busy: true }), "app");

      // Default (unnamed) model: the data of the selected scenario.
      // { meta, kpis, trend, breakdown, items, alerts }  ->  bind with {/kpis}, {/trend}, ...
      this.setModel(new JSONModel(api.emptyScenario()));

      api.loadIndex().then(function (index) {
        this.getModel("app").setProperty("/scenarios", index.scenarios);
      }.bind(this));
      this.loadScenario(this._readSavedScenario());

      this.getRouter().initialize();
    },

    /**
     * Loads all endpoints of a scenario and puts them into the default model.
     * @param {string} scenarioId supply-chain | sales | sustainability
     * @returns {Promise<object>} the loaded data
     */
    loadScenario: function (scenarioId) {
      const appModel = this.getModel("app");
      appModel.setProperty("/scenario", scenarioId);
      appModel.setProperty("/busy", true);
      try { window.localStorage.setItem("workshop.scenario", scenarioId); } catch (e) { /* storage unavailable */ }

      return api.loadScenario(scenarioId).then(function (data) {
        this.getModel().setData(data);
        appModel.setProperty("/busy", false);
        return data;
      }.bind(this));
    },

    _readSavedScenario: function () {
      try {
        return window.localStorage.getItem("workshop.scenario") || "supply-chain";
      } catch (e) {
        return "supply-chain";
      }
    }
  });
});
