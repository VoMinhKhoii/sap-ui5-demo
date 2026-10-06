sap.ui.define([
  "./BaseController",
  "sap/ui/model/json/JSONModel",
  "../util/api"
], function (BaseController, JSONModel, api) {
  "use strict";

  return BaseController.extend("workshop.dashboard.controller.ApiExplorer", {
    onInit: function () {
      this._model = new JSONModel({ endpoints: [], endpoint: "kpis", url: "", binding: "", response: "" });
      this.getView().setModel(this._model, "explorer");

      api.loadIndex().then(function (index) {
        this._model.setProperty("/endpoints", index.endpoints);
        this._select("kpis");
      }.bind(this));

      // Re-load when the scenario changes in the header.
      this.getOwnerComponent().getModel("app").bindProperty("/scenario").attachChange(function () {
        this._select(this._model.getProperty("/endpoint"));
      }, this);
    },

    onEndpointSelect: function (event) {
      const path = event.getParameter("listItem").getBindingContext("explorer").getProperty("path");
      this._select(path.match(/\/(\w+)\.json$/)[1]);
    },

    _select: function (endpoint) {
      const scenario = this.getOwnerComponent().getModel("app").getProperty("/scenario");
      const list = this.byId("endpointList");
      list.getItems().forEach(function (item) {
        if (item.getTitle().indexOf("/" + endpoint + ".json") > -1) {
          list.setSelectedItem(item);
        }
      });
      this._model.setProperty("/endpoint", endpoint);
      this._model.setProperty("/url", api.url(scenario, endpoint));
      this._model.setProperty("/binding", endpoint === "meta" ? "{/meta/title}" : "{/" + endpoint + "}");
      api.get(scenario, endpoint).then(function (json) {
        this._model.setProperty("/response", JSON.stringify(json, null, 2));
      }.bind(this));
    }
  });
});
