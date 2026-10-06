sap.ui.define([
  "./BaseController",
  "sap/ui/model/json/JSONModel",
  "sap/m/MessageToast",
  "sap/m/VBox",
  "sap/m/HBox",
  "sap/m/Title",
  "sap/m/Text",
  "sap/m/Button",
  "sap/m/Link",
  "sap/m/Label",
  "sap/m/OverflowToolbar",
  "sap/m/ToolbarSpacer",
  "sap/m/ObjectStatus",
  "sap/f/Card",
  "sap/f/cards/Header"
], function (BaseController, JSONModel, MessageToast, VBox, HBox, Title, Text, Button, Link, Label,
  OverflowToolbar, ToolbarSpacer, ObjectStatus, Card, CardHeader) {
  "use strict";

  const DOCS = "https://ui5.sap.com/#/api/";

  return BaseController.extend("workshop.dashboard.controller.Gallery", {
    onInit: function () {
      this._built = {};
      this._catalog = new JSONModel(sap.ui.require.toUrl("workshop/dashboard/gallery/samples.json"));
      this.getView().setModel(this._catalog, "gallery");
      this._catalogReady = this._catalog.dataLoaded();

      this.getRouter().getRoute("gallery").attachPatternMatched(function (event) {
        const category = event.getParameter("arguments").category || "layout";
        this._catalogReady.then(this._showCategory.bind(this, category));
      }, this);
    },

    onCategorySelect: function (event) {
      this.navTo("gallery", { category: event.getParameter("key") });
    },

    _showCategory: function (key) {
      const categories = this._catalog.getProperty("/categories");
      const category = categories.find(function (c) { return c.key === key; }) || categories[0];
      this.byId("categoryTabs").setSelectedKey(category.key);
      this.byId("categoryIntro").setText(category.intro);

      const container = this.byId("sampleContainer");
      container.getItems().forEach(function (item) { item.setVisible(false); });
      if (!this._built[category.key]) {
        const box = new VBox({ width: "100%" });
        category.samples.forEach(function (sample) {
          box.addItem(this._createSampleCard(sample));
        }, this);
        container.addItem(box);
        this._built[category.key] = box;
      }
      this._built[category.key].setVisible(true);
    },

    /** One gallery entry: live preview, copy button, code, data + docs info. */
    _createSampleCard: function (sample) {
      const fragmentName = (sample.template ? "workshop.dashboard.templates." : "workshop.dashboard.gallery.samples.") + sample.id;
      const preview = new VBox({ renderType: "Bare" }).addStyleClass("wsPreview");
      const codeBox = new VBox({ visible: !sample.template, renderType: "Bare" }).addStyleClass("wsCode");
      const state = { code: "" };

      const docsBox = new HBox({ wrap: "Wrap", alignItems: "Center" });
      docsBox.addItem(new Label({ text: "Docs:" }).addStyleClass("sapUiTinyMarginEnd"));
      sample.controls.forEach(function (name) {
        docsBox.addItem(new Link({ text: name.split(".").pop(), href: DOCS + name, target: "_blank" }).addStyleClass("sapUiSmallMarginEnd"));
      });

      const toolbar = new OverflowToolbar({
        style: "Clear",
        content: [
          new ObjectStatus({ title: "Data" }).setText(sample.data).applySettings({ icon: "sap-icon://database", state: "Information" }),
          new ToolbarSpacer(),
          new Button({
            text: sample.template ? "Show code" : "Hide code",
            type: "Transparent",
            icon: "sap-icon://source-code",
            press: function (event) {
              codeBox.setVisible(!codeBox.getVisible());
              event.getSource().setText(codeBox.getVisible() ? "Hide code" : "Show code");
            }
          }),
          new Button({
            text: "Copy XML",
            type: "Emphasized",
            icon: "sap-icon://copy",
            press: function () { this._copy(state.code); }.bind(this)
          })
        ]
      });

      const card = new Card({
        width: "100%",
        // Texts are set via setters so that "{...}" in them is not parsed as data binding.
        header: new CardHeader().setTitle(sample.title).setSubtitle(sample.description),
        content: new VBox({ width: "100%", items: [preview, toolbar, codeBox, docsBox.addStyleClass("wsDocs")] })
      }).addStyleClass("wsSampleCard");

      this.loadFragment({ id: this.createId(sample.id), name: fragmentName, addToDependents: false }).then(function (control) {
        const controls = Array.isArray(control) ? control : [control];
        controls.forEach(function (c) {
          preview.addItem(c);
          this.styleCharts(c);
        }, this);
      }.bind(this)).catch(function (error) {
        preview.addItem(new Text({ text: "Could not render: " + error.message }));
      });

      this._loadSource(fragmentName).then(function (code) {
        state.code = code;
        return this._createCodeView(code);
      }.bind(this)).then(function (codeView) {
        codeBox.addItem(codeView);
      });

      return card;
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

    _createCodeView: function (code) {
      return new Promise(function (resolve) {
        sap.ui.require(["sap/ui/codeeditor/CodeEditor"], function (CodeEditor) {
          const lines = code.split("\n").length;
          // value is set via setValue(): passing it to the constructor would parse {...} as data binding.
          resolve(new CodeEditor({
            type: "xml",
            editable: false,
            lineNumbers: true,
            syntaxHints: false,
            width: "100%",
            height: Math.min(lines, 40) * 14 + 16 + "px"
          }).setValue(code));
        });
      });
    },

    _copy: function (text) {
      const done = function () {
        MessageToast.show("Copied! Paste it into webapp/view/Dashboard.view.xml between the 🧩 markers.");
      };
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(text).then(done);
        return;
      }
      const area = document.createElement("textarea");
      area.value = text;
      document.body.appendChild(area);
      area.select();
      document.execCommand("copy");
      document.body.removeChild(area);
      done();
    }
  });
});
