sap.ui.define([
  "./BaseController",
  "sap/m/library"
], function (BaseController, mobileLibrary) {
  "use strict";

  const FIGMA_URL = "https://www.figma.com/design/yHeQmZKANdrcu7jOWv17FN/SAP-S-4HANA-Web-UI-Kit--Community-";

  return BaseController.extend("workshop.dashboard.controller.App", {
    onInit: function () {
      // The path follows the page that is open: each step is a route, except "My app" (a new tab).
      this.getRouter().attachRouteMatched(function (event) {
        this.byId("path").setSelectedKey(event.getParameter("name"));
      }, this);
    },

    onPathSelect: function (event) {
      const key = event.getParameter("key");
      if (key === "app") {
        mobileLibrary.URLHelper.redirect("workspace/index.html", true);
        // Opening the app doesn't leave the kit: keep the current step selected.
        const current = this.getRouter().getHashChanger().getHash().split("/")[0] || "home";
        this.byId("path").setSelectedKey(current);
        return;
      }
      this.navTo(key);
    },

    onHome: function () {
      this.navTo("home");
    },

    onOpenFigma: function () {
      mobileLibrary.URLHelper.redirect(FIGMA_URL, true);
    },

    onOpenDocs: function () {
      mobileLibrary.URLHelper.redirect("https://ui5.sap.com/#/controls", true);
    }
  });
});
