sap.ui.define([], function () {
  "use strict";

  /**
   * Turns a query result into XML that students can paste into a page, bound to {/name}.
   * The Playground renders exactly this XML as its preview, so what you see is what you copy.
   */

  const NAMESPACES = "xmlns=\"sap.m\" xmlns:core=\"sap.ui.core\" xmlns:f=\"sap.f\" xmlns:card=\"sap.f.cards\" xmlns:layout=\"sap.ui.layout\" " +
    "xmlns:mc=\"sap.suite.ui.microchart\" xmlns:viz=\"sap.viz.ui5.controls\" xmlns:viz.data=\"sap.viz.ui5.data\" xmlns:viz.feeds=\"sap.viz.ui5.controls.common.feeds\"";
  const HELPER_FIELDS = ["count", "share", "deltaPercent", "period"];

  function fieldsOf(rows) {
    const set = {};
    rows.slice(0, 20).forEach(function (r) { Object.keys(r).forEach(function (k) { set[k] = true; }); });
    return Object.keys(set);
  }

  function isNumber(rows, f) {
    return rows.some(function (r) { return typeof r[f] === "number"; }) && rows.every(function (r) { return r[f] === null || r[f] === undefined || typeof r[f] === "number"; });
  }

  function isPlain(rows, f) {
    return rows.every(function (r) { return r[f] === null || r[f] === undefined || typeof r[f] !== "object"; });
  }

  function title(field) {
    return field.charAt(0).toUpperCase() + field.slice(1);
  }

  function escape(text) {
    return String(text).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
  }

  /** What kind of result is it, and which views make sense? */
  function shape(result) {
    if (result === null || result === undefined || typeof result !== "object") {
      return { kind: "scalar", views: ["number"] };
    }
    if (!Array.isArray(result)) {
      return { kind: "object", views: ["object"] };
    }
    if (!result.length) {
      return { kind: "empty", views: ["table"] };
    }
    const fields = fieldsOf(result);
    const plain = fields.filter(function (f) { return isPlain(result, f); });
    const measures = plain.filter(function (f) { return isNumber(result, f) && HELPER_FIELDS.indexOf(f) === -1; });
    if (fields.indexOf("month") > -1 && measures.length) {
      const series = plain.filter(function (f) { return !isNumber(result, f) && ["month", "period", "name", "state", "valueState"].indexOf(f) === -1; });
      return { kind: "time", dimensions: ["month"].concat(series.slice(0, 1)), measures: measures, views: ["line", "column", "table"] };
    }
    if (fields.indexOf("name") > -1 && measures.length) {
      const views = ["bar", "column", "donut", "table"];
      if (measures.indexOf("value") > -1 && measures.indexOf("target") > -1) {
        views.splice(1, 0, "bullet");
      }
      return { kind: "category", dimensions: ["name"], measures: measures, views: views };
    }
    return { kind: "rows", views: ["table"] };
  }

  function chart(name, s, vizType) {
    let measures = s.measures, feeds;
    if (vizType === "donut") {
      measures = measures.slice(0, 1);
      feeds = [["size", "Measure", measures], ["color", "Dimension", s.dimensions.slice(0, 1)]];
    } else if (vizType === "bullet") {
      measures = ["value", "target"];
      feeds = [["actualValues", "Measure", ["value"]], ["targetValues", "Measure", ["target"]], ["categoryAxis", "Dimension", s.dimensions.slice(0, 1)]];
    } else {
      feeds = [["valueAxis", "Measure", measures], ["categoryAxis", "Dimension", s.dimensions.slice(0, 1)]];
      if (s.dimensions[1]) {
        feeds.push(["color", "Dimension", s.dimensions.slice(1, 2)]);
      }
    }
    const dims = vizType === "donut" || vizType === "bullet" ? s.dimensions.slice(0, 1) : s.dimensions;
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

  function cell(rows, f) {
    if (f === "state") {
      return "<ObjectStatus text=\"{" + f + "}\" state=\"{ path: 'state', formatter: '.formatter.valueState' }\" />";
    }
    if (f === "valueState") {
      return "<ObjectStatus text=\"{" + f + "}\" state=\"{" + f + "}\" />";
    }
    if (isNumber(rows, f)) {
      return "<ObjectNumber number=\"{ path: '" + f + "', formatter: '.formatter.compactNumber' }\" />";
    }
    return "<Text text=\"{" + f + "}\" />";
  }

  function table(name, rows) {
    const fields = rows.length ? fieldsOf(rows).filter(function (f) { return isPlain(rows, f) && f !== "period"; }).slice(0, 6) : ["name"];
    return [
      "<Table items=\"{/" + name + "}\" growing=\"true\" growingThreshold=\"10\" autoPopinMode=\"true\">",
      "  <columns>",
      fields.map(function (f) { return "    <Column" + (isNumber(rows, f) ? " hAlign=\"End\"" : "") + "><Text text=\"" + escape(title(f)) + "\" /></Column>"; }).join("\n"),
      "  </columns>",
      "  <items>",
      "    <ColumnListItem>",
      "      <cells>",
      fields.map(function (f) { return "        " + cell(rows, f); }).join("\n"),
      "      </cells>",
      "    </ColumnListItem>",
      "  </items>",
      "</Table>"
    ].join("\n");
  }

  function object(name, obj) {
    const fields = Object.keys(obj).filter(function (f) { return obj[f] === null || typeof obj[f] !== "object"; }).slice(0, 8);
    return [
      "<HBox wrap=\"Wrap\" binding=\"{/" + name + "}\">",
      fields.map(function (f) {
        return "  <VBox class=\"sapUiMediumMarginEnd sapUiSmallMarginBottom\"><Label text=\"" + escape(f) + "\" /><Text text=\"{" + f + "}\" /></VBox>";
      }).join("\n"),
      "</HBox>"
    ].join("\n");
  }

  function number(name) {
    return "<NumericContent value=\"{ path: '/" + name + "', formatter: '.formatter.compactNumber' }\" formatterValue=\"true\" withMargin=\"false\" />";
  }

  return {
    shape: shape,

    /** XML for a result. view: one of shape(result).views, or "auto" for the first one. */
    build: function (name, result, view) {
      const s = shape(result);
      const v = s.views.indexOf(view) > -1 ? view : s.views[0];
      if (v === "number") {
        return number(name);
      }
      if (v === "object") {
        return object(name, result);
      }
      if (v === "table") {
        return table(name, result);
      }
      return chart(name, s, v);
    },

    /** Wraps a snippet so it can be loaded with Fragment.load({ definition }). */
    fragment: function (xml) {
      return "<core:FragmentDefinition " + NAMESPACES + ">\n" + xml + "\n</core:FragmentDefinition>";
    }
  };
});
