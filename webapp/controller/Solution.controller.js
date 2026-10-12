sap.ui.define([
  "./BaseController",
  "sap/ui/model/json/JSONModel",
  "../solution/queries"
], function (BaseController, JSONModel, queries) {
  "use strict";

  return BaseController.extend("workshop.dashboard.controller.Solution", {
    onInit: function () {
      this.styleCharts(this.getView());
      const component = this.getOwnerComponent();

      // The solution page has its own data: the results of webapp/solution/queries.js, like a team's data.js.
      component.erpReady.then(function () {
        const defs = queries(component.q);
        const data = {};
        Object.keys(defs).forEach(function (name) {
          data[name] = defs[name].resolve();
        });
        this.getView().setModel(new JSONModel(data));
      }.bind(this)).catch(function () {
        this.byId("solutionError").setVisible(true);
      }.bind(this));

      // "The code" tab shows the query file itself.
      fetch(sap.ui.require.toUrl("workshop/dashboard/solution/queries.js")).then(function (response) {
        return response.text();
      }).then(function (text) {
        sap.ui.require(["sap/ui/codeeditor/CodeEditor"], function (CodeEditor) {
          // value via setValue(): the code contains {...}, which a constructor setting would parse as binding.
          this.byId("codeBox").addItem(new CodeEditor({ type: "javascript", editable: false, width: "100%", height: "40rem" }).setValue(text));
        }.bind(this));
      }.bind(this));
    }
  });
});
