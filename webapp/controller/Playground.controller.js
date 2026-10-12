sap.ui.define([
  "./BaseController",
  "sap/ui/model/json/JSONModel",
  "sap/ui/core/Fragment",
  "sap/m/Popover",
  "sap/m/List",
  "sap/m/StandardListItem",
  "../util/api",
  "../util/examples",
  "../util/snippet"
], function (BaseController, JSONModel, Fragment, Popover, List, StandardListItem, api, examples, snippet) {
  "use strict";

  const VIEW_TEXT = { line: "Line", column: "Column", bar: "Bar", bullet: "Bullet", donut: "Donut", table: "Table", number: "Number", object: "Record" };
  const NAME = /^[A-Za-z][A-Za-z0-9_]*$/;
  const HELP = [
    ["q(\"ZI_PlantEmissions\")", "start from a table (left)"],
    [".where(\"PlantName\", \"Brno\")", "keep rows; also (\"CO2eTonnes\", \">\", 400)"],
    [".groupBy(\"PlantName\")", "one row per value → name, value"],
    [".byMonth(\"YearMonth\")", "one row per month → month, value"],
    [".sum(\"CO2eTonnes\")", "or avg, min, max, count(), ratio(\"A\", \"B\")"],
    [".sum(\"BudgetCO2eTonnes\", \"target\")", "a second number, named"],
    [".withState(false)", "Good/Critical/Error vs. target"],
    [".sortBy(\"value\", \"desc\").top(5)", "sort and cut"],
    [".join(\"A_Plant\")", "add fields of a linked table"]
  ];
  const METHODS = ["where", "join", "include", "compute", "select", "groupBy", "byMonth", "sum", "avg", "min", "max", "count", "percent", "ratio", "merge", "withState", "sortBy", "top", "first"];
  let completerAdded = false;

  function indent(code) {
    return code.trim().split("\n").map(function (line, i) { return i ? "      " + line : line; }).join("\n");
  }

  return BaseController.extend("workshop.dashboard.controller.Playground", {
    onInit: function () {
      this._renderToken = 0;
      this._model = new JSONModel({
        examples: [], exampleId: "", code: "", name: "", nameValid: true, showCode: false,
        tables: [], table: "", tableInfo: "", fields: [],
        error: "", status: "Loading the data…", summary: "Run a query to see the result", views: [], view: "", dataJs: "", xml: ""
      });
      this.getView().setModel(this._model, "pg");
      this.getRouter().getRoute("playground").attachPatternMatched(this._onShow, this);
      this.byId("editor").addEventDelegate({ onAfterRendering: this._setUpEditor.bind(this) });

      this._ready = Promise.all([api.loadErp(), api.loadConfig()]).then(function (results) {
        const erp = results[0], enabled = results[1];
        this._erp = erp;
        const list = examples.filter(function (ex) { return ex.scenario === "all" || enabled.indexOf(ex.scenario) > -1; });
        this._model.setProperty("/examples", list);
        this._model.setProperty("/tables", erp.index.entities.map(function (e) {
          return { name: e.name, short: e.name.replace(/^(A_|ZI_)/, ""), title: e.title };
        }));
        this._selectTable(erp.index.entities[erp.index.entities.length - 1].name);
        if (!this._model.getProperty("/code")) {
          this._useExample(list[0]);
        }
      }.bind(this));
    },

    _onShow: function () {
      const appModel = this.getOwnerComponent().getModel("app");
      const code = appModel.getProperty("/playgroundCode");
      Promise.all([this._ready, this.getOwnerComponent().erpReady]).then(function () {
        if (code) {
          appModel.setProperty("/playgroundCode", "");
          this._model.setProperty("/exampleId", "");
          this._model.setProperty("/code", code);
          this._model.setProperty("/name", "myQuery");
        }
        this.onRun();
      }.bind(this));
    },

    // ---- Editor: Ctrl+Enter runs, suggestions for tables, fields and q() steps

    _setUpEditor: function () {
      const editor = this.byId("editor");
      const ace = editor.getAceEditor();
      if (ace && !this._shortcut) {
        this._shortcut = true;
        ace.commands.addCommand({
          name: "runQuery",
          bindKey: { win: "Ctrl-Enter", mac: "Command-Enter|Ctrl-Enter" },
          exec: this.onRun.bind(this)
        });
      }
      if (!completerAdded) {
        completerAdded = true;
        editor.addCustomCompleter({ getCompletions: this._completions.bind(this) });
      }
    },

    _completions: function (callback) {
      if (!this._erp) {
        callback(null, []);
        return;
      }
      const items = [];
      this._erp.index.entities.forEach(function (e) {
        items.push({ caption: e.name, value: e.name, meta: "table", score: 300 });
        e.fields.forEach(function (f) {
          items.push({ caption: f.name, value: f.name, meta: e.name.replace(/^(A_|ZI_)/, ""), score: 200 });
        });
      });
      METHODS.forEach(function (m) { items.push({ caption: m, value: m, meta: "q()", score: 100 }); });
      callback(null, items);
    },

    // ---- Left panel: tables and fields

    onTableSelect: function (event) {
      this._selectTable(event.getParameter("selectedItem").getKey());
    },

    _selectTable: function (name) {
      const entity = this._erp.index.entities.find(function (e) { return e.name === name; });
      if (!entity) {
        return;
      }
      this._model.setProperty("/table", name);
      this._model.setProperty("/tableInfo", entity.title + " · " + entity.count + " rows");
      this._model.setProperty("/fields", entity.fields.map(function (f) {
        return { name: f.name, type: f.type, description: f.description + (f.example !== null && f.example !== "" ? " (e.g. " + f.example + ")" : "") };
      }));
    },

    onFieldPress: function (event) {
      this._insert("\"" + event.getSource().getTitle() + "\"");
    },

    onInsertTable: function () {
      const ace = this.byId("editor").getAceEditor();
      ace.setValue("q(\"" + this._model.getProperty("/table") + "\")\n  .top(20)", 1);
      this._model.setProperty("/exampleId", "");
      this._model.setProperty("/name", "myQuery");
      this.onRun();
    },

    _insert: function (text) {
      const ace = this.byId("editor").getAceEditor();
      ace.insert(text);
      ace.focus();
    },

    onShowHelp: function (event) {
      if (!this._help) {
        this._help = new Popover({
          title: "q() in 9 lines",
          placement: "Bottom",
          contentWidth: "30rem",
          content: new List({
            items: HELP.map(function (h) {
              // set via setters: the texts contain quotes and would otherwise be fine, but stay consistent with the gallery
              return new StandardListItem().setTitle(h[0]).setDescription(h[1]);
            })
          })
        });
        this.getView().addDependent(this._help);
      }
      this._help.openBy(event.getSource());
    },

    // ---- Run and show the result

    onExampleSelect: function (event) {
      const id = event.getParameter("selectedItem").getKey();
      this._useExample(this._model.getProperty("/examples").find(function (ex) { return ex.id === id; }));
      this.onRun();
    },

    _useExample: function (example) {
      this._model.setProperty("/exampleId", example.id);
      this._model.setProperty("/code", example.code);
      // Write to the editor directly: the model binding reaches the editor too late, and Run reads the editor.
      const ace = this.byId("editor").getAceEditor();
      if (ace) {
        ace.setValue(example.code, 1);
      }
      this._model.setProperty("/name", example.id);
      this._model.setProperty("/nameValid", true);
    },

    _code: function () {
      const ace = this.byId("editor").getAceEditor();
      const code = ace ? ace.getValue() : this._model.getProperty("/code");
      this._model.setProperty("/code", code);
      return code;
    },

    onRun: function () {
      const q = this.getOwnerComponent().q;
      if (!q) {
        return;
      }
      const code = this._code();
      const used = code.match(/q\("(\w+)"\)/);
      if (used) {
        this._selectTable(used[1]);
      }
      const started = Date.now();
      let result;
      try {
        result = q.run(code);
      } catch (e) {
        this._model.setProperty("/error", e.message);
        this._model.setProperty("/status", "");
        return;
      }
      this._result = result;
      const shape = snippet.shape(result);
      const view = shape.views.indexOf(this._model.getProperty("/view")) > -1 ? this._model.getProperty("/view") : shape.views[0];
      const rows = Array.isArray(result) ? result.length : 0;
      this._model.setData(Object.assign(this._model.getData(), {
        error: "",
        status: "Done in " + (Date.now() - started) + " ms",
        views: shape.views.map(function (v) { return { key: v, text: VIEW_TEXT[v] }; }),
        view: view,
        summary: shape.kind === "scalar" ? "One number: " + result
          : shape.kind === "object" ? "One record with " + Object.keys(result || {}).length + " fields"
            : rows + " rows · " + (rows ? Object.keys(result[0]).join(", ") : "no fields")
      }));
      this._render();
    },

    onViewChange: function (event) {
      this._model.setProperty("/view", event.getParameter("item").getKey());
      this._render();
    },

    onNameChange: function (event) {
      this._model.setProperty("/nameValid", NAME.test(event.getParameter("value")));
      this._render();
    },

    onToggleCode: function () {
      this._model.setProperty("/showCode", !this._model.getProperty("/showCode"));
    },

    _render: function () {
      if (this._result === undefined) {
        return;
      }
      const name = this._model.getProperty("/nameValid") ? this._model.getProperty("/name") : "myQuery";
      const xml = snippet.build(name, this._result, this._model.getProperty("/view"));
      this._model.setProperty("/xml", xml);
      this._model.setProperty("/dataJs", "      " + name + ": " + indent(this._model.getProperty("/code")) + ",");

      const box = this.byId("preview");
      const token = ++this._renderToken;
      box.destroyItems();
      Fragment.load({ definition: snippet.fragment(xml), controller: this }).then(function (control) {
        if (token !== this._renderToken) {
          control.destroy();
          return;
        }
        const data = {};
        data[name] = this._result;
        const model = new JSONModel(data);
        model.setSizeLimit(5000);
        control.setModel(model);
        box.addItem(control);
        this.styleCharts(control);
      }.bind(this)).catch(function (error) {
        this._model.setProperty("/error", "Preview failed: " + error.message);
      }.bind(this));
    },

    onCopyDataJs: function () {
      this.copyText(this._model.getProperty("/dataJs"), "Copied! Paste it between the 🧩 markers in webapp/workspace/data.js");
    },

    onCopyXml: function () {
      this.copyText(this._model.getProperty("/xml"), "Copied! Paste it into a 🧩 slot of a page in webapp/workspace/view/");
    }
  });
});
