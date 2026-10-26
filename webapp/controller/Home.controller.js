sap.ui.define([
  "./BaseController",
  "sap/ui/model/json/JSONModel"
], function (BaseController, JSONModel) {
  "use strict";

  return BaseController.extend("workshop.dashboard.controller.Home", {
    onInit: function () {
      const model = new JSONModel({
        rubric: [
          { criterion: "Insight", points: 30, question: "Did you find the real cause, not the president's opinion? Is it backed by a number?" },
          { criterion: "Evidence", points: 25, question: "Do the charts prove the point? Right chart for the data, honest scale, units and labels." },
          { criterion: "Clarity", points: 20, question: "3-second test: finding first, evidence second, action last. Would the president get it without you?" },
          { criterion: "Fiori craft", points: 15, question: "Semantic colours (Good/Critical/Error), consistent cards, still works on a narrow screen." },
          { criterion: "Ambition", points: 10, question: "A second chart, other clubs, the promotion data, extra pages, filters or drill-down that help the story." }
        ]
      });
      this.getView().setModel(model, "home");
      this.styleCharts(this.getView());
    },

    onGoPlayground: function () { this.navTo("playground"); }
  });
});
