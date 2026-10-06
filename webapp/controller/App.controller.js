sap.ui.define([
  "./BaseController",
  "sap/m/library",
  "sap/ui/Device"
], function (BaseController, mobileLibrary, Device) {
  "use strict";

  const FIGMA_URL = "https://www.figma.com/design/yHeQmZKANdrcu7jOWv17FN/SAP-S-4HANA-Web-UI-Kit--Community-";

  return BaseController.extend("workshop.dashboard.controller.App", {
    onInit: function () {
      if (Device.system.phone) {
        this.byId("toolPage").setSideExpanded(false);
      }
      this.getRouter().attachRouteMatched(function (event) {
        const sideNav = this.byId("sideNav");
        const items = sideNav.getItem().getItems().concat(sideNav.getFixedItem().getItems());
        const current = items.find(function (item) { return item.getKey() === event.getParameter("name"); });
        if (current) {
          sideNav.setSelectedItem(current);
        }
      }, this);
    },

    onNavSelect: function (event) {
      this.navTo(event.getParameter("item").getKey());
    },

    onToggleSideNav: function () {
      const toolPage = this.byId("toolPage");
      toolPage.setSideExpanded(!toolPage.getSideExpanded());
    },

    onScenarioChange: function (event) {
      this.getOwnerComponent().loadScenario(event.getParameter("selectedItem").getKey());
    },

    onOpenFigma: function () {
      mobileLibrary.URLHelper.redirect(FIGMA_URL, true);
    },

    onOpenDocs: function () {
      mobileLibrary.URLHelper.redirect("https://ui5.sap.com/#/controls", true);
    }
  });
});
