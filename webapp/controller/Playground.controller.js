sap.ui.define([
  "./BaseController",
  "sap/ui/model/json/JSONModel",
  "sap/ui/core/Fragment",
  "sap/m/Popover",
  "sap/m/List",
  "sap/m/StandardListItem",
  "../util/examples",
  "../util/snippet",
  "../util/sql"
], function (BaseController, JSONModel, Fragment, Popover, List, StandardListItem, examples, snippet, SqlHelper) {
  "use strict";

  const VIEW_TEXT = { line: "Line", column: "Column", bar: "Bar", donut: "Donut", table: "Table", number: "Big numbers", record: "Record" };
  const HELP = [
    ["SELECT club_id, AVG(avg_rating) AS rating", "the columns you want; AS gives a result its name"],
    ["FROM events", "the table (see Your data at the top)"],
    ["WHERE topic = 'Talk'", "keep some rows; text in single quotes"],
    ["  AND week >= 5", "more conditions: AND, OR, <>, >=, IN ('Talk', 'Social')"],
    ["GROUP BY club_id", "one row per value, for COUNT(*), SUM(), AVG()"],
    ["ROUND(AVG(avg_rating), 1)", "round to 1 decimal (ROUND(x) for none)"],
    ["ORDER BY rating DESC LIMIT 5", "sort, then keep the first 5"],
    ["JOIN clubs c ON c.club_id = e.club_id", "add the columns of a linked table"],
    ["CASE WHEN week <= 5 THEN 'early' ELSE 'late' END", "make your own groups"]
  ];
  const KEYWORDS = ["SELECT", "FROM", "WHERE", "AND", "OR", "NOT", "IN", "GROUP BY", "ORDER BY", "DESC", "LIMIT", "AS", "JOIN", "ON",
    "COUNT(*)", "SUM", "AVG", "MIN", "MAX", "ROUND", "CASE", "WHEN", "THEN", "ELSE", "END", "DISTINCT", "HAVING"];
  let completerAdded = false;

  return BaseController.extend("workshop.dashboard.controller.Playground", {
    onInit: function () {
      this._renderToken = 0;
      this._model = new JSONModel({
        examples: examples, exampleId: "", code: "", name: "", nameValid: true, showCode: false,
        table: "",
        error: "", warning: "", status: "Loading the data…", summary: "Run a query to see the result", one: false, views: [], view: "", dataJs: "", xml: ""
      });
      this.getView().setModel(this._model, "pg");
      this.getRouter().getRoute("playground").attachPatternMatched(this._onShow, this);
      this.byId("editor").addEventDelegate({ onAfterRendering: this._setUpEditor.bind(this) });

      this._ready = this.getOwnerComponent().dataReady.then(function (data) {
        this._schema = data.schema;
        this.byId("erd").setContent(this._erdHtml());
        this.onErdRendered(); // if the page is already on screen, setContent swaps the DOM without a new afterRendering
        if (!this._model.getProperty("/code")) {
          this._useExample(examples[0]);
        }
      }.bind(this));
    },

    _onShow: function () {
      const appModel = this.getOwnerComponent().getModel("app");
      const code = appModel.getProperty("/playgroundCode");
      this._ready.then(function () {
        if (code) {
          appModel.setProperty("/playgroundCode", "");
          this._model.setProperty("/exampleId", "");
          this._setCode(code);
          this._model.setProperty("/name", "myQuery");
        }
        this.onRun();
      }.bind(this));
    },

    // ---- Editor: Ctrl+Enter runs, suggestions for tables, columns and SQL words

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
      if (!this._schema) {
        callback(null, []);
        return;
      }
      const items = [];
      this._schema.tables.forEach(function (t) {
        items.push({ caption: t.name, value: t.name, meta: "table", score: 300 });
        t.fields.forEach(function (f) {
          items.push({ caption: f.name, value: f.name, meta: t.name, score: 200 });
        });
      });
      KEYWORDS.forEach(function (k) { items.push({ caption: k, value: k, meta: "SQL", score: 100 }); });
      callback(null, items);
    },

    // ---- Your data: the tables as a diagram (ERD). Click a column to insert it, a table name to query it.

    _erdHtml: function () {
      const esc = function (text) {
        return String(text).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
      };
      const keys = {};
      this._schema.relations.forEach(function (r) {
        if (!r.note) {
          keys[r.from + "." + r.field] = "FK";
        }
      });
      const card = function (t) {
        const fields = t.fields.map(function (f) {
          const badge = f.name === t.key ? "PK" : keys[t.name + "." + f.name] || "";
          const tip = f.description + (f.example !== null && f.example !== "" ? " (e.g. " + f.example + ")" : "");
          return "<div class=\"wsErdField\" data-table=\"" + t.name + "\" data-field=\"" + f.name + "\" title=\"" + esc(tip) + "\">" +
            "<span>" + (badge ? "<b class=\"wsErdKey wsErd" + badge + "\">" + badge + "</b>" : "") +
            "<span class=\"" + (/_pct$/.test(f.name) ? "wsErdCalc" : "") + "\">" + f.name + "</span></span><i>" + f.type + "</i></div>";
        }).join("");
        return "<div class=\"wsErdTable\" data-table=\"" + t.name + "\">" +
          "<div class=\"wsErdHead\" data-query=\"" + t.name + "\" title=\"" + esc(t.description) + " Click to see the rows.\">" +
          "<b>" + t.name + "</b><span>" + t.count + " rows</span></div>" + fields + "</div>";
      };
      const table = function (name) {
        return card(this._schema.tables.find(function (t) { return t.name === name; }));
      }.bind(this);
      return "<div class=\"wsErd\">" +
        "<div class=\"wsErdGrid\">" +
        "<div class=\"wsErdCol\">" + table("clubs") + "</div>" +
        "<div class=\"wsErdCol\">" + table("events") + "</div>" +
        "<div class=\"wsErdCol\">" + table("promotion_posts") + table("room_bookings") + "</div>" +
        "<svg class=\"wsErdLines\"></svg></div>" +
        "<div class=\"wsErdInfo\">Point at a column to see what it means. " +
        "<span class=\"wsErdLegend\">PK = key · FK = links to another table (solid line, use it in a JOIN) · dashed = same room code · " +
        "<span class=\"wsErdCalc\">_pct</span> = already worked out for you</span></div></div>";
    },

    onErdRendered: function () {
      const root = this.byId("erd").getDomRef();
      if (!root || !root.classList.contains("wsErd") || root.dataset.wired) {
        return;
      }
      root.dataset.wired = "true";
      const info = root.querySelector(".wsErdInfo");
      const infoText = info.innerHTML;
      root.addEventListener("click", function (event) {
        const field = event.target.closest(".wsErdField");
        const head = event.target.closest(".wsErdHead");
        if (field) {
          const ace = this.byId("editor").getAceEditor();
          const cursor = ace.getCursorPosition();
          if (cursor.row === 0 && cursor.column === 0) {
            ace.navigateFileEnd(); // nobody has clicked into the query yet: add to the end, not before SELECT
          }
          const before = ace.session.getLine(ace.getCursorPosition().row).slice(0, ace.getCursorPosition().column);
          ace.insert((/[\w)]$/.test(before) ? " " : "") + field.dataset.field);
          ace.focus();
        } else if (head) {
          this._queryTable(head.dataset.query);
        }
      }.bind(this));
      root.addEventListener("mouseover", function (event) {
        const field = event.target.closest(".wsErdField");
        if (field) {
          info.textContent = field.dataset.table + "." + field.dataset.field + ": " + field.title;
        } else {
          info.innerHTML = infoText;
        }
      });
      // Redraw the lines whenever the diagram changes size (window resize, panel opened again).
      new ResizeObserver(this._drawErdLines.bind(this, root)).observe(root);
      this._highlightTable(this._model.getProperty("/table"));
    },

    _drawErdLines: function (root) {
      const svg = root.querySelector(".wsErdLines");
      const box = svg.parentNode.getBoundingClientRect();
      const ns = "http://www.w3.org/2000/svg";
      svg.innerHTML = "";
      const row = function (table, field) {
        return root.querySelector(".wsErdField[data-table='" + table + "'][data-field='" + field + "']");
      };
      this._schema.relations.forEach(function (r) {
        const from = row(r.from, r.field), to = row(r.to, r.key);
        if (!from || !to) {
          return;
        }
        const a = from.getBoundingClientRect(), b = to.getBoundingClientRect();
        if (!a.width || !b.width || Math.abs(a.left - b.left) < 10) {
          return; // hidden, or stacked in one column on a narrow screen
        }
        const right = a.left > b.left; // the "many" side is to the right of the "one" side
        const x1 = (right ? a.left : a.right) - box.left, y1 = a.top + a.height / 2 - box.top;
        const x2 = (right ? b.right : b.left) - box.left, y2 = b.top + b.height / 2 - box.top;
        const mid = (x1 + x2) / 2, d = right ? -1 : 1;
        const path = document.createElementNS(ns, "path");
        path.setAttribute("d", "M" + x1 + "," + y1 + " C" + mid + "," + y1 + " " + mid + "," + y2 + " " + x2 + "," + y2 +
          (r.note ? "" : " M" + (x1 + d * 10) + "," + y1 + " L" + x1 + "," + (y1 - 5) + " M" + (x1 + d * 10) + "," + y1 + " L" + x1 + "," + (y1 + 5) +
            " M" + (x2 - d * 6) + "," + (y2 - 5) + " L" + (x2 - d * 6) + "," + (y2 + 5)));
        path.setAttribute("class", r.note ? "wsErdLink wsErdLinkSoft" : "wsErdLink");
        svg.appendChild(path);
      });
    },

    /** Marks the table the query reads FROM. */
    _highlightTable: function (name) {
      this._model.setProperty("/table", name);
      const root = this.byId("erd").getDomRef();
      if (root) {
        root.querySelectorAll(".wsErdTable").forEach(function (el) {
          el.classList.toggle("wsErdActive", el.dataset.table === name);
        });
      }
    },

    _queryTable: function (name) {
      this._setCode("SELECT *\nFROM " + name + "\nLIMIT 20");
      this._model.setProperty("/exampleId", "");
      this._model.setProperty("/name", "myQuery");
      this._model.setProperty("/nameValid", true);
      this.onRun();
    },

    onShowHelp: function (event) {
      if (!this._help) {
        this._help = new Popover({
          title: "SQL in 9 lines",
          placement: "Bottom",
          contentWidth: "34rem",
          content: new List({
            items: HELP.map(function (h) {
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
      this._useExample(examples.find(function (ex) { return ex.id === id; }));
      this.onRun();
    },

    _useExample: function (example) {
      this._model.setProperty("/exampleId", example.id);
      this._setCode(example.code);
      this._model.setProperty("/name", example.id);
      this._model.setProperty("/nameValid", true);
    },

    _setCode: function (code) {
      this._model.setProperty("/code", code);
      // Write to the editor directly: the model binding reaches the editor too late, and Run reads the editor.
      const ace = this.byId("editor").getAceEditor();
      if (ace) {
        ace.setValue(code, 1);
      }
    },

    _code: function () {
      const ace = this.byId("editor").getAceEditor();
      const code = ace ? ace.getValue() : this._model.getProperty("/code");
      this._model.setProperty("/code", code);
      return code;
    },

    onRun: function () {
      const sql = this.getOwnerComponent().sql;
      if (!sql) {
        return;
      }
      const code = this._code();
      const used = code.match(/\bFROM\s+(\w+)/i);
      if (used) {
        this._highlightTable(used[1]);
      }
      const started = Date.now();
      let rows;
      try {
        rows = sql(code);
      } catch (e) {
        this._model.setProperty("/error", e.message);
        this._model.setProperty("/status", "");
        return;
      }
      // One row → sql.one: the row itself, bound as {/name/column}. More rows → a list for charts and tables.
      const one = rows.length === 1;
      this._result = one ? rows[0] : rows;
      const shape = snippet.shape(this._result);
      const view = shape.views.indexOf(this._model.getProperty("/view")) > -1 ? this._model.getProperty("/view") : shape.views[0];
      const bad = SqlHelper.badColumns(this._result);
      this._model.setData(Object.assign(this._model.getData(), {
        error: "",
        warning: bad.length ? "Give " + bad.map(function (c) { return "\"" + c + "\""; }).join(", ") + " a name with AS, e.g. ROUND(AVG(fill_pct)) AS fill_pct. You can only bind columns with simple names." : "",
        status: "Done in " + (Date.now() - started) + " ms",
        one: one,
        views: shape.views.map(function (v) { return { key: v, text: VIEW_TEXT[v] }; }),
        view: view,
        summary: one ? "1 row: copy it as sql.one(…) and bind one value with {/" + this._name() + "/column}"
          : rows.length + " rows · columns: " + (rows.length ? Object.keys(rows[0]).join(", ") : "none") +
            (shape.kind === "chart" ? ". Chart: first column = label, number columns = bars" : "")
      }));
      this._render();
    },

    _name: function () {
      return this._model.getProperty("/nameValid") && this._model.getProperty("/name") ? this._model.getProperty("/name") : "myQuery";
    },

    onViewChange: function (event) {
      this._model.setProperty("/view", event.getParameter("item").getKey());
      this._render();
    },

    onNameChange: function (event) {
      this._model.setProperty("/nameValid", SqlHelper.NAME.test(event.getParameter("value")));
      this._render();
    },

    onToggleCode: function () {
      this._model.setProperty("/showCode", !this._model.getProperty("/showCode"));
    },

    _render: function () {
      if (this._result === undefined) {
        return;
      }
      const name = this._name();
      const xml = snippet.build(name, this._result, this._model.getProperty("/view"));
      this._model.setProperty("/xml", xml);
      this._model.setProperty("/dataJs", snippet.dataJs(name, this._model.getProperty("/code"), this._model.getProperty("/one")));

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
