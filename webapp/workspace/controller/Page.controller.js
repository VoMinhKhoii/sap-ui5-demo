sap.ui.define([
  "workshop/dashboard/controller/BaseController"
], function (BaseController) {
  "use strict";

  /**
   * Controller of your pages (Page1, Page2, Page3 all use it).
   *
   * Already available (inherited from the kit's BaseController):
   *   - this.formatter.*   → use in XML as formatter: '.formatter.compactNumber'
   *   - .onKpiPress, .onItemPress, .onChartSelect, .onActionPress, .onStatusFilter, .onShowDetail, .onCloseDetail
   *
   * Your data is in the default model: this.getView().getModel().getProperty("/revenueByMonth")
   */
  return BaseController.extend("workshop.dashboard.workspace.controller.Page", {
    onInit: function () {
      // Gives every chart on the page clean Fiori defaults.
      this.styleCharts(this.getView());
    }

    // TODO (optional): your own formatter or event handler, e.g.
    //
    // , formatGap: function (value, target) {
    //     return (value - target).toFixed(1) + " vs. target";
    //   }
    //
    // and use it in XML:  text="{ parts: ['value', 'target'], formatter: '.formatGap' }"
  });
});
