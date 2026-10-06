sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/m/MessageToast",
  "sap/viz/ui5/controls/VizFrame",
  "../util/formatter"
], function (Controller, MessageToast, VizFrame, formatter) {
  "use strict";

  /**
   * Shared logic for every page. All gallery snippets call handlers and
   * formatters defined here, so anything you paste into Dashboard.view.xml just works.
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

    _objectOf: function (event) {
      const source = event.getParameter && event.getParameter("listItem") || event.getSource();
      const context = source && source.getBindingContext();
      return context ? context.getObject() : null;
    }
  });
});
