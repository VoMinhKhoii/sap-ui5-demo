sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/m/MessageToast",
  "sap/viz/ui5/controls/VizFrame",
  "../util/formatter"
], function (Controller, MessageToast, VizFrame, formatter) {
  "use strict";

  /**
   * Shared logic for every page. All gallery snippets call handlers and
   * formatters defined here, so anything you paste into a workspace page just works. The workspace app (webapp/workspace/) extends it too.
   */
  return Controller.extend("workshop.dashboard.controller.BaseController", {
    formatter: formatter,

    getRouter: function () {
      return this.getOwnerComponent().getRouter();
    },

    navTo: function (route, params) {
      this.getRouter().navTo(route, params || {});
    },

    // ---- Event handlers used by the gallery snippets ------------------------

    /** Press on a KPI card / tile. */
    onKpiPress: function (event) {
      const kpi = this._objectOf(event);
      MessageToast.show(kpi ? kpi.title + ": " + kpi.value + " " + kpi.unit + " (target " + kpi.target + ")" : "KPI pressed");
    },

    /** Press on a table row / list item. */
    onItemPress: function (event) {
      const item = this._objectOf(event);
      MessageToast.show(item ? item.title + " · " + item.status : "Item pressed");
    },

    /** Press on any button. */
    onActionPress: function (event) {
      MessageToast.show("You pressed: " + (event.getSource().getText ? event.getSource().getText() : "button"));
    },

    /** Selection in a chart (click a bar/point). */
    onChartSelect: function (event) {
      const data = event.getParameter("data") || [];
      if (data.length) {
        MessageToast.show(JSON.stringify(data[0].data));
      }
    },

    /** Generic filter: filters the "items" table/list with id "itemsTable" by status text. */
    onStatusFilter: function (event) {
      const key = event.getParameter("item") ? event.getParameter("item").getKey() : event.getSource().getSelectedKey();
      MessageToast.show("Filter: " + key);
    },

    // ---- Handlers used by the app shells and page layouts -------------------

    /** Side navigation item or tab selected: opens the page whose route name is the item's key (page1, page2 ...). */
    onNavSelect: function (event) {
      const item = event.getParameter("item");
      const key = item && item.getKey ? item.getKey() : event.getParameter("key");
      if (this.getRouter().getRoute(key)) {
        this.navTo(key);
      } else {
        MessageToast.show("In your app this opens " + key);
      }
    },

    /** Menu button in a ToolPage header: shows or hides the side navigation. */
    onToggleSideNav: function (event) {
      const toolPage = this._ancestor(event.getSource(), "sap.tnt.ToolPage");
      if (toolPage) {
        toolPage.setSideExpanded(!toolPage.getSideExpanded());
      }
    },

    /** List → detail: shows the selected row in the detail column of the surrounding FlexibleColumnLayout. */
    onShowDetail: function (event) {
      const item = event.getParameter("listItem") || event.getSource();
      const layout = this._ancestor(item, "sap.f.FlexibleColumnLayout");
      if (layout) {
        layout.getMidColumnPages()[0].setBindingContext(item.getBindingContext());
        layout.setLayout("TwoColumnsMidExpanded");
      }
    },

    /** List → detail: closes the detail column. */
    onCloseDetail: function (event) {
      const layout = this._ancestor(event.getSource(), "sap.f.FlexibleColumnLayout");
      if (layout) {
        layout.setLayout("OneColumn");
      }
    },

    /** Copies text to the clipboard and shows a toast. Works on http://localhost too. */
    copyText: function (text, message) {
      const done = function () {
        MessageToast.show(message || "Copied!");
      };
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(text).then(done);
        return;
      }
      const area = document.createElement("textarea");
      area.value = text;
      document.body.appendChild(area);
      area.select();
      document.execCommand("copy");
      document.body.removeChild(area);
      done();
    },

    // ---- Chart styling ------------------------------------------------------

    /**
     * Applies clean Fiori defaults to every VizFrame inside a control
     * (no chart title, data labels on). Called automatically by the pages.
     */
    styleCharts: function (root) {
      if (!root) {
        return;
      }
      const charts = root instanceof VizFrame ? [root] : root.findAggregatedObjects(true, function (control) {
        return control instanceof VizFrame;
      });
      charts.forEach(function (chart) {
        if (chart.data("styled")) {
          return;
        }
        chart.data("styled", true);
        const type = chart.getVizType();
        // Data labels only where they stay readable; trend charts get an axis that does not start at 0.
        const isTrend = /line|combination|column/.test(type);
        const isPie = /pie|donut/.test(type);
        chart.setVizProperties(Object.assign({
          title: { visible: false },
          legend: { visible: true },
          legendGroup: { layout: { position: "bottom" } },
          plotArea: {
            dataLabel: { visible: !isTrend, type: isPie ? "percentage" : "value" },
            adjustScale: /line|combination/.test(type),
            window: { start: "firstDataPoint", end: "lastDataPoint" }
          },
          valueAxis: { title: { visible: false } },
          categoryAxis: { title: { visible: false } },
          interaction: { selectability: { mode: "SINGLE" } }
        }, chart.data("vizProperties") || {}));
      });
    },

    _ancestor: function (control, type) {
      while (control && !(control.isA && control.isA(type))) {
        control = control.getParent();
      }
      return control;
    },

    _objectOf: function (event) {
      const source = event.getParameter && event.getParameter("listItem") || event.getSource();
      const context = source && source.getBindingContext();
      return context ? context.getObject() : null;
    }
  });
});
