sap.ui.define([
  "./BaseController"
], function (BaseController) {
  "use strict";

  return BaseController.extend("workshop.dashboard.controller.Home", {
    onGoGallery: function () { this.navTo("gallery"); },
    onGoApi: function () { this.navTo("api"); },
    onGoDashboard: function () { this.navTo("dashboard"); }
  });
});
