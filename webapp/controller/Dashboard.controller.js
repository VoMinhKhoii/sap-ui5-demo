sap.ui.define([
  "./BaseController",
  "sap/m/MessageToast"
], function (BaseController, MessageToast) {
  "use strict";

  /**
   * Controller of YOUR dashboard.
   *
   * Already available (inherited from BaseController):
   *   - this.formatter.*   → use in XML as formatter: '.formatter.compactNumber'
   *   - .onKpiPress, .onItemPress, .onChartSelect, .onActionPress, .onStatusFilter
   *
   * The data of the selected scenario is in the default model:
   *   this.getView().getModel().getProperty("/kpis")
   */
  return BaseController.extend("workshop.dashboard.controller.Dashboard", {
    onInit: function () {
      // Gives every chart on this page clean Fiori defaults (no title, data labels on).
      this.styleCharts(this.getView());
    },

    onRefresh: function () {
      const scenario = this.getOwnerComponent().getModel("app").getProperty("/scenario");
      this.getOwnerComponent().loadScenario(scenario).then(function () {
        MessageToast.show("Data reloaded");
      });
    }

    // TODO (optional): write your own formatter or event handler here, e.g.
    //
    // , formatGap: function (value, target) {
    //     return (value - target).toFixed(1) + " vs. target";
    //   }
    //
    // and use it in XML:  text="{ parts: ['value', 'target'], formatter: '.formatGap' }"
  });
});
