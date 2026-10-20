sap.ui.define([
  "./BaseController",
  "sap/ui/model/json/JSONModel",
  "sap/ui/core/Fragment",
  "../util/snippet"
], function (BaseController, JSONModel, Fragment, snippet) {
  "use strict";

  const TABLES = "1. Tables (query them with SQL)";
  const SAMPLE = "2. Gallery sample data (bind it directly)";
  const SAMPLE_INFO = {
    meta: "Titles and labels used by the gallery blocks",
    kpis: "4 headline numbers: value, unit, target, state, history[6]",
    trend: "10 weeks: month (Wk 1 … Wk 10), actual, plan, previousYear",
    breakdown: "One row per club: name, value, target, share, state",
    items: "One record per club: title, subtitle, owner, date, amount, progress, status, state",
    alerts: "4 messages: type, title, description, date",
    clubList: "The clubs with their events inside (for the List → detail layout)"
  };

  return BaseController.extend("workshop.dashboard.controller.ApiExplorer", {
    onInit: function () {
      this._model = new JSONModel({ endpoints: [], key: "t:events", title: "", usage: "", response: "", isTable: true, table: {}, relationsText: "" });
      this.getView().setModel(this._model, "explorer");

      this._ready = this.getOwnerComponent().dataReady.then(function (data) {
        this._data = data;
        const tables = data.schema.tables.map(function (t) {
          return { key: "t:" + t.name, group: TABLES, title: t.name, description: t.title, info: t.count + " rows" };
        });
        const sample = Object.keys(SAMPLE_INFO).map(function (name) {
          return { key: "s:" + name, group: SAMPLE, title: "/" + name, description: SAMPLE_INFO[name], info: "" };
        });
        this._model.setProperty("/endpoints", tables.concat(sample));
      }.bind(this));

      this.getRouter().getRoute("api").attachPatternMatched(function () {
        const appModel = this.getOwnerComponent().getModel("app");
        const requested = appModel.getProperty("/explorerTable");
        appModel.setProperty("/explorerTable", "");
        this._ready.then(function () {
          this._select(requested ? "t:" + requested : this._model.getProperty("/key"));
        }.bind(this));
      }, this);
    },

    onEndpointSelect: function (event) {
      this._select(event.getParameter("listItem").getBindingContext("explorer").getProperty("key"));
    },

    onTryInPlayground: function () {
      const name = this._model.getProperty("/table/name");
      this.getOwnerComponent().getModel("app").setProperty("/playgroundCode", "SELECT *\nFROM " + name + "\nLIMIT 20");
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
      const name = key.slice(2);

      if (key.indexOf("t:") === 0) {
        const table = this._data.schema.tables.find(function (t) { return t.name === name; });
        if (!table) {
          return;
        }
        table.fields.forEach(function (f) {
          f.exampleText = f.example === null ? "NULL" : typeof f.example === "string" ? "'" + f.example + "'" : String(f.example);
        });
        const links = this._data.schema.relations.filter(function (r) { return r.from === name || r.to === name; }).map(function (r) {
          return r.from + "." + r.field + " → " + r.to + "." + r.key + (r.note ? " (" + r.note + ")" : "");
        });
        this._model.setData(Object.assign(this._model.getData(), {
          isTable: true, table: table, title: table.name + ": " + table.title,
          usage: "SELECT … FROM " + name,
          relationsText: links.length ? "Links to other tables (use them in a JOIN): " + links.join(" · ") : ""
        }));
        this._model.refresh(true);
        this._showRows(name);
        return;
      }
      this._model.setProperty("/isTable", false);
      this._model.setProperty("/title", "Sample data /" + name);
      this._model.setProperty("/usage", name === "meta" ? "Bind with {/meta/title}" : "Bind with {/" + name + "}");
      this._model.setProperty("/response", JSON.stringify(this._data.sample[name], null, 2));
    },

    /** The first rows of a table, rendered with the same table XML the Playground generates. */
    _showRows: function (name) {
      const rows = this._data.sql("SELECT * FROM " + name + " LIMIT 5");
      const box = this.byId("rowsPreview");
      box.destroyItems();
      Fragment.load({ definition: snippet.fragment(snippet.build("rows", rows, "table")), controller: this }).then(function (control) {
        control.setModel(new JSONModel({ rows: rows }));
        box.addItem(control);
      });
    }
  });
});
