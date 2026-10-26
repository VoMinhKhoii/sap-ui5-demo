sap.ui.define([
  "./BaseController",
  "sap/ui/model/json/JSONModel",
  "sap/m/GroupHeaderListItem",
  "sap/m/StandardListItem",
  "sap/m/Text",
  "sap/m/Link",
  "sap/m/Label",
  "sap/m/Page",
  "sap/m/MessageStrip"
], function (BaseController, JSONModel, GroupHeaderListItem, StandardListItem, Text, Link, Label, Page, MessageStrip) {
  "use strict";

  const DOCS = "https://ui5.sap.com/#/api/";
  const SAMPLE_INFO = {
    meta: "Titles and labels used by the gallery blocks",
    kpis: "4 headline numbers: value, unit, target, state, history[6]",
    trend: "10 weeks: month (Wk 1 … Wk 10), actual, plan, previousYear",
    breakdown: "One row per club: name, value, target, share, state",
    items: "One record per club: title, subtitle, owner, date, amount, progress, status, state",
    alerts: "4 messages: type, title, description, date",
    clubList: "The clubs with their events inside (for the List → detail layout)"
  };
  // Which slot of workspace/view/Page1.view.xml a block is meant for: the suggested path through Page 1.
  const SLOT = { layout: "MORE", kpis: "KPIs", charts: "EVIDENCE A", micro: "EVIDENCE B", tables: "EVIDENCE B", status: "EVIDENCE B", filters: "MORE", templates: "MORE" };

  return BaseController.extend("workshop.dashboard.controller.Gallery", {
    onInit: function () {
      this._detail = new JSONModel({ title: "", description: "", code: "", codeHeight: "20rem", target: "" });
      this.getView().setModel(this._detail, "detail");
      this._token = 0;
      this._query = "";

      const catalog = new JSONModel(sap.ui.require.toUrl("workshop/dashboard/gallery/samples.json"));
      this._ready = catalog.dataLoaded().then(function () {
        // One flat list in catalog order, each block knowing its category.
        this._blocks = [];
        catalog.getProperty("/categories").forEach(function (category) {
          category.samples.forEach(function (sample) {
            this._blocks.push(Object.assign({ category: category }, sample));
          }, this);
        }, this);
        this._fillList();
      }.bind(this));

      this.getRouter().getRoute("gallery").attachPatternMatched(function (event) {
        const key = event.getParameter("arguments").category;
        this._ready.then(this._select.bind(this, key));
      }, this);
    },

    // ---- The list: blocks grouped by category, filtered by the search field

    _fillList: function () {
      const list = this.byId("blockList");
      const query = this._query.toLowerCase();
      list.destroyItems();
      let group = null;
      this._blocks.forEach(function (block) {
        if (query && (block.title + " " + block.description + " " + block.category.title).toLowerCase().indexOf(query) === -1) {
          return;
        }
        if (group !== block.category.key) {
          group = block.category.key;
          list.addItem(new GroupHeaderListItem({ title: block.category.title }));
        }
        // Texts via setters, so that "{...}" in a description is not parsed as data binding.
        const item = new StandardListItem({ type: "Active", wrapping: true }).setTitle(block.title).setDescription(block.description);
        item.data("id", block.id);
        list.addItem(item);
      });
      this._markSelected();
    },

    onSearch: function (event) {
      this._query = (event.getParameter("newValue") || "").trim();
      this._fillList();
    },

    onBlockSelect: function (event) {
      const item = event.getParameter("listItem");
      this.getRouter().navTo("gallery", { category: item.data("id") }, true);
    },

    _markSelected: function () {
      const list = this.byId("blockList");
      list.getItems().forEach(function (item) {
        if (item.data("id") === (this._block && this._block.id)) {
          list.setSelectedItem(item);
          // Opened from a link (e.g. gallery/charts): make sure the selected block is visible in the list.
          setTimeout(function () {
            const dom = item.getDomRef();
            if (dom) {
              dom.scrollIntoView({ block: "nearest" });
            }
          }, 0);
        }
      }, this);
    },

    // ---- The detail: the live block, its code and where to paste it

    /** key = a block id, or a category key (opens its first block), or nothing (the first block). */
    _select: function (key) {
      const block = this._blocks.find(function (b) { return b.id === key; }) ||
        this._blocks.find(function (b) { return b.category.key === key; }) || this._blocks[0];
      if (this._block === block) {
        return;
      }
      this._block = block;
      this._markSelected();
      this.byId("tabs").setSelectedKey("preview");

      const slot = block.id === "LayoutHeader" ? "FINDING" : SLOT[block.category.key];
      this._detail.setData({
        title: block.title,
        description: block.description,
        code: "",
        codeHeight: "20rem",
        target: block.target || "Paste it into the " + slot + " slot of webapp/workspace/view/Page1.view.xml, save, then press F5 in your app." +
          (block.data && block.data !== "-" ? " It shows the sample data " + block.data + "." : "")
      });

      const docs = this.byId("docs");
      docs.destroyItems();
      docs.addItem(new Label({ text: "Docs:" }).addStyleClass("sapUiTinyMarginEnd"));
      block.controls.forEach(function (name) {
        docs.addItem(new Link({ text: name.split(".").pop(), href: DOCS + name, target: "_blank" }).addStyleClass("sapUiSmallMarginEnd"));
      });

      const folder = block.template ? "workshop.dashboard.templates." : block.shell ? "workshop.dashboard.gallery.shells." : "workshop.dashboard.gallery.samples.";
      const fragmentName = folder + block.id;
      const token = ++this._token;
      const preview = this.byId("preview");
      preview.destroyItems();
      preview.toggleStyleClass("wsPreviewShell", !!block.shell);

      this.loadFragment({ id: this.createId("block" + token), name: fragmentName, addToDependents: false }).then(function (control) {
        const controls = Array.isArray(control) ? control : [control];
        if (token !== this._token) {
          controls.forEach(function (c) { c.destroy(); });
          return;
        }
        controls.forEach(function (c) {
          preview.addItem(c);
          this.styleCharts(c);
          if (block.shell) {
            this._addPagePlaceholder(c);
          }
        }, this);
      }.bind(this)).catch(function (error) {
        preview.addItem(new Text({ text: "Could not render: " + error.message }));
      });

      this._loadSource(fragmentName).then(function (code) {
        if (token === this._token) {
          this._detail.setProperty("/code", code);
          this._detail.setProperty("/codeHeight", Math.min(code.split("\n").length, 48) * 14 + 16 + "px");
        }
      }.bind(this));
    },

    onCopy: function () {
      this.copyText(this._detail.getProperty("/code"), "Copied! " + this._detail.getProperty("/target"));
    },

    /** Preview only: shows where the pages go inside an app shell (the copied code keeps an empty App). */
    _addPagePlaceholder: function (shell) {
      shell.findAggregatedObjects(true, function (c) { return c.isA("sap.m.App"); }).forEach(function (app) {
        app.addPage(new Page({ showHeader: false, content: [
          new MessageStrip({ text: "Your pages (Page1, Page2, Page3) appear here.", showIcon: true }).addStyleClass("sapUiSmallMargin")
        ] }));
      });
    },

    /** Reads the fragment file and strips the <core:FragmentDefinition> wrapper so it can be pasted into a view. */
    _loadSource: function (fragmentName) {
      const url = sap.ui.require.toUrl(fragmentName.replace(/\./g, "/")) + ".fragment.xml";
      return fetch(url).then(function (response) { return response.text(); }).then(function (text) {
        return text
          .replace(/<core:FragmentDefinition[\s\S]*?>\s*/, "")
          .replace(/\s*<\/core:FragmentDefinition>\s*$/, "")
          .trim() + "\n";
      });
    },

    // ---- The sample data dialog

    onShowSampleData: function () {
      this.getOwnerComponent().dataReady.then(function (data) {
        if (!this._sampleModel) {
          this._sample = data.sample;
          this._sampleModel = new JSONModel({
            keys: Object.keys(SAMPLE_INFO).map(function (key) { return { key: key, info: SAMPLE_INFO[key] }; }),
            key: "kpis", json: ""
          });
          this.getView().setModel(this._sampleModel, "sample");
          this._showSample("kpis");
        }
        this.byId("sampleDialog").open();
      }.bind(this));
    },

    onSampleKeyChange: function (event) {
      this._showSample(event.getParameter("selectedItem").getKey());
    },

    _showSample: function (key) {
      this._sampleModel.setProperty("/key", key);
      this._sampleModel.setProperty("/json", JSON.stringify(this._sample[key], null, 2));
    },

    onCloseSampleData: function () {
      this.byId("sampleDialog").close();
    }
  });
});
