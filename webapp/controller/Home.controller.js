sap.ui.define([
  "./BaseController",
  "sap/ui/model/json/JSONModel",
  "sap/m/library"
], function (BaseController, JSONModel, mobileLibrary) {
  "use strict";

  return BaseController.extend("workshop.dashboard.controller.Home", {
    onInit: function () {
      const model = new JSONModel({
        tables: [],
        steps: [
          { time: "0-5 min", icon: "sap-icon://open-folder", title: "Understand the mystery", text: "Read the story and the three suspects. Open your app in a second tab (\"Open my app\")." },
          { time: "5-20 min", icon: "sap-icon://simulate", title: "Investigate", text: "Query Playground: test each suspect against the data with SQL. Find the one the data supports." },
          { time: "20-25 min", icon: "sap-icon://draw-rectangle", title: "Decide the story", text: "On paper: the finding (one sentence), the key number, the chart that proves it, the next move." },
          { time: "25-40 min", icon: "sap-icon://grid", title: "Build page 1", text: "Copy your queries into data.js and the XML into Page1.view.xml. Add blocks from the Gallery. Stretch: more pages, your own shell." },
          { time: "40-45 min", icon: "sap-icon://wrench", title: "Test and refine", text: "Press F5, fix what's broken, make the finding the first thing you read." },
          { time: "2 min", icon: "sap-icon://microphone", title: "Pitch", text: "Show the president your dashboard: what did you discover, what proves it, what should the club do next semester?" }
        ],
        rubric: [
          { criterion: "Insight", points: 30, question: "Did you find the real cause, not the president's opinion? Is it backed by a number?" },
          { criterion: "Evidence", points: 25, question: "Do the charts prove the point? Right chart for the data, honest scale, units and labels." },
          { criterion: "Clarity", points: 20, question: "3-second test: finding first, evidence second, action last. Would the president get it without you?" },
          { criterion: "Fiori craft", points: 15, question: "Semantic colours (Good/Critical/Error), consistent cards, still works on a narrow screen." },
          { criterion: "Ambition", points: 10, question: "A second chart, other clubs, the promotion data, extra pages, filters or drill-down that help the story." }
        ]
      });
      this.getView().setModel(model, "home");
      this.getOwnerComponent().dataReady.then(function (data) {
        model.setProperty("/tables", data.schema.tables.map(function (t) { return { name: t.name }; }));
      });
    },

    onRevealHint: function (event) {
      const context = event.getSource().getBindingContext("app");
      context.getModel().setProperty(context.getPath() + "/shown", true);
    },

    onOpenTable: function (event) {
      this.getOwnerComponent().getModel("app").setProperty("/playgroundCode", "SELECT *\nFROM " + event.getSource().getText() + "\nLIMIT 20");
      this.navTo("playground");
    },

    onGoPlayground: function () { this.navTo("playground"); },

    onOpenApp: function () {
      mobileLibrary.URLHelper.redirect("workspace/index.html", true);
    }
  });
});
