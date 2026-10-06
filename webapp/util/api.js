sap.ui.define([], function () {
  "use strict";

  // The workshop "REST API" is a set of static JSON files under webapp/api/.
  // ui5 serve hosts them next to the app, so this is a normal HTTP GET (no CORS, no backend).
  const BASE = sap.ui.require.toUrl("workshop/dashboard/api");
  const ENDPOINTS = ["meta", "kpis", "trend", "breakdown", "items", "alerts"];

  function getJson(url) {
    return fetch(url).then(function (response) {
      if (!response.ok) {
        throw new Error("GET " + url + " failed: " + response.status);
      }
      return response.json();
    });
  }

  return {
    ENDPOINTS: ENDPOINTS,

    url: function (scenarioId, endpoint) {
      return BASE + "/" + scenarioId + "/" + endpoint + ".json";
    },

    get: function (scenarioId, endpoint) {
      return getJson(this.url(scenarioId, endpoint));
    },

    loadIndex: function () {
      return getJson(BASE + "/index.json");
    },

    /** Calls every endpoint of a scenario and returns { meta, kpis, trend, breakdown, items, alerts }. */
    loadScenario: function (scenarioId) {
      return Promise.all(ENDPOINTS.map(function (endpoint) {
        return this.get(scenarioId, endpoint);
      }.bind(this))).then(function (results) {
        const data = {};
        ENDPOINTS.forEach(function (endpoint, i) { data[endpoint] = results[i]; });
        return data;
      });
    },

    emptyScenario: function () {
      return { meta: { trend: {}, breakdown: {}, items: { columns: {} } }, kpis: [], trend: [], breakdown: [], items: [], alerts: [] };
    }
  };
});
