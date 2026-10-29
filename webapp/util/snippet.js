sap.ui.define([], function () {
  "use strict";

  /**
   * Turns a SQL result into XML that students can paste into a page, bound to {/name}.
   * The Playground renders exactly this XML as its preview, so what you see is what you copy.
   *
   * Many rows (sql):  the FIRST column is the label of the chart (x axis); a second text column becomes the
   *                   colour (one series per value); every number column is plotted.
   * One row (sql.one): one big number per number column, bound to {/name/column}, or the whole record.
   */

  const NAMESPACES = "xmlns=\"sap.m\" xmlns:core=\"sap.ui.core\" xmlns:f=\"sap.f\" xmlns:card=\"sap.f.cards\" xmlns:layout=\"sap.ui.layout\" " +
    "xmlns:mc=\"sap.suite.ui.microchart\" xmlns:viz=\"sap.viz.ui5.controls\" xmlns:viz.data=\"sap.viz.ui5.data\" xmlns:viz.feeds=\"sap.viz.ui5.controls.common.feeds\"";
  const TIME = /^(week|date|month|day|year|period)$|_date$|_week$/i;
  const MAX_CHART_ROWS = 40;

  function isNumber(rows, f) {
    return rows.some(function (r) { return typeof r[f] === "number"; }) && rows.every(function (r) { return r[f] === null || r[f] === undefined || typeof r[f] === "number"; });
  }

  function title(field) {
    const text = field.replace(/_/g, " ");
    return text.charAt(0).toUpperCase() + text.slice(1);
  }

  function escape(text) {
    return String(text).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
  }

  /** What kind of result is it, and which views make sense? */
  function shape(result) {
    if (result === null || result === undefined) {
      return { kind: "empty", views: ["table"] };
    }
    if (!Array.isArray(result)) {
      const numbers = Object.keys(result).filter(function (f) { return typeof result[f] === "number"; });
      return { kind: "one", numbers: numbers, views: numbers.length ? ["number", "record"] : ["record"] };
    }
    if (!result.length) {
      return { kind: "empty", views: ["table"] };
    }
    const fields = Object.keys(result[0]);
    const label = fields[0];
    const series = fields[1] && !isNumber(result, fields[1]) ? fields[1] : null;
    const measures = fields.slice(series ? 2 : 1).filter(function (f) { return isNumber(result, f); });
    if (fields.length < 2 || !measures.length || result.length > MAX_CHART_ROWS) {
      return { kind: "rows", views: ["table"] };
    }
    const views = TIME.test(label) ? ["line", "column", "table"] : ["column", "bar", "line", "table"];
    if (!series && measures.length === 1 && !TIME.test(label) && result.length <= 8) {
      views.splice(views.length - 1, 0, "donut");
    }
    if (result.length > 15) {
      views.unshift(views.pop()); // a long list of rows reads better as a table first
    }
    return { kind: "chart", dimensions: series ? [label, series] : [label], measures: measures, views: views };
  }

  function chart(name, s, vizType) {
    let measures = s.measures, feeds;
    const dims = vizType === "donut" ? s.dimensions.slice(0, 1) : s.dimensions;
    if (vizType === "donut") {
      measures = measures.slice(0, 1);
      feeds = [["size", "Measure", measures], ["color", "Dimension", dims]];
    } else {
      feeds = [["valueAxis", "Measure", measures], ["categoryAxis", "Dimension", dims.slice(0, 1)]];
      if (dims[1]) {
        feeds.push(["color", "Dimension", dims.slice(1, 2)]);
      }
    }
    return [
      "<viz:VizFrame vizType=\"" + vizType + "\" width=\"100%\" height=\"20rem\" uiConfig=\"{applicationSet:'fiori'}\" selectData=\".onChartSelect\">",
      "  <viz:dataset>",
      "    <viz.data:FlattenedDataset data=\"{/" + name + "}\">",
      "      <viz.data:dimensions>",
      dims.map(function (d) { return "        <viz.data:DimensionDefinition name=\"" + title(d) + "\" value=\"{" + d + "}\" />"; }).join("\n"),
      "      </viz.data:dimensions>",
      "      <viz.data:measures>",
      measures.map(function (m) { return "        <viz.data:MeasureDefinition name=\"" + title(m) + "\" value=\"{" + m + "}\" />"; }).join("\n"),
      "      </viz.data:measures>",
      "    </viz.data:FlattenedDataset>",
      "  </viz:dataset>",
      "  <viz:feeds>",
      feeds.map(function (f) { return "    <viz.feeds:FeedItem uid=\"" + f[0] + "\" type=\"" + f[1] + "\" values=\"" + f[2].map(title).join(",") + "\" />"; }).join("\n"),
      "  </viz:feeds>",
      "</viz:VizFrame>"
    ].join("\n");
  }

  function table(name, rows) {
    const fields = rows.length ? Object.keys(rows[0]) : ["name"];
    return [
      "<ScrollContainer horizontal=\"true\" vertical=\"false\" width=\"100%\" class=\"wsResultTableScroll\">",
      "<Table items=\"{/" + name + "}\" growing=\"true\" growingThreshold=\"10\" fixedLayout=\"false\">",
      "  <columns>",
      fields.map(function (f) { return "    <Column" + (rows.length && isNumber(rows, f) ? " hAlign=\"End\"" : "") + "><Text text=\"" + escape(title(f)) + "\" wrapping=\"false\" /></Column>"; }).join("\n"),
      "  </columns>",
      "  <items>",
      "    <ColumnListItem>",
      "      <cells>",
      fields.map(function (f) {
        return "        " + (rows.length && isNumber(rows, f) ? "<ObjectNumber number=\"{" + f + "}\" />" : "<Text text=\"{" + f + "}\" wrapping=\"false\" />");
      }).join("\n"),
      "      </cells>",
      "    </ColumnListItem>",
      "  </items>",
      "</Table>",
      "</ScrollContainer>"
    ].join("\n");
  }

  function record(name, obj) {
    return [
      "<HBox wrap=\"Wrap\">",
      Object.keys(obj).slice(0, 10).map(function (f) {
        return "  <VBox class=\"sapUiMediumMarginEnd sapUiSmallMarginBottom\"><Label text=\"" + escape(title(f)) + "\" /><Text text=\"{/" + name + "/" + f + "}\" /></VBox>";
      }).join("\n"),
      "</HBox>"
    ].join("\n");
  }

  function numbers(name, s) {
    return [
      "<HBox wrap=\"Wrap\">",
      s.numbers.slice(0, 4).map(function (f) {
        return [
          "  <VBox class=\"sapUiLargeMarginEnd sapUiSmallMarginBottom\">",
          "    <Label text=\"" + escape(title(f)) + "\" />",
          "    <NumericContent value=\"{/" + name + "/" + f + "}\" valueColor=\"Neutral\" withMargin=\"false\" />",
          "  </VBox>"
        ].join("\n");
      }).join("\n"),
      "</HBox>"
    ].join("\n");
  }

  return {
    shape: shape,

    /** The text to paste into data.js: name: sql(`…`), or sql.one(`…`) for a single row. */
    dataJs: function (name, code, one) {
      const body = code.trim().split("\n").map(function (line) { return "        " + line; }).join("\n");
      return "      " + name + ": sql" + (one ? ".one" : "") + "(`\n" + body + "\n      `),";
    },

    /** XML for a result. view: one of shape(result).views (falls back to the first one). */
    build: function (name, result, view) {
      const s = shape(result);
      const v = s.views.indexOf(view) > -1 ? view : s.views[0];
      if (v === "number") {
        return numbers(name, s);
      }
      if (v === "record") {
        return record(name, result);
      }
      if (v === "table") {
        return table(name, Array.isArray(result) ? result : []);
      }
      return chart(name, s, v);
    },

    /** Wraps a snippet so it can be loaded with Fragment.load({ definition }). */
    fragment: function (xml) {
      return "<core:FragmentDefinition " + NAMESPACES + ">\n" + xml + "\n</core:FragmentDefinition>";
    }
  };
});
