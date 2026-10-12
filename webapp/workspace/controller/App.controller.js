sap.ui.define([
  "workshop/dashboard/controller/BaseController"
], function (BaseController) {
  "use strict";

  /** Controller of the app shell. Keeps the navigation (id="nav") in sync with the page that is open. */
  return BaseController.extend("workshop.dashboard.workspace.controller.App", {
    onInit: function () {
      this.getRouter().attachRouteMatched(function (event) {
        const nav = this.byId("nav");
        if (nav && nav.setSelectedKey) {
          nav.setSelectedKey(event.getParameter("name"));
        }
      }, this);
    }
  });
});
