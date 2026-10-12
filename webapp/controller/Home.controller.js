sap.ui.define([
  "./BaseController",
  "sap/ui/model/json/JSONModel",
  "sap/m/MessageToast",
  "sap/m/library"
], function (BaseController, JSONModel, MessageToast, mobileLibrary) {
  "use strict";

  return BaseController.extend("workshop.dashboard.controller.Home", {
    onInit: function () {
      this.getView().setModel(new JSONModel({
        steps: [
          { time: "0-5 min", icon: "sap-icon://open-folder", title: "Read your case", text: "Pick a case above. Open your app in a second tab (\"Open my app\")." },
          { time: "5-20 min", icon: "sap-icon://simulate", title: "Investigate", text: "Query Playground: test the client's assumption against the data. Find the real cause." },
          { time: "20-25 min", icon: "sap-icon://draw-rectangle", title: "Decide the story", text: "On paper: the finding (one sentence), the evidence (1-2 charts), the action." },
          { time: "25-40 min", icon: "sap-icon://grid", title: "Build page 1", text: "Copy your queries into data.js and blocks from the Gallery into Page1.view.xml. Stretch: pages 2-3, your own shell." },
          { time: "40-45 min", icon: "sap-icon://microphone", title: "Pitch", text: "2 minutes: what did the client believe, what is true, what should they do?" }
        ],
        rubric: [
          { criterion: "Insight", points: 30, question: "Did you find the real cause, not the client's assumption? Is it backed by a number?" },
          { criterion: "Evidence", points: 25, question: "Do the charts prove the point? Right chart for the data, honest scale, units and labels." },
          { criterion: "Clarity", points: 20, question: "3-second test: finding first, evidence second, action last. Would the client get it without you?" },
          { criterion: "Fiori craft", points: 15, question: "Semantic colours (Good/Critical/Error), consistent cards, still works on a narrow screen." },
          { criterion: "Ambition", points: 10, question: "Extra pages, your own shell, list → detail, filters or drill-down that help the story." }
        ]
      }), "home");
    },

    onPickCase: function (event) {
      const id = event.getSource().getBindingContext("app").getProperty("id");
      this.getOwnerComponent().selectCase(id).then(function () {
        MessageToast.show("Case picked. If your app is already open, press F5 there.");
      });
    },

    onRevealHint: function (event) {
      const context = event.getSource().getBindingContext("app");
      context.getModel().setProperty(context.getPath() + "/shown", true);
    },

    onOpenEntity: function (event) {
      this.navTo("api", {});
      this.getOwnerComponent().getModel("app").setProperty("/explorerEntity", event.getSource().getText());
    },

    onGoPlayground: function () { this.navTo("playground"); },

    onOpenApp: function () {
      mobileLibrary.URLHelper.redirect("workspace/index.html", true);
    }
  });
});
