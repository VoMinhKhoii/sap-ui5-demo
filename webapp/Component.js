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

      // "app" model: the case (brief, hypotheses, hints), the busy flag and the SAP logo for the ShellBar.
      const logo = sap.ui.require.toUrl("sap/ui/core/mimes/logo/sap_50x26.png");
      this.setModel(new JSONModel({ case: null, busy: true, logo: logo }), "app");

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
        this.getModel("app").setData({ case: JSON.parse(JSON.stringify(data.case)), busy: false, logo: logo });
        return data;
      }.bind(this));

      this.getRouter().initialize();
    }
  });
});
