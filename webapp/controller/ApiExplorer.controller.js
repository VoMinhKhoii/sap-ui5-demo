sap.ui.define([
  "./BaseController",
  "sap/ui/model/json/JSONModel",
  "../util/api"
], function (BaseController, JSONModel, api) {
  "use strict";

  const LEVEL1 = "3. Ready-made summaries (level 1)";
  const AREA_GROUP = { "Master data": "2. ERP tables: master data", Sales: "1. ERP tables: sales", "Supply chain": "1. ERP tables: supply chain", Sustainability: "1. ERP tables: sustainability" };

  return BaseController.extend("workshop.dashboard.controller.ApiExplorer", {
    onInit: function () {
      this._model = new JSONModel({ endpoints: [], key: "erp:A_SalesOrder", url: "", usage: "", response: "", isErp: true, entity: {}, relationsText: "" });
      this.getView().setModel(this._model, "explorer");

      this._ready = Promise.all([api.loadIndex(), api.loadErp()]).then(function (results) {
        const level1 = results[0].endpoints.map(function (ep) {
          const name = ep.path.match(/\/(\w+)\.json$/)[1];
          return { key: "l1:" + name, group: LEVEL1, title: name, description: ep.description, info: ep.returns };
        });
        this._erp = results[1];
        const erp = this._erp.index.entities.map(function (e) {
          return { key: "erp:" + e.name, group: AREA_GROUP[e.area], title: e.name, description: e.title + ". " + e.description, info: e.count + " rows" };
        });
        this._model.setProperty("/endpoints", level1.concat(erp));
        const first = erp.find(function (e) { return e.group.indexOf("1.") === 0; }) || erp[0];
        this._model.setProperty("/key", first ? first.key : level1[0].key);
      }.bind(this));

      this.getRouter().getRoute("api").attachPatternMatched(function () {
        const appModel = this.getOwnerComponent().getModel("app");
        const requested = appModel.getProperty("/explorerEntity");
        appModel.setProperty("/explorerEntity", "");
        this._ready.then(function () {
          this._select(requested ? "erp:" + requested : this._model.getProperty("/key"));
        }.bind(this));
      }, this);

      // Level-1 data depends on the scenario selected in the header.
      this.getOwnerComponent().getModel("app").bindProperty("/scenario").attachChange(function () {
        if (!this._model.getProperty("/isErp")) {
          this._ready.then(this._select.bind(this, this._model.getProperty("/key")));
        }
      }, this);
    },

    onEndpointSelect: function (event) {
      this._select(event.getParameter("listItem").getBindingContext("explorer").getProperty("key"));
    },

    onTryInPlayground: function () {
      const name = this._model.getProperty("/entity/name");
      this.getOwnerComponent().getModel("app").setProperty("/playgroundCode", "q(\"" + name + "\")\n  .top(20)");
      this.navTo("playground");
    },

    _select: function (key) {
      const list = this.byId("endpointList");
      list.getItems().forEach(function (item) {
        const context = item.getBindingContext("explorer");
        if (context && context.getProperty("key") === key) {
          list.setSelectedItem(item);
        }
      });
      this._model.setProperty("/key", key);
      const name = key.split(":")[1];

      if (key.indexOf("erp:") === 0) {
        const entity = this._erp.index.entities.find(function (e) { return e.name === name; });
        const rows = this._erp.db[name];
        entity.fields.forEach(function (f) {
          f.exampleText = f.example === null ? "null" : typeof f.example === "string" ? "\"" + f.example + "\"" : String(f.example);
        });
        const links = this._erp.index.relations.filter(function (r) { return r.from === name || r.to === name; }).map(function (r) {
          return r.from + "." + r.field + " → " + r.to + "." + r.key;
        });
        this._model.setData(Object.assign(this._model.getData(), {
          isErp: true, entity: entity, url: api.erpUrl(name),
          usage: "Query with: q(\"" + name + "\")",
          relationsText: links.length ? "Links (q().join finds these keys for you): " + links.join(" · ") : "",
          response: JSON.stringify({ "@odata.context": "$metadata#" + name, value: rows.slice(0, 3), "…": (rows.length - 3) + " more rows" }, null, 2)
        }));
        this._model.refresh(true);
        return;
      }
      const scenario = this.getOwnerComponent().getModel("app").getProperty("/scenario");
      this._model.setProperty("/isErp", false);
      this._model.setProperty("/url", api.url(scenario, name));
      this._model.setProperty("/usage", "Bind with: " + (name === "meta" ? "{/meta/title}" : "{/" + name + "}"));
      api.get(scenario, name).then(function (json) {
        this._model.setProperty("/response", JSON.stringify(json, null, 2));
      }.bind(this));
    }
  });
});
