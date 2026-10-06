sap.ui.define([
  "sap/ui/core/format/DateFormat"
], function (DateFormat) {
  "use strict";

  const dateFormat = DateFormat.getDateInstance({ style: "medium" });

  // Use in XML as:  text="{ path: 'value', formatter: '.formatter.compactNumber' }"
  return {
    /** 18400000 -> "18.4M", 12480 -> "12.5K", 92.3 -> "92.3" */
    compactNumber: function (value) {
      if (value === undefined || value === null || value === "") {
        return "";
      }
      return new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(value);
    },

    /** 284000, "EUR" -> "€284,000" */
    currency: function (amount, currency) {
      if (amount === undefined || amount === null) {
        return "";
      }
      return new Intl.NumberFormat("en", { style: "currency", currency: currency || "EUR", maximumFractionDigits: 0 }).format(amount);
    },

    /** 92.3 -> "92.3%" */
    percent: function (value) {
      return value === undefined || value === null ? "" : value + "%";
    },

    /** 6.2 -> "+6.2%", -3.4 -> "-3.4%" */
    delta: function (deltaPercent) {
      if (deltaPercent === undefined || deltaPercent === null) {
        return "";
      }
      return (deltaPercent > 0 ? "+" : "") + deltaPercent + "%";
    },

    /** 16000000, "EUR" -> "Target 16M EUR" */
    target: function (target, unit) {
      if (target === undefined || target === null) {
        return "";
      }
      return "Target " + new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(target) + " " + (unit || "");
    },

    /** "2026-10-05" -> "Oct 5, 2026" */
    date: function (isoDate) {
      return isoDate ? dateFormat.format(new Date(isoDate)) : "";
    },

    /** "Up" -> trend-up icon */
    trendIcon: function (trend) {
      if (trend === "Up") {
        return "sap-icon://trend-up";
      }
      return trend === "Down" ? "sap-icon://trend-down" : "";
    },

    /** Alert type (Error/Warning/...) -> NotificationListItem priority */
    priority: function (type) {
      return { Error: "High", Warning: "Medium", Information: "Low", Success: "None" }[type] || "None";
    },

    /** KPI state (Good/Critical/Error/Neutral) -> text colour state (Success/Warning/Error/None) */
    valueState: function (state) {
      return { Good: "Success", Critical: "Warning", Error: "Error" }[state] || "None";
    },

    /** Item state (Error/Warning/Success/Information/None) -> chart colour (Error/Critical/Good/Neutral) */
    valueColor: function (state) {
      return { Error: "Error", Warning: "Critical", Critical: "Critical", Success: "Good", Good: "Good" }[state] || "Neutral";
    },

    /** progress 0-100 -> "35%" */
    progressText: function (progress) {
      return (progress || 0) + "%";
    }
  };
});
