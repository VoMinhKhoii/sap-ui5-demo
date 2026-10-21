sap.ui.define([
  "sap/ui/core/UIComponent",
  "sap/ui/model/json/JSONModel",
  "./util/db"
], function (UIComponent, JSONModel, db) {
  "use strict";

  return UIComponent.extend("workshop.dashboard.Component", {
    metadata: {
      manifest: "json",
      interfaces: ["sap.ui.core.IAsyncContentCreation"]
    },

    init: function () {
      UIComponent.prototype.init.apply(this, arguments);

      // "app" model: the case (brief, hypotheses, hints) and the busy flag.
      this.setModel(new JSONModel({ case: null, busy: true }), "app");

      // Default (unnamed) model: the gallery sample data { meta, kpis, trend, breakdown, items, alerts, clubList }
      // -> bind with {/kpis}, {/trend}, ... It's the same data the gallery blocks show in the students' app.
      const dataModel = new JSONModel(db.emptySample());
      dataModel.setSizeLimit(5000); // lists show up to 100 rows by default
      this.setModel(dataModel);

      // this.sql("SELECT …") once the database is open (Playground).
      this.dataReady = db.load().then(function (data) {
        this.sql = data.sql;
        this.schema = data.schema;
        dataModel.setData(Object.assign({}, data.sample, { case: data.case }));
        this.getModel("app").setData({ case: JSON.parse(JSON.stringify(data.case)), busy: false });
        return data;
      }.bind(this));

      this.getRouter().initialize();
    }
  });
});
