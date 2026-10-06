sap.ui.define([
  "./BaseController"
], function (BaseController) {
  "use strict";

  return BaseController.extend("workshop.dashboard.controller.Solution", {
    onInit: function () {
      this.styleCharts(this.getView());
    }
  });
});
